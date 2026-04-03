"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DEPARTMENT_CONFIG } from "@/types";
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
  const router = useRouter();
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [insights, setInsights] = useState<InsightsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePeriod, setActivePeriod] = useState(30);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.push("/chat");
      return;
    }
    loadData(30);
  }, [router]);

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
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 172 172" fill="none">
                <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-navy">Admin Dashboard</h1>
              <p className="text-xs text-gray-400">
                Usage analytics, cost tracking & department insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => loadData(d)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    activePeriod === d
                      ? "bg-white shadow text-brand-navy"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button
              onClick={() => router.push("/chat")}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-teal/5 transition"
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
                        formatter={(v: number) => [`${(v / 1000).toFixed(1)}K tokens`, ""]}
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
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${(v / 1000).toFixed(1)}K tokens`, ""]}
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
    <div className={`rounded-xl p-5 shadow-sm border ${highlight ? "bg-gradient-to-br from-brand-teal-pale to-blue-50 border-brand-teal/20" : "bg-white border-gray-200/60"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-brand-navy" : "text-brand-navy"}`}>{value}</p>
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
