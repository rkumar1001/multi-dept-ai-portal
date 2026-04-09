"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { DEPARTMENT_CONFIG } from "@/departments";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface UsageItem {
  department: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tool_calls: number;
  total_requests: number;
}

interface InsightsData {
  department: string;
  kpis: { label: string; value: string; trend: string; trend_direction: "up" | "down" | "flat" }[];
}

const DEPT_COLORS: Record<string, string> = {
  sales: "#3b82f6",
  finance: "#22c55e",
  accounting: "#a855f7",
  restaurant: "#f97316",
  logistics: "#14b8a6",
};

const COST_PER_1K_INPUT = 0.003;
const COST_PER_1K_OUTPUT = 0.015;

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [insights, setInsights] = useState<InsightsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePeriod, setActivePeriod] = useState(30);
  const [emailStatus, setEmailStatus] = useState<Record<string, { provider: string; email_address: string; is_active: boolean }>>({});
  const [slackStatus, setSlackStatus] = useState<Record<string, { team_name: string; team_id: string; is_active: boolean }>>({});

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.push("/chat");
      return;
    }
    loadData(30);
    loadEmailStatus();
    loadSlackStatus();
    // Handle OAuth callback redirect
    const emailConnected = searchParams.get("email_connected");
    const slackConnected = searchParams.get("slack_connected");
    if (emailConnected) {
      loadEmailStatus();
      window.history.replaceState({}, "", "/admin");
    }
    if (slackConnected) {
      loadSlackStatus();
      window.history.replaceState({}, "", "/admin");
    }
  }, [router, searchParams]);

  const loadEmailStatus = async () => {
    try {
      const statuses = await api.getAllEmailStatus();
      const map: Record<string, { provider: string; email_address: string; is_active: boolean }> = {};
      for (const s of statuses) {
        map[s.department] = { provider: s.provider, email_address: s.email_address, is_active: s.is_active };
      }
      setEmailStatus(map);
    } catch {
      // ignore — user may not be admin or endpoint may fail
    }
  };

  const loadSlackStatus = async () => {
    try {
      const statuses = await api.getAllSlackStatus();
      const map: Record<string, { team_name: string; team_id: string; is_active: boolean }> = {};
      for (const s of statuses) {
        map[s.department] = { team_name: s.team_name, team_id: s.team_id, is_active: s.is_active };
      }
      setSlackStatus(map);
    } catch {
      // ignore
    }
  };

  const handleConnectEmail = async (dept: string, provider: string) => {
    try {
      const { auth_url } = await api.connectDepartmentEmail(dept, provider);
      window.location.href = auth_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect email");
    }
  };

  const handleConnectSlack = async (dept: string) => {
    try {
      const { auth_url } = await api.connectDepartmentSlack(dept);
      window.location.href = auth_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect Slack");
    }
  };

  const handleDisconnectSlack = async (dept: string) => {
    if (!confirm(`Disconnect Slack for ${DEPARTMENT_CONFIG[dept]?.label || dept}? The AI agent will lose Slack access.`)) return;
    try {
      await api.disconnectDepartmentSlack(dept);
      setSlackStatus((prev) => {
        const next = { ...prev };
        delete next[dept];
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Slack");
    }
  };

  const handleDisconnectEmail = async (dept: string) => {
    if (!confirm(`Disconnect email for ${DEPARTMENT_CONFIG[dept]?.label || dept}? The AI agent will lose email access.`)) return;
    try {
      await api.disconnectDepartmentEmail(dept);
      setEmailStatus((prev) => {
        const next = { ...prev };
        delete next[dept];
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disconnect email");
    }
  };

  const loadData = async (days: number) => {
    setLoading(true);
    try {
      const [usageData, insightsData] = await Promise.all([
        api.getUsage(days),
        api.getInsights().catch(() => ({ departments: [] })),
      ]);
      setUsage(usageData.usage);
      setInsights(insightsData.departments || []);
      setActivePeriod(days);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const totalInputTokens = usage.reduce((sum, u) => sum + u.total_input_tokens, 0);
  const totalOutputTokens = usage.reduce((sum, u) => sum + u.total_output_tokens, 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const totalRequests = usage.reduce((sum, u) => sum + u.total_requests, 0);
  const totalToolCalls = usage.reduce((sum, u) => sum + u.total_tool_calls, 0);
  const estimatedCost =
    (totalInputTokens / 1000) * COST_PER_1K_INPUT +
    (totalOutputTokens / 1000) * COST_PER_1K_OUTPUT;

  const barData = usage.map((u) => ({
    name: DEPARTMENT_CONFIG[u.department]?.label || u.department,
    input: u.total_input_tokens,
    output: u.total_output_tokens,
    requests: u.total_requests,
    tools: u.total_tool_calls,
  }));

  const pieData = usage
    .filter((u) => u.total_input_tokens + u.total_output_tokens > 0)
    .map((u) => ({
      name: DEPARTMENT_CONFIG[u.department]?.label || u.department,
      value: u.total_input_tokens + u.total_output_tokens,
      color: DEPT_COLORS[u.department] || "#94a3b8",
    }));

  const costPerDept = usage.map((u) => ({
    name: DEPARTMENT_CONFIG[u.department]?.label || u.department,
    cost:
      (u.total_input_tokens / 1000) * COST_PER_1K_INPUT +
      (u.total_output_tokens / 1000) * COST_PER_1K_OUTPUT,
    color: DEPT_COLORS[u.department] || "#94a3b8",
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">
              Usage analytics, cost tracking & department insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => loadData(d)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    activePeriod === d
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button
              onClick={() => router.push("/chat")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back to Chat
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading dashboard...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard
                label="Total Tokens"
                value={totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : String(totalTokens)}
                sub={`${(totalInputTokens / 1000).toFixed(1)}K in / ${(totalOutputTokens / 1000).toFixed(1)}K out`}
                icon="🔤"
              />
              <SummaryCard
                label="Total Requests"
                value={String(totalRequests)}
                sub={`${(totalRequests / activePeriod).toFixed(1)} per day avg`}
                icon="📨"
              />
              <SummaryCard
                label="Tool Calls"
                value={String(totalToolCalls)}
                sub={totalRequests > 0 ? `${(totalToolCalls / totalRequests).toFixed(1)} per request` : "—"}
                icon="🔧"
              />
              <SummaryCard
                label="Est. API Cost"
                value={`$${estimatedCost.toFixed(2)}`}
                sub={`$${(estimatedCost / Math.max(activePeriod, 1) * 30).toFixed(2)}/mo projected`}
                icon="💳"
                highlight
              />
              <SummaryCard
                label="Active Depts"
                value={`${usage.filter((u) => u.total_requests > 0).length}/${Object.keys(DEPARTMENT_CONFIG).length}`}
                sub="departments with activity"
                icon="🏢"
              />
            </div>

            {/* Charts Row */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Token Distribution Bar Chart */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Token Usage by Department</h3>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(v) => [`${(Number(v) / 1000).toFixed(1)}K tokens`, ""]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="input" name="Input" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="output" name="Output" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>

              {/* Pie Chart — Token share */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Token Share by Department</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${(Number(v) / 1000).toFixed(1)}K tokens`, ""]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Cost Breakdown by Department</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {costPerDept.map((d) => (
                  <div key={d.name} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{d.name}</span>
                      <span className="text-lg font-bold text-gray-900">${d.cost.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${estimatedCost > 0 ? (d.cost / estimatedCost) * 100 : 0}%`,
                          backgroundColor: d.color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {estimatedCost > 0 ? ((d.cost / estimatedCost) * 100).toFixed(1) : "0"}% of total
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Integration */}
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Email Integration</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
              {["sales", "finance", "accounting", "restaurant", "logistics"].map((dept) => {
                const cfg = DEPARTMENT_CONFIG[dept];
                const email = emailStatus[dept];
                return (
                  <div key={dept} className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{cfg?.icon}</span>
                      <h3 className={`text-sm font-semibold ${cfg?.color || "text-gray-700"}`}>{cfg?.label || dept}</h3>
                    </div>
                    {email ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs font-medium text-green-700 capitalize">{email.provider}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-3" title={email.email_address}>{email.email_address}</p>
                        <button
                          onClick={() => handleDisconnectEmail(dept)}
                          className="w-full text-xs py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-400 mb-3">Not connected</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConnectEmail(dept, "gmail")}
                            className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Gmail
                          </button>
                          <button
                            onClick={() => handleConnectEmail(dept, "outlook")}
                            className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Outlook
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Department KPI Insights */}
            {insights.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Department Insights</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {insights.map((dept) => {
                    const cfg = DEPARTMENT_CONFIG[dept.department];
                    return (
                      <div key={dept.department} className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">{cfg?.icon}</span>
                          <h3 className={`text-base font-semibold ${cfg?.color || "text-gray-700"}`}>
                            {cfg?.label || dept.department}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {dept.kpis.map((kpi, ki) => (
                            <div key={ki} className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs text-gray-500">{kpi.label}</p>
                              <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                              <p className={`text-xs mt-0.5 ${
                                kpi.trend_direction === "up" ? "text-green-600" : kpi.trend_direction === "down" ? "text-red-600" : "text-gray-400"
                              }`}>
                                {kpi.trend_direction === "up" ? "↑" : kpi.trend_direction === "down" ? "↓" : "→"} {kpi.trend}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Slack Integration */}
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Slack Integration</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
              {["sales", "finance", "accounting", "restaurant", "logistics"].map((dept) => {
                const cfg = DEPARTMENT_CONFIG[dept];
                const slack = slackStatus[dept];
                return (
                  <div key={dept} className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{cfg?.icon}</span>
                      <h3 className={`text-sm font-semibold ${cfg?.color || "text-gray-700"}`}>{cfg?.label || dept}</h3>
                    </div>
                    {slack ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs font-medium text-green-700">Connected</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-3" title={slack.team_name}>{slack.team_name}</p>
                        <button
                          onClick={() => handleDisconnectSlack(dept)}
                          className="w-full text-xs py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-400 mb-3">Not connected</p>
                        <button
                          onClick={() => handleConnectSlack(dept)}
                          className="w-full text-xs py-1.5 rounded-lg border border-[#4A154B] text-[#4A154B] hover:bg-[#4A154B] hover:text-white transition"
                        >
                          Connect Slack
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Department Detail Cards */}
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Department Breakdown</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {["sales", "finance", "accounting", "restaurant"].map((dept) => {
                const deptUsage = usage.find((u) => u.department === dept);
                const cfg = DEPARTMENT_CONFIG[dept];
                const tokens = deptUsage
                  ? deptUsage.total_input_tokens + deptUsage.total_output_tokens
                  : 0;
                const deptCost =
                  ((deptUsage?.total_input_tokens || 0) / 1000) * COST_PER_1K_INPUT +
                  ((deptUsage?.total_output_tokens || 0) / 1000) * COST_PER_1K_OUTPUT;

                return (
                  <div
                    key={dept}
                    className="rounded-xl bg-white p-5 shadow-sm border border-gray-200 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{cfg.icon}</span>
                      <h3 className={`text-base font-semibold ${cfg.color}`}>{cfg.label}</h3>
                    </div>
                    <div className="space-y-2.5">
                      <MetricRow label="Tokens" value={`${(tokens / 1000).toFixed(1)}K`} />
                      <MetricRow label="Requests" value={String(deptUsage?.total_requests || 0)} />
                      <MetricRow label="Tool Calls" value={String(deptUsage?.total_tool_calls || 0)} />
                      <MetricRow label="Est. Cost" value={`$${deptCost.toFixed(2)}`} />
                      <div className="pt-1">
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${totalTokens > 0 ? (tokens / totalTokens) * 100 : 0}%`,
                              backgroundColor: DEPT_COLORS[dept],
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {totalTokens > 0 ? ((tokens / totalTokens) * 100).toFixed(1) : "0"}% of total
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function SummaryCard({
  label, value, sub, icon, highlight,
}: {
  label: string; value: string; sub: string; icon: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 shadow-sm border ${highlight ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" : "bg-white border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-blue-700" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
      No usage data yet. Start chatting to generate metrics.
    </div>
  );
}
