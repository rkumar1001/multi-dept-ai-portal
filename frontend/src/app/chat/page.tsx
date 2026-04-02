"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { ChatMessage, Conversation, DEPARTMENT_CONFIG, DEPARTMENT_PROMPTS } from "@/types";

/* ── Tool Result Renderer ─────────────────────────────────────────────── */

function ToolResultCard({ tc }: { tc: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const toolName = (tc.tool as string) || "unknown";
  const output = tc.output as Record<string, unknown> | undefined;
  const results = (output?.results as Record<string, unknown>[]) || [];

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
      >
        <span>🔧 {toolName}{results.length > 0 ? ` — ${results.length} result${results.length > 1 ? "s" : ""}` : ""}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && output && (
        <div className="border-t border-gray-200 px-3 py-2">
          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {Object.keys(results[0]).map((key) => (
                      <th key={key} className="px-2 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, ri) => (
                    <tr key={ri} className="border-b border-gray-100 last:border-0">
                      {Object.values(row).map((val, ci) => (
                        <td key={ci} className="px-2 py-1.5 text-gray-700">
                          {typeof val === "number" ? val.toLocaleString() : String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Message Actions ──────────────────────────────────────────────────── */

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        title="Copy"
      >
        {copied ? <span className="text-green-500 text-xs">✓</span> : <span className="text-xs">📋</span>}
      </button>
      <button
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        className={`rounded p-1 transition text-xs ${feedback === "up" ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
        title="Helpful"
      >
        👍
      </button>
      <button
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        className={`rounded p-1 transition text-xs ${feedback === "down" ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
        title="Not helpful"
      >
        👎
      </button>
    </div>
  );
}

/* ── Main Chat Page ───────────────────────────────────────────────────── */

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setDepartment(localStorage.getItem("department") || "");
    setFullName(localStorage.getItem("fullName") || "");
    setRole(localStorage.getItem("role") || "");
    loadConversations();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await api.listConversations();
      setConversations(data);
    } catch {
      // ignore
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const data = await api.getConversation(id);
      setConversationId(id);
      setMessages(
        data.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          tool_calls: m.tool_calls,
        }))
      );
    } catch {
      // ignore
    }
  };

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;
    if (!overrideMessage) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await api.sendMessage(msg, conversationId || undefined);
      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.message, tool_calls: res.tool_calls },
      ]);
      loadConversations();
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId]);

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const deptConfig = DEPARTMENT_CONFIG[department] || {
    label: "Unknown",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    icon: "🤖",
  };

  const quickPrompts = DEPARTMENT_PROMPTS[department] || [];

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="flex w-72 flex-col border-r border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{deptConfig.icon}</span>
              <div>
                <h2 className={`font-semibold ${deptConfig.color}`}>{deptConfig.label} Agent</h2>
                <p className="text-xs text-gray-500">{fullName}</p>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <button
              onClick={handleNewChat}
              className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + New Chat
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3">
            <p className="mb-2 px-1 text-xs font-medium uppercase text-gray-400">
              History {filteredConversations.length > 0 && `(${filteredConversations.length})`}
            </p>
            {filteredConversations.length === 0 && (
              <p className="px-1 text-xs text-gray-400 italic">
                {searchQuery ? "No matches" : "No conversations yet"}
              </p>
            )}
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`mb-1 w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                  conversationId === conv.id
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {conv.title || "Untitled"}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 p-3 space-y-2">
            {role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Admin Dashboard
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full rounded-lg py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            ☰
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {deptConfig.icon} {deptConfig.label} AI Agent
          </h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${deptConfig.bgColor} ${deptConfig.color}`}>
            {department}
          </span>
          <div className="ml-auto">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              🏠 Home
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-5xl mb-4">{deptConfig.icon}</span>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Welcome to the {deptConfig.label} AI Agent
              </h2>
              <p className="text-gray-500 max-w-md mb-8">
                Ask me anything about{" "}
                {department === "sales"
                  ? "leads, pipeline, forecasting, and CRM insights"
                  : department === "finance"
                  ? "financial modeling, cash flow, risk analysis, and compliance"
                  : department === "accounting"
                  ? "invoices, reconciliation, expense categorization, and tax calculations"
                  : department === "logistics"
                  ? "fleet tracking, vehicle locations, speeding alerts, and GPS monitoring"
                  : "menu planning, inventory, reservations, and food cost analysis"}
                .
              </p>

              {/* Quick Action Prompts */}
              {quickPrompts.length > 0 && (
                <div className="w-full max-w-2xl">
                  <p className="text-xs font-medium uppercase text-gray-400 mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-3">
                    {quickPrompts.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(qp.prompt)}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition group"
                      >
                        <span className="text-lg flex-shrink-0">{qp.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{qp.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{qp.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-table:my-2 prose-pre:bg-gray-900 prose-pre:text-gray-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}

                  {/* Rich tool call cards */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="space-y-1">
                      {msg.tool_calls.map((tc, ti) => (
                        <ToolResultCard key={ti} tc={tc} />
                      ))}
                    </div>
                  )}

                  {/* Message actions for assistant messages */}
                  {msg.role === "assistant" && <MessageActions content={msg.content} />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-gray-400 text-xs">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Ask your ${deptConfig.label} AI agent...`}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
