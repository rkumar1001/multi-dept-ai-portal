const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; department: string; role: string; full_name: string }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  register: (data: { email: string; password: string; full_name: string; department: string; role?: string }) =>
    apiFetch<{ access_token: string; department: string; role: string; full_name: string }>(
      "/api/v1/auth/register",
      { method: "POST", body: JSON.stringify(data) }
    ),

  logout: () =>
    apiFetch<void>("/api/v1/auth/logout", { method: "POST" }),

  // Chat
  sendMessage: (message: string, conversation_id?: string, signal?: AbortSignal) =>
    apiFetch<{ conversation_id: string; message: string; tool_calls?: Record<string, unknown>[] }>(
      "/api/v1/chat",
      { method: "POST", body: JSON.stringify({ message, conversation_id }) },
      signal
    ),

  /**
   * Stream a chat response via Server-Sent Events.
   * Calls the provided callbacks as events arrive:
   *   onConversationId — fired immediately with the conversation ID
   *   onChunk          — fired for every streamed text chunk
   *   onToolStatus     — fired when a tool is being executed
   *   onDone           — fired when streaming completes (with full metadata)
   *   onError          — fired if the server reports an error
   */
  streamMessage: async (
    message: string,
    conversation_id: string | undefined,
    callbacks: {
      onConversationId?: (id: string) => void;
      onChunk: (text: string) => void;
      onToolStatus: (tool: string) => void;
      onDone: (data: { conversation_id: string; tool_calls?: Record<string, unknown>[] }) => void;
      onError: (error: string) => void;
    },
    signal?: AbortSignal
  ): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/v1/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, conversation_id }),
      signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail || `API error: ${res.status}`);
    }

    if (!res.body) throw new Error("Response body is null");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // sse-starlette 2.x+ uses \r\n line endings → separator is \r\n\r\n
    // Also handle legacy \n\n just in case
    const SSE_SEP = /\r?\n\r?\n/;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on blank lines (handles both \r\n\r\n and \n\n)
        const parts = buffer.split(SSE_SEP);
        // Keep the last incomplete chunk in the buffer
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          // Split lines — handle \r\n and \n
          for (const rawLine of part.split(/\r?\n/)) {
            const line = rawLine.trimEnd(); // remove trailing \r if any
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>;

            if (eventType === "conv_id") {
              callbacks.onConversationId?.(data.conversation_id as string);
            } else if (eventType === "message") {
              callbacks.onChunk((data.content as string) ?? "");
            } else if (eventType === "tool_status") {
              callbacks.onToolStatus((data.tool as string) ?? "");
            } else if (eventType === "done") {
              callbacks.onDone({
                conversation_id: data.conversation_id as string,
                tool_calls: data.tool_calls as Record<string, unknown>[] | undefined,
              });
            } else if (eventType === "error") {
              callbacks.onError((data.message as string) ?? "Unknown error");
            }
          } catch {
            // ignore malformed JSON in individual events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Conversations
  listConversations: () =>
    apiFetch<{ id: string; title: string | null; department: string; created_at: string; updated_at: string }[]>(
      "/api/v1/conversations"
    ),

  getConversation: (id: string) =>
    apiFetch<{
      id: string;
      title: string | null;
      department: string;
      messages: { id: string; role: string; content: string; tool_calls?: Record<string, unknown>[]; created_at: string }[];
      created_at: string;
    }>(`/api/v1/conversations/${id}`),

  // Admin
  getUsage: (days = 30) =>
    apiFetch<{ usage: { department: string; total_input_tokens: number; total_output_tokens: number; total_tool_calls: number; total_requests: number }[]; period_start: string; period_end: string }>(
      `/api/v1/admin/usage?days=${days}`
    ),

  getDepartmentConfig: (dept: string) =>
    apiFetch<{ department: string; monthly_token_limit: number; current_token_usage: number; usage_pct: number }>(
      `/api/v1/admin/config/${dept}`
    ),

  getInsights: () =>
    apiFetch<{ departments: { department: string; kpis: { label: string; value: string; trend: string; trend_direction: "up" | "down" | "flat" }[] }[] }>(
      "/api/v1/admin/insights"
    ),

  // Email
  getEmailStatus: (department: string) =>
    apiFetch<{ department: string; provider: string; email_address: string; is_active: boolean; connected_at: string }>(
      `/api/v1/email/status/${department}`
    ),

  getAllEmailStatus: () =>
    apiFetch<{ department: string; provider: string; email_address: string; is_active: boolean; connected_at: string }[]>(
      "/api/v1/email/status"
    ),

  connectDepartmentEmail: (department: string, provider: string) =>
    apiFetch<{ auth_url: string }>(
      `/api/v1/email/connect/${department}/${provider}`
    ),

  disconnectDepartmentEmail: (department: string) =>
    apiFetch<{ status: string; department: string }>(
      `/api/v1/email/disconnect/${department}`,
      { method: "DELETE" }
    ),

  // Slack
  getSlackStatus: (department: string) =>
    apiFetch<{ department: string; team_name: string; team_id: string; is_active: boolean; connected_at: string }>(
      `/api/v1/slack/status/${department}`
    ),

  getAllSlackStatus: () =>
    apiFetch<{ department: string; team_name: string; team_id: string; is_active: boolean; connected_at: string }[]>(
      "/api/v1/slack/status"
    ),

  connectDepartmentSlack: (department: string) =>
    apiFetch<{ auth_url: string }>(
      `/api/v1/slack/connect/${department}`
    ),

  disconnectDepartmentSlack: (department: string) =>
    apiFetch<{ status: string; department: string }>(
      `/api/v1/slack/disconnect/${department}`,
      { method: "DELETE" }
    ),

  // QuickBooks
  getQuickBooksStatus: (department: string) =>
    apiFetch<{ department: string; realm_id: string; company_name: string | null; is_active: boolean; connected_at: string }>(
      `/api/v1/quickbooks/status/${department}`
    ),

  getAllQuickBooksStatus: () =>
    apiFetch<{ department: string; realm_id: string; company_name: string | null; is_active: boolean; connected_at: string }[]>(
      "/api/v1/quickbooks/status"
    ),

  connectDepartmentQuickBooks: (department: string) =>
    apiFetch<{ auth_url: string }>(
      `/api/v1/quickbooks/connect/${department}`
    ),

  disconnectDepartmentQuickBooks: (department: string) =>
    apiFetch<{ status: string; department: string }>(
      `/api/v1/quickbooks/disconnect/${department}`,
      { method: "DELETE" }
    ),
};
