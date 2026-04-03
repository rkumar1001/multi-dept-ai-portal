"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { api } from "@/lib/api";
import { ChatMessage, Conversation } from "@/types";
import { DEPARTMENT_CONFIG, DEPARTMENT_PROMPTS } from "@/departments";
import { DashboardMessage, MessageActions } from "@/components/chat";

/* ── Integration config ───────────────────────────────────────────────── */
interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  active: boolean;
  department: string;
  connected: boolean;
  color: string;
}

function getIntegrations(userDept: string): Integration[] {
  const all: Integration[] = [
    {
      id: "fleethunt",
      name: "FleetHunt",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
      active: false,
      department: "logistics",
      connected: true, // actually integrated
      color: "#557C93",
    },
    {
      id: "samsara",
      name: "Samsara",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
      active: false,
      department: "logistics",
      connected: false,
      color: "#14b8a6",
    },
    {
      id: "restaurant-pos",
      name: "Restaurant POS",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" /></svg>,
      active: false,
      department: "restaurant",
      connected: true,
      color: "#f97316",
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
      active: false,
      department: "finance",
      connected: false,
      color: "#22c55e",
    },
    {
      id: "highway",
      name: "Highway",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
      active: false,
      department: "logistics",
      connected: false,
      color: "#6366f1",
    },
    {
      id: "triumph",
      name: "Triumph Pay",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
      active: false,
      department: "finance",
      connected: false,
      color: "#8b5cf6",
    },
  ];

  // Only show integrations for this user's department
  return all
    .filter((integ) => integ.department === userDept)
    .map((integ) => ({
      ...integ,
      active: integ.connected,
    }));
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [greeting, setGreeting] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const dept = localStorage.getItem("department") || "";
    setDepartment(dept);
    setFullName(localStorage.getItem("fullName") || "");
    setRole(localStorage.getItem("role") || "");
    setIntegrations(getIntegrations(dept));
    loadConversations();
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening");
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

  const toggleSpeech = useCallback(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }, [isListening]);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      recognitionRef.current = null;
    }
    if (!overrideMessage) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.sendMessage(msg, conversationId || undefined, controller.signal);
      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.message, tool_calls: res.tool_calls },
      ]);
      loadConversations();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — no error message needed
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}` },
        ]);
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [input, loading, conversationId]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
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

  const activeIntegrations = integrations.filter((i) => i.active);
  const lockedIntegrations = integrations.filter((i) => !i.active);



  return (
    <div className="flex h-screen bg-[#f8f9fc]">
      {/* ── Left Sidebar — Integrations + History ────────────────── */}
      {sidebarOpen && (
        <aside className="flex w-[280px] flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-sm">
          {/* Logo + User */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 172 172" fill="none">
                  <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-navy truncate">VRTek AI</p>
                <p className="text-xs text-gray-400 truncate">{fullName}</p>
              </div>
            </div>
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-teal/5 hover:border-brand-teal/30 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Integrations */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Integrations</p>

            {/* Active */}
            {activeIntegrations.map((integ) => (
              <div
                key={integ.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1 bg-brand-teal/5 border border-brand-teal/10"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: integ.color }}>
                  {integ.icon}
                </div>
                <span className="text-sm font-medium text-brand-navy flex-1">{integ.name}</span>
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
            ))}

            {/* Locked */}
            {lockedIntegrations.map((integ) => (
              <div
                key={integ.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1 opacity-40 cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                  {integ.icon}
                </div>
                <span className="text-sm text-gray-400 flex-1">{integ.name}</span>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            ))}
          </div>

          {/* Search + History */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">History</p>
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-xs text-gray-600 placeholder-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal/20 transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3">
            {filteredConversations.length === 0 && (
              <p className="px-1 text-xs text-gray-400 italic py-2">
                {searchQuery ? "No matches" : "No conversations yet"}
              </p>
            )}
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`mb-0.5 w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                  conversationId === conv.id
                    ? "bg-brand-teal/10 font-medium text-brand-navy"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {conv.title || "Untitled"}
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="border-t border-gray-100 p-3 space-y-1">
            {role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                Admin Dashboard
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* ── Main Chat Area ────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm px-5 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${deptConfig.bgColor} flex items-center justify-center text-lg`}>
              {deptConfig.icon}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-brand-navy">{deptConfig.label} AI Agent</h1>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </span>
            <Link
              href="/"
              className="rounded-lg p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition"
              title="Home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </Link>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              {/* Welcome */}
              <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-white text-2xl mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-brand-navy mb-2">
                {greeting}, {fullName.split(" ")[0] || "there"}
              </h2>
              <p className="text-gray-400 mb-1">What&apos;s on <span className="text-brand-teal font-medium">your mind?</span></p>
              <p className="text-gray-400 text-sm max-w-md mb-10">
                Ask anything about your {deptConfig.label.toLowerCase()} operations
              </p>

              {/* Quick Action Prompts */}
              {quickPrompts.length > 0 && (
                <div className="w-full max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Get started with an example below
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                    {quickPrompts.slice(0, 10).map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(qp.prompt)}
                        className="flex items-start gap-3 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-4 text-left hover:shadow-lg hover:shadow-brand-navy/5 hover:-translate-y-0.5 hover:border-brand-teal/20 transition-all duration-300 group"
                      >
                        <span className="text-lg flex-shrink-0 mt-0.5">{qp.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-brand-navy group-hover:text-brand-teal transition-colors">{qp.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{qp.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mx-auto max-w-4xl space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-3 ${msg.role === "user" ? "max-w-[70%] flex-row-reverse" : "max-w-[90%]"}`}>
                  {/* Avatar */}
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 172 172" fill="none">
                        <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <span className="text-xs text-white font-bold">{(fullName || "U")[0].toUpperCase()}</span>
                    </div>
                  )}

                  <div
                    className={`group text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-tr-md bg-brand-gradient text-white px-4 py-3 shadow-md shadow-brand-navy/10"
                        : "space-y-0"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      msg.tool_calls && msg.tool_calls.length > 0 ? (
                        <DashboardMessage content={msg.content} toolCalls={msg.tool_calls} department={department} onFollowUp={handleSend} />
                      ) : (
                        <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200/60 shadow-sm px-5 py-4 overflow-hidden">
                          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-headings:my-2 prose-headings:text-brand-navy prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-brand-navy prose-table:my-0 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-code:text-brand-teal prose-code:bg-brand-teal/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-brand-teal prose-a:no-underline hover:prose-a:underline">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ children, ...props }) => (
                                  <div className="my-3 overflow-x-auto rounded-xl border border-gray-200/80 shadow-sm">
                                    <table className="w-full text-xs" {...props}>{children}</table>
                                  </div>
                                ),
                                thead: ({ children, ...props }) => (
                                  <thead className="bg-gradient-to-r from-brand-navy to-brand-teal text-white" {...props}>{children}</thead>
                                ),
                                th: ({ children, ...props }) => (
                                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" {...props}>{children}</th>
                                ),
                                td: ({ children, ...props }) => (
                                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap border-b border-gray-100" {...props}>{children}</td>
                                ),
                                tr: ({ children, ...props }) => (
                                  <tr className="hover:bg-brand-teal/[0.03] transition-colors" {...props}>{children}</tr>
                                ),
                                h1: ({ children, ...props }) => (
                                  <h1 className="text-lg font-bold text-brand-navy flex items-center gap-2" {...props}>
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children, ...props }) => (
                                  <h2 className="text-base font-bold text-brand-navy flex items-center gap-2 mt-4 mb-2" {...props}>
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children, ...props }) => (
                                  <h3 className="text-sm font-bold text-brand-navy mt-3 mb-1" {...props}>
                                    {children}
                                  </h3>
                                ),
                                ul: ({ children, ...props }) => (
                                  <ul className="space-y-1 my-2" {...props}>{children}</ul>
                                ),
                                li: ({ children, ...props }) => (
                                  <li className="text-gray-700 leading-relaxed" {...props}>{children}</li>
                                ),
                                blockquote: ({ children, ...props }) => (
                                  <blockquote className="border-l-3 border-brand-teal bg-brand-teal/5 rounded-r-lg px-4 py-2 my-2 text-gray-600 italic" {...props}>{children}</blockquote>
                                ),
                                hr: () => (
                                  <hr className="my-3 border-gray-200/60" />
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                          <MessageActions content={msg.content} />
                        </div>
                      )
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 172 172" fill="none">
                      <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200/60 px-5 py-4 text-sm shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                      <span className="text-gray-400 text-xs">Analyzing your request...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200/60 bg-white/80 backdrop-blur-sm px-5 py-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus-within:border-brand-teal/40 focus-within:shadow-lg focus-within:shadow-brand-navy/5 transition-all">
              {/* Sparkle icon */}
              <svg className="w-5 h-5 text-brand-teal/60 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12" />
              </svg>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !loading && handleSend()}
                placeholder={isListening ? "Listening... speak now" : "Ask AI a question or make a request..."}
                className={`flex-1 bg-transparent py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none ${
                  isListening ? "text-red-600" : ""
                }`}
              />
              {/* Mic button */}
              <button
                onClick={toggleSpeech}
                className={`rounded-lg p-2 transition-all ${
                  isListening
                    ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                    : "text-gray-400 hover:text-brand-teal hover:bg-brand-teal/5"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </button>
              {/* Send / Stop button */}
              {loading ? (
                <button
                  onClick={handleStop}
                  className="rounded-xl bg-red-500 p-2.5 text-white shadow-md shadow-red-500/20 hover:bg-red-600 hover:shadow-lg transition-all"
                  title="Stop generating"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="rounded-xl bg-brand-gradient p-2.5 text-white shadow-md shadow-brand-navy/20 hover:shadow-lg disabled:opacity-40 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-2">
              VRTek AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
