import sys

path = "C:/Users/kanwa/multi-dept-ai-portal-new/frontend/src/app/chat/page.tsx"
with open(path, 'rb') as f:
    content = f.read()

INSERT_BEFORE = b'function DonutChart({ segments, centerLabel }: { segments: ChartSegment[]; centerLabel: string }) {'

new_code = """
/* -- Logistics Welcome Dashboard -- */
function LogisticsWelcome({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-4">
      {LOGISTICS_SECTIONS.map((section: PromptSection) => (
        <div key={section.id} className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100"
            style={{ background: `linear-gradient(135deg, ${section.accentColor}0a 0%, white 60%)` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-sm"
              style={{ background: `${section.accentColor}18`, border: `1.5px solid ${section.accentColor}30` }}>
              {section.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">{section.label}</h3>
              <p className="text-[11px] text-gray-400">{section.description}</p>
            </div>
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${section.badgeBg} ${section.badgeText}`}
              style={{ border: `1px solid ${section.accentColor}25` }}>
              Active
            </span>
          </div>
          <div className="grid grid-cols-3">
            {section.prompts.slice(0, 9).map((qp, idx) => (
              <button key={idx} onClick={() => onSend(qp.prompt)}
                className="flex items-start gap-2.5 p-3.5 text-left transition-colors group hover:bg-gray-50"
                style={{ borderRight: (idx % 3 !== 2) ? "1px solid #f3f4f6" : undefined, borderBottom: (idx < 6) ? "1px solid #f3f4f6" : undefined }}>
                <span className="text-base flex-shrink-0 mt-0.5">{qp.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-gray-900 leading-tight">{qp.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-1">{qp.description}</p>
                </div>
                <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5 ml-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -- Recharts Analytics Panel -- */
interface AnalyticsData {
  barData?: { name: string; value: number; color?: string }[];
  lineData?: { name: string; value: number; value2?: number }[];
  pieData?: { name: string; value: number; color: string }[];
  barLabel?: string; lineLabel?: string; line2Label?: string;
}
function AnalyticsPanel({ analytics }: { analytics: AnalyticsData }) {
  const hasBar = (analytics.barData?.length ?? 0) > 0;
  const hasLine = (analytics.lineData?.length ?? 0) > 0;
  const hasPie = (analytics.pieData?.length ?? 0) > 0;
  if (!hasBar && !hasLine && !hasPie) return null;
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: Record<string, number>) => {
    if (percent < 0.06) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
  const cols = [hasBar, hasLine, hasPie].filter(Boolean).length;
  return (
    <div className={`grid gap-3 mt-3 ${cols >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {hasBar && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{analytics.barLabel || "Distribution"}</p>
          <ResponsiveContainer width="100%" height={160}>
            <ReBarChart data={analytics.barData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }} cursor={{ fill: "rgba(0,0,0,.03)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {analytics.barData!.map((entry, i) => <Cell key={i} fill={entry.color || "#557C93"} />)}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasLine && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{analytics.lineLabel || "Trend"}</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={analytics.lineData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="areaG1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#557C93" stopOpacity={0.25} /><stop offset="95%" stopColor="#557C93" stopOpacity={0} /></linearGradient>
                <linearGradient id="areaG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} /><stop offset="95%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Area type="monotone" dataKey="value" stroke="#557C93" strokeWidth={2.5} fill="url(#areaG1)" name={analytics.lineLabel || "Value"} dot={false} activeDot={{ r: 4, fill: "#557C93" }} />
              {analytics.lineData!.some(d => d.value2 !== undefined) && (
                <Area type="monotone" dataKey="value2" stroke="#14b8a6" strokeWidth={2.5} fill="url(#areaG2)" name={analytics.line2Label || "Value 2"} dot={false} activeDot={{ r: 4, fill: "#14b8a6" }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasPie && !hasBar && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Composition</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={analytics.pieData} cx="50%" cy="50%" outerRadius={72} innerRadius={36} dataKey="value" labelLine={false} label={renderLabel} paddingAngle={2}>
                {analytics.pieData!.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: number) => [v.toLocaleString(), ""]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* -- Build analytics from tool calls -- */
function buildAnalytics(toolCalls: Record<string, unknown>[], dept: string): AnalyticsData {
  const analytics: AnalyticsData = {};
  for (const tc of toolCalls) {
    const tn = (tc.tool as string) || "";
    const out = tc.output as Record<string, unknown> | undefined;
    if (!out) continue;
    const res = (out.results as Record<string, unknown>[]) || [];
    const sum = out.summary as Record<string, unknown> | undefined;
    if (dept === "logistics") {
      if (tn === "get_fleet_summary" || tn === "get_fleet_location") {
        let mov = 0, idl = 0, stp = 0;
        if (sum) { mov = Number(sum.moving || 0); idl = Number(sum.idle || 0); stp = Number(sum.stopped || 0); }
        else { mov = res.filter(r => r.status === "moving").length; idl = res.filter(r => r.status === "idle").length; stp = res.filter(r => r.status === "stopped").length; }
        if (mov + idl + stp > 0) {
          analytics.barData = [{ name: "Moving", value: mov, color: "#557C93" }, { name: "Idle", value: idl, color: "#d97706" }, { name: "Stopped", value: stp, color: "#9ca3af" }];
          analytics.barLabel = "Fleet Status Distribution";
          analytics.pieData = [{ name: "Moving", value: mov, color: "#557C93" }, { name: "Idle", value: idl, color: "#d97706" }, { name: "Stopped", value: stp, color: "#9ca3af" }];
        }
      } else if (tn === "get_moving_vehicles" && res.length > 0) {
        const sorted = [...res].sort((a, b) => Number(a.speed || 0) - Number(b.speed || 0));
        analytics.lineData = sorted.slice(0, 15).map((v, i) => ({ name: String(v.name || "V" + (i + 1)).slice(0, 8), value: Number(v.speed || 0) }));
        analytics.lineLabel = "Vehicle Speed (km/h)";
        const buckets: Record<string, number> = { "0-40": 0, "41-70": 0, "71-100": 0, "100+": 0 };
        res.forEach(v => { const s = Number(v.speed || 0); if (s <= 40) buckets["0-40"]++; else if (s <= 70) buckets["41-70"]++; else if (s <= 100) buckets["71-100"]++; else buckets["100+"]++; });
        analytics.barData = Object.entries(buckets).map(([k, v]) => ({ name: k, value: v, color: k === "100+" ? "#ef4444" : "#557C93" }));
        analytics.barLabel = "Speed Buckets (km/h)";
      }
    }
    if (["finance", "accounting", "logistics"].includes(dept)) {
      if ((tn === "qb_profit_and_loss" || tn === "qb_balance_sheet" || tn === "qb_cash_flow") && res.length > 0) {
        analytics.barData = res.slice(0, 8).map((r, i) => ({ name: String(r.name || r.type || "Item " + (i + 1)).slice(0, 12), value: Math.abs(Number(r.amount || r.value || 0)), color: "#2CA01C" }));
        analytics.barLabel = tn === "qb_profit_and_loss" ? "P&L Breakdown" : tn === "qb_cash_flow" ? "Cash Flow" : "Balance Sheet";
      } else if (tn === "qb_list_invoices" && res.length > 0) {
        const sm: Record<string, number> = {};
        res.forEach(r => { const s = Number(r.Balance || 0) > 0 ? "Open" : "Paid"; sm[s] = (sm[s] || 0) + 1; });
        analytics.pieData = Object.entries(sm).map(([k, v], i) => ({ name: k, value: v, color: i === 0 ? "#2CA01C" : "#d97706" }));
      } else if (tn === "query_invoices" && res.length > 0) {
        const sm: Record<string, number> = {};
        res.forEach(r => { const s = String(r.status || "unknown"); sm[s] = (sm[s] || 0) + 1; });
        const cols: Record<string, string> = { pending: "#d97706", paid: "#22c55e", overdue: "#ef4444", disputed: "#8b5cf6" };
        analytics.pieData = Object.entries(sm).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: cols[k] || "#6b7280" }));
        analytics.barData = Object.entries(sm).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: cols[k] || "#6b7280" }));
        analytics.barLabel = "Invoice Status";
      }
    }
    if (dept === "restaurant" && tn === "get_orders" && res.length > 0) {
      analytics.lineData = res.slice(0, 10).map((o, i) => ({ name: "#" + (i + 1), value: Number(o.total || 0) }));
      analytics.lineLabel = "Order Revenue ($)";
    }
    if (dept === "sales" && tn === "query_crm" && res.length > 0) {
      const sm: Record<string, number> = {};
      res.forEach(r => { const s = String(r.stage || "Unknown"); sm[s] = (sm[s] || 0) + 1; });
      const sc = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444"];
      analytics.barData = Object.entries(sm).map(([k, v], i) => ({ name: k, value: v, color: sc[i % sc.length] }));
      analytics.barLabel = "Deals by Stage";
      analytics.pieData = Object.entries(sm).map(([k, v], i) => ({ name: k, value: v, color: sc[i % sc.length] }));
    }
  }
  return analytics;
}

"""

idx = content.find(INSERT_BEFORE)
if idx == -1:
    print("ERROR: INSERT_BEFORE not found in file")
    sys.exit(1)

new_content = content[:idx] + new_code.encode('utf-8') + content[idx:]
with open(path, 'wb') as f:
    f.write(new_content)
print("SUCCESS: inserted", len(new_code), "bytes at position", idx)