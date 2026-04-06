const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  logout: async () => {
    try {
      await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors — clear local state regardless
    }
  },

  // Chat
  sendMessage: (message: string, conversation_id?: string, signal?: AbortSignal) =>
    apiFetch<{ conversation_id: string; message: string; tool_calls?: Record<string, unknown>[] }>(
      "/api/v1/chat",
      { method: "POST", body: JSON.stringify({ message, conversation_id }) },
      signal
    ),

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
};
