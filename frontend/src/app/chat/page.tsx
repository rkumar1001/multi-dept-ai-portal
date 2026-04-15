"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { api } from "@/lib/api";
import { ChatMessage, Conversation } from "@/types";
import { DEPARTMENT_CONFIG, DEPARTMENT_PROMPTS, LOGISTICS_SECTIONS, getIntegrations } from "@/departments";
import type { Integration, PromptSection } from "@/departments";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from "recharts";

/* ── Dashboard Helpers ─────────────────────────────────────────────────── */

interface KPI { label: string; value: string | number; subtitle?: string; color: string }
interface ChartSegment { label: string; value: number; color: string }
interface EmbedItem { type: 'iframe' | 'video'; url: string; title: string }
interface DashboardData {
  title: string; badge: string; kpis: KPI[]; segments: ChartSegment[];
  tables: { rows: Record<string, unknown>[] }[]; followUps: string[];
  embeds: EmbedItem[];
}

function extractDashboardData(toolCalls: Record<string, unknown>[], dept: string): DashboardData {
  const kpis: KPI[] = [];
  const segments: ChartSegment[] = [];
  const tables: { rows: Record<string, unknown>[] }[] = [];
  const followUps: string[] = [];
  const embeds: EmbedItem[] = [];
  let title = "Dashboard";
  let badge = "";

  for (const tc of toolCalls) {
    const tn = (tc.tool as string) || "";
    const out = tc.output as Record<string, unknown> | undefined;
    if (!out) continue;
    const res = (out.results as Record<string, unknown>[]) || [];
    const sum = out.summary as Record<string, unknown> | undefined;

    // Extract embedded content (iframes, videos) from tool output
    if (out._embed) {
      const e = out._embed as { type?: string; url?: string; title?: string };
      if (e.url && (e.type === "iframe" || e.type === "video")) {
        embeds.push({ type: e.type, url: e.url, title: e.title || "Embedded Content" });
      }
    }
    if (out._embeds && Array.isArray(out._embeds)) {
      for (const e of out._embeds as { type?: string; url?: string; title?: string }[]) {
        if (e.url && (e.type === "iframe" || e.type === "video")) {
          embeds.push({ type: e.type, url: e.url, title: e.title || "Embedded Content" });
        }
      }
    }

    if (res.length > 0) tables.push({ rows: res });
    else if (tn === "get_cash_flow_forecast") {
      const fc = (out.forecast as Record<string, unknown>[]) || [];
      if (fc.length > 0) tables.push({ rows: fc });
    } else if (tn === "reconcile_accounts") {
      const un = (out.unmatched_items as Record<string, unknown>[]) || [];
      if (un.length > 0) tables.push({ rows: un });
    }

    // ── LOGISTICS ──
    if (dept === "logistics") {
      title = "Fleet Command Center";
      if (tn === "get_fleet_summary" || tn === "get_fleet_location") {
        let total = 0, mov = 0, idl = 0, stp = 0;
        if (sum) { total = Number(sum.total_vehicles || sum.total || res.length); mov = Number(sum.moving || 0); idl = Number(sum.idle || 0); stp = Number(sum.stopped || 0); }
        else if (res.length > 0) { total = res.length; mov = res.filter(r => r.status === "moving").length; idl = res.filter(r => r.status === "idle").length; stp = res.filter(r => r.status === "stopped").length; }
        if (total > 0) {
          kpis.push({ label: "TOTAL FLEET", value: total, subtitle: "All vehicles", color: "#08203E" }, { label: "MOVING", value: mov, subtitle: `${((mov/total)*100).toFixed(1)}% active`, color: "#557C93" }, { label: "IDLE", value: idl, subtitle: "Engine on", color: "#d97706" }, { label: "STOPPED", value: stp, subtitle: `${((stp/total)*100).toFixed(1)}% parked`, color: "#6b7280" });
          segments.push({ label: "Moving", value: mov, color: "#557C93" }, { label: "Idle", value: idl, color: "#d97706" }, { label: "Stopped", value: stp, color: "#9ca3af" });
          badge = `${total} vehicles tracked`;
          followUps.push("Show stopped vehicles", "Moving vehicles by route", "Idle time report", "Fuel efficiency stats");
        }
      } else if (tn === "get_moving_vehicles") {
        const c = res.length;
        kpis.push({ label: "MOVING VEHICLES", value: c, subtitle: "On the road", color: "#557C93" });
        if (c > 0) { const avg = res.reduce((s, r) => s + (Number(r.speed) || 0), 0) / c; const mx = Math.max(...res.map(r => Number(r.speed) || 0)); kpis.push({ label: "AVG SPEED", value: `${avg.toFixed(0)} km/h`, subtitle: "Fleet average", color: "#08203E" }, { label: "TOP SPEED", value: `${mx} km/h`, subtitle: mx > 100 ? "⚠️ Over limit" : "Within limit", color: mx > 100 ? "#ef4444" : "#22c55e" }); }
        badge = `${c} vehicles moving`; followUps.push("Fleet summary overview", "Speeding alerts", "Find vehicles near location");
      } else if (tn === "get_idle_vehicles") {
        kpis.push({ label: "IDLE VEHICLES", value: res.length, subtitle: "Engine on, stationary", color: "#d97706" });
        badge = `${res.length} vehicles idle`; followUps.push("Fleet summary overview", "Show stopped vehicles", "Show moving vehicles");
      } else if (tn === "get_stopped_vehicles") {
        kpis.push({ label: "STOPPED VEHICLES", value: res.length, subtitle: "Engine off, parked", color: "#6b7280" });
        badge = `${res.length} vehicles stopped`; followUps.push("Fleet summary overview", "Show idle vehicles", "Show moving vehicles");
      } else if (tn === "get_speeding_vehicles") {
        kpis.push({ label: "SPEEDING ALERTS", value: res.length, subtitle: "Over speed limit", color: "#ef4444" });
        badge = `${res.length} alerts`; followUps.push("Fleet summary overview", "Show all moving vehicles");
      } else if (tn === "get_vehicles_near_location") {
        kpis.push({ label: "VEHICLES FOUND", value: res.length, subtitle: "In search radius", color: "#557C93" });
        badge = `${res.length} nearby`; followUps.push("Fleet summary overview", "Show vehicle details");
      } else if (tn === "get_vehicle_by_name" || tn === "get_vehicle_by_id" || tn === "get_live_tracking") {
        title = "Vehicle Tracker";
        if (res.length > 0) { const v = res[0]; kpis.push({ label: "VEHICLE", value: String(v.name || "Unknown"), color: "#08203E" }, { label: "STATUS", value: String(v.status || "—"), color: v.status === "moving" ? "#557C93" : v.status === "idle" ? "#d97706" : "#6b7280" }, { label: "SPEED", value: `${v.speed || 0} km/h`, color: Number(v.speed) > 100 ? "#ef4444" : "#557C93" }); badge = "Live tracking"; }
        followUps.push("Fleet summary", "Find nearby vehicles", "Speeding alerts");
      } else if (tn === "samsara_get_live_shares" || tn === "samsara_create_live_share") {
        title = "Live Fleet Map";
        if (tn === "samsara_create_live_share") {
          kpis.push({ label: "STATUS", value: "Created", subtitle: "Live share link", color: "#22c55e" });
          badge = "New share link";
        } else {
          kpis.push({ label: "LIVE SHARES", value: res.length, subtitle: "Active links", color: "#557C93" });
          badge = `${res.length} active links`;
        }
        followUps.push("Fleet summary", "Show vehicle locations", "Request dashcam clip");
      } else if (tn === "samsara_request_dashcam_clip") {
        title = "Dashcam Retrieval";
        kpis.push({ label: "STATUS", value: String(out.status || "Requested"), subtitle: "Processing clip", color: "#d97706" });
        badge = "Clip requested";
        if (out.retrieval_id) followUps.push(`Check clip status`);
        followUps.push("Fleet summary", "Browse uploaded media");
      } else if (tn === "samsara_get_dashcam_clip") {
        title = "Dashcam Clip";
        const clipStatus = String(out.status || "unknown");
        kpis.push({ label: "STATUS", value: clipStatus.charAt(0).toUpperCase() + clipStatus.slice(1), subtitle: clipStatus === "available" ? "Ready to play" : "Processing...", color: clipStatus === "available" ? "#22c55e" : "#d97706" });
        badge = clipStatus === "available" ? "Ready" : "Processing";
        followUps.push("Fleet summary", "Request another clip", "Browse uploaded media");
      } else if (tn === "samsara_get_uploaded_media") {
        title = "Dashcam Media Library";
        kpis.push({ label: "MEDIA FILES", value: res.length, subtitle: "Dashcam recordings", color: "#557C93" });
        badge = `${res.length} files`;
        followUps.push("Fleet summary", "Request specific clip", "Show vehicle locations");
      }
    }

    // ── RESTAURANT ──
    if (dept === "restaurant") {
      title = "Restaurant Dashboard";
      if (tn === "query_menu") {
        const prices = res.map(i => Number(i.price) || 0).filter(p => p > 0);
        const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const veg = res.filter(i => { const t = i.tags as string[] | undefined; return t?.includes("Vegan"); }).length;
        kpis.push({ label: "MENU ITEMS", value: res.length, subtitle: "In selection", color: "#f97316" }, { label: "AVG PRICE", value: `$${avg.toFixed(2)}`, subtitle: `$${Math.min(...prices).toFixed(2)} – $${Math.max(...prices).toFixed(2)}`, color: "#22c55e" });
        if (veg > 0) kpis.push({ label: "VEGAN OPTIONS", value: veg, subtitle: "Plant-based", color: "#16a34a" });
        badge = `${res.length} menu items`; followUps.push("Show popular dishes", "View vegan options", "Recent orders", "Order analytics");
        // Category distribution
        const cats: Record<string, number> = {};
        res.forEach(r => { const c = String(r.category || "Other"); cats[c] = (cats[c] || 0) + 1; });
        const catColors = ["#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ef4444", "#d97706", "#14b8a6", "#ec4899"];
        Object.entries(cats).forEach(([k, v], i) => segments.push({ label: k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), value: v, color: catColors[i % catColors.length] }));
      } else if (tn === "get_orders") {
        const tot = res.reduce((s, o) => s + (Number(o.total) || 0), 0);
        kpis.push({ label: "ORDERS", value: res.length, subtitle: "Recent orders", color: "#f97316" }, { label: "REVENUE", value: `$${tot.toFixed(2)}`, subtitle: "Total", color: "#22c55e" }, { label: "AVG ORDER", value: `$${(tot / Math.max(res.length, 1)).toFixed(2)}`, subtitle: "Per order", color: "#557C93" });
        badge = `${res.length} orders`; followUps.push("View full menu", "Order analytics", "Popular dishes");
      } else if (tn === "get_order_stats") {
        title = "Order Analytics"; badge = "Analytics"; followUps.push("View recent orders", "Show full menu");
      }
    }

    // ── FINANCE ──
    if (dept === "finance") {
      title = "Finance Dashboard";
      if (tn === "query_erp") {
        const tot = res.reduce((s, r) => s + (Number(r.balance) || 0), 0);
        kpis.push({ label: "ACCOUNTS", value: res.length, subtitle: "GL entries", color: "#22c55e" }, { label: "TOTAL BALANCE", value: `$${tot.toLocaleString()}`, subtitle: "Combined", color: "#08203E" });
        badge = `${res.length} accounts`; followUps.push("Cash flow forecast", "Compliance check", "Budget comparison");
      } else if (tn === "get_cash_flow_forecast") {
        title = "Cash Flow Forecast";
        const fc = (out.forecast as Record<string, unknown>[]) || [];
        if (fc.length > 0) {
          const tIn = fc.reduce((s, f) => s + (Number(f.inflow) || 0), 0); const tOut = fc.reduce((s, f) => s + (Number(f.outflow) || 0), 0); const net = tIn - tOut;
          kpis.push({ label: "TOTAL INFLOW", value: `$${tIn.toLocaleString()}`, subtitle: `${fc.length} months`, color: "#22c55e" }, { label: "TOTAL OUTFLOW", value: `$${tOut.toLocaleString()}`, subtitle: "Projected", color: "#ef4444" }, { label: "NET CASH FLOW", value: `$${net.toLocaleString()}`, subtitle: net >= 0 ? "Positive" : "Negative", color: net >= 0 ? "#22c55e" : "#ef4444" });
          badge = `${out.period_months || fc.length}-month forecast`;
          segments.push({ label: "Inflow", value: tIn, color: "#22c55e" }, { label: "Outflow", value: tOut, color: "#ef4444" });
        }
        followUps.push("GL account summary", "Revenue vs budget", "Compliance check");
      } else if (tn === "check_compliance") {
        title = "Compliance Report";
        kpis.push({ label: "STATUS", value: String(out.status || "Unknown"), color: out.status === "compliant" ? "#22c55e" : "#ef4444" }, { label: "REGULATION", value: String(out.regulation || ""), color: "#08203E" });
        badge = "Compliance check"; followUps.push("GL account summary", "Cash flow forecast");
      }
    }

    // ── ACCOUNTING ──
    if (dept === "accounting") {
      title = "Accounting Dashboard";
      if (tn === "query_invoices") {
        const tot = res.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const ov = res.filter(r => r.status === "overdue").length;
        kpis.push({ label: "INVOICES", value: res.length, subtitle: String(out.direction || "All"), color: "#8b5cf6" }, { label: "TOTAL AMOUNT", value: `$${tot.toLocaleString()}`, subtitle: "Combined", color: "#08203E" });
        if (ov > 0) kpis.push({ label: "OVERDUE", value: ov, subtitle: "Needs attention", color: "#ef4444" });
        badge = `${res.length} invoices`; followUps.push("Account reconciliation", "Tax calculation", "Expense report");
        // Status distribution
        const statMap: Record<string, number> = {};
        res.forEach(r => { const s = String(r.status || "unknown"); statMap[s] = (statMap[s] || 0) + 1; });
        const sCol: Record<string, string> = { pending: "#d97706", paid: "#22c55e", overdue: "#ef4444", disputed: "#8b5cf6" };
        Object.entries(statMap).forEach(([k, v]) => segments.push({ label: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: sCol[k] || "#6b7280" }));
      } else if (tn === "reconcile_accounts") {
        title = "Account Reconciliation";
        kpis.push({ label: "BANK BALANCE", value: `$${Number(out.bank_balance || 0).toLocaleString()}`, color: "#22c55e" }, { label: "BOOK BALANCE", value: `$${Number(out.book_balance || 0).toLocaleString()}`, color: "#557C93" }, { label: "DIFFERENCE", value: `$${Number(out.difference || 0).toLocaleString()}`, color: Number(out.difference) === 0 ? "#22c55e" : "#ef4444" });
        badge = `Period: ${out.period || "Current"}`; followUps.push("Pending invoices", "Tax calculation");
      } else if (tn === "calculate_tax") {
        title = "Tax Calculation";
        kpis.push({ label: "AMOUNT", value: `$${Number(out.amount || 0).toLocaleString()}`, color: "#08203E" }, { label: "ESTIMATED TAX", value: `$${Number(out.estimated_tax || 0).toLocaleString()}`, color: "#ef4444" }, { label: "EFFECTIVE RATE", value: String(out.effective_rate || ""), color: "#557C93" });
        badge = `${out.jurisdiction || "Tax"} calculation`; followUps.push("Pending invoices", "Account reconciliation");
      }
    }
    // ── WEATHER (shared across all departments) ──
    if (tn === "get_weather") {
      const cur = out.current as Record<string, unknown> | undefined;
      const fc = (out.forecast as Record<string, unknown>[]) || [];
      if (cur) {
        title = "Weather Report";
        badge = String(out.location || "Weather");
        const temp = Number(cur.temperature_c ?? 0);
        const feels = Number(cur.feels_like_c ?? 0);
        const humidity = Number(cur.humidity_pct ?? 0);
        const wind = Number(cur.wind_speed_kmh ?? 0);
        const precip = Number(cur.precipitation_mm ?? 0);
        kpis.push(
          { label: "TEMPERATURE", value: `${temp}°C`, subtitle: `Feels like ${feels}°C`, color: temp > 30 ? "#ef4444" : temp < 0 ? "#3b82f6" : "#22c55e" },
          { label: "CONDITION", value: String(cur.condition || "—"), subtitle: precip > 0 ? `${precip}mm rain` : "No precipitation", color: "#557C93" },
          { label: "HUMIDITY", value: `${humidity}%`, subtitle: humidity > 80 ? "High" : humidity < 30 ? "Low" : "Normal", color: "#08203E" },
          { label: "WIND", value: `${wind} km/h`, subtitle: wind > 50 ? "⚠️ Strong" : "Calm", color: wind > 50 ? "#d97706" : "#6b7280" },
        );
        if (fc.length > 0) tables.push({ rows: fc });
        followUps.push("Check weather in another city", "Fleet summary", "Show full menu");
      }
    }

    // ── SALES ──
    if (dept === "sales") {
      title = "Sales Dashboard";
      if (tn === "query_crm") {
        if (res.length > 0) {
          const tv = res.reduce((s, r) => s + (Number(r.value) || 0), 0); const ap = res.reduce((s, r) => s + (Number(r.probability) || 0), 0) / res.length;
          kpis.push({ label: "DEALS", value: res.length, subtitle: String(out.entity || "pipeline"), color: "#3b82f6" }, { label: "PIPELINE VALUE", value: `$${tv.toLocaleString()}`, subtitle: "Total", color: "#22c55e" }, { label: "AVG WIN RATE", value: `${(ap * 100).toFixed(0)}%`, subtitle: "Probability", color: "#557C93" });
          badge = `${res.length} deals`;
          // Stage distribution
          const stageMap: Record<string, number> = {};
          res.forEach(r => { const s = String(r.stage || "Unknown"); stageMap[s] = (stageMap[s] || 0) + 1; });
          const stColors = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444"];
          Object.entries(stageMap).forEach(([k, v], i) => segments.push({ label: k, value: v, color: stColors[i % stColors.length] }));
        }
        followUps.push("Email follow-ups", "Market analysis", "Top deals");
      } else if (tn === "search_email_logs") {
        title = "Email Intelligence"; kpis.push({ label: "RESULTS", value: res.length, subtitle: "Matching emails", color: "#3b82f6" });
        badge = `${res.length} emails`; followUps.push("Pipeline summary", "Market analysis");
      } else if (tn === "get_market_data") {
        title = "Market Intelligence"; badge = "Market data"; followUps.push("Pipeline summary", "Top deals");
      }
    }
  }

  return { title, badge, kpis, segments, tables, followUps, embeds };
}

/* ── Donut Chart ──────────────────────────────────────────────────────── */


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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
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
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v) => [Number(v ?? 0).toLocaleString(), ""]} />
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

function DonutChart({ segments, centerLabel }: { segments: ChartSegment[]; centerLabel: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  let cum = 0;
  const parts = segments.map((seg) => {
    const start = (cum / total) * 360; cum += seg.value; const end = (cum / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36 rounded-full shadow-inner" style={{ background: `conic-gradient(${parts.join(", ")})` }}>
        <div className="absolute inset-[18px] bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
          <span className="text-2xl font-bold text-brand-navy">{total.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400">{centerLabel}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-semibold text-gray-800">{seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal Bar Chart ─────────────────────────────────────────────── */

function BarChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0 || segments.length === 0) return null;
  const sorted = [...segments].sort((a, b) => b.value - a.value);
  return (
    <div className="w-full space-y-2.5 py-1">
      {sorted.map((seg) => {
        const pct = (seg.value / total) * 100;
        return (
          <div key={seg.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                <span className="text-gray-600 font-medium truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <span className="text-xs font-bold text-gray-800">{seg.value.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 w-7 text-right">{pct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: seg.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Dashboard Data Table ─────────────────────────────────────────────── */

function DashboardTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows || rows.length === 0) return null;
  const fmtH = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const fmtV = (v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number") return v.toLocaleString();
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };
  const display = rows.slice(0, 25);
  if (display.length === 0) return null;
  const keys = Object.keys(display[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-brand-navy to-brand-teal">
            {keys.map(k => (
              <th key={k} className="px-3 py-2.5 text-left text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">{fmtH(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {display.map((row, ri) => (
            <tr key={ri} className="hover:bg-brand-teal/[0.03] transition-colors">
              {keys.map((k, ci) => (
                <td key={ci} className={`px-3 py-2 whitespace-nowrap ${
                  k.toLowerCase().includes("speed") && typeof row[k] === "number" && Number(row[k]) > 100 ? "text-red-600 font-bold"
                  : k.toLowerCase().includes("name") || k.toLowerCase().includes("vehicle") ? "font-medium text-brand-navy"
                  : k.toLowerCase().includes("status") ? `font-medium ${row[k] === "moving" ? "text-teal-600" : row[k] === "idle" ? "text-amber-600" : row[k] === "overdue" ? "text-red-600" : row[k] === "stopped" ? "text-gray-500" : "text-gray-600"}`
                  : k.toLowerCase().includes("price") || k.toLowerCase().includes("amount") || k.toLowerCase().includes("value") || k.toLowerCase().includes("balance") ? "font-medium text-emerald-700"
                  : "text-gray-600"
                }`}>{fmtV(row[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 25 && (
        <div className="px-4 py-2 text-center text-[11px] text-gray-400 bg-gray-50/50 border-t border-gray-100">
          Showing 25 of {rows.length} results
        </div>
      )}
    </div>
  );
}

/* ── Dashboard Message Component ──────────────────────────────────────── */

function DashboardMessage({ content, toolCalls, department, onFollowUp }: {
  content: string; toolCalls: Record<string, unknown>[]; department: string; onFollowUp?: (msg: string) => void;
}) {
  const [tableOpen, setTableOpen] = useState(true);
  const data = extractDashboardData(toolCalls, department);
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = `Today, ${timeStr}`;
  const centerLabel = department === "logistics" ? "vehicles" : department === "restaurant" ? "items" : department === "sales" ? "deals" : "total";

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" viewBox="0 0 172 172" fill="none"><path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-navy">{data.title}</h3>
              <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                Live &middot; {dateStr}
              </p>
            </div>
          </div>
          {data.badge && (
            <span className="text-[11px] font-medium text-brand-teal bg-brand-teal/10 border border-brand-teal/20 rounded-full px-3 py-1 shadow-sm">{data.badge}</span>
          )}
        </div>

        {/* KPI Cards */}
        {data.kpis.length > 0 && (
          <div className="flex border-b border-gray-100">
            {data.kpis.slice(0, 4).map((kpi, i) => (
              <div key={i} className="flex-1 px-4 py-4 text-center border-r last:border-r-0 border-gray-100 relative overflow-hidden group hover:bg-gray-50/50 transition-colors">
                {/* Colored top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-b-sm opacity-80" style={{ background: kpi.color }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 mt-1">{kpi.label}</p>
                <p className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">{kpi.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Embedded Content (iframes / videos) */}
        {data.embeds.length > 0 && (
          <div className="border-b border-gray-100">
            {data.embeds.map((embed, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {embed.type === "iframe" ? (
                    <svg className="w-4 h-4 text-brand-teal" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-brand-teal" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  )}
                  <p className="text-xs font-semibold text-brand-navy">{embed.title}</p>
                  <a href={embed.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[10px] text-brand-teal hover:underline flex items-center gap-1">
                    Open in new tab
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                </div>
                {embed.type === "iframe" ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                    <iframe
                      src={embed.url}
                      title={embed.title}
                      className="w-full border-0"
                      style={{ height: "400px" }}
                      allow="geolocation"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                    <video
                      src={embed.url}
                      controls
                      className="w-full"
                      style={{ maxHeight: "400px" }}
                      preload="metadata"
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chart + Insights Row */}
        <div className={`grid ${data.segments.length > 0 ? "md:grid-cols-5" : "grid-cols-1"} border-b border-gray-100`}>
          {data.segments.length > 0 && (
            <div className="md:col-span-2 flex flex-col items-center p-5 border-r border-gray-100 bg-gray-50/30 gap-4">
              <div className="w-full">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 text-center">
                  {department === "logistics" ? "Fleet distribution" : "Distribution"}
                </p>
                <DonutChart segments={data.segments} centerLabel={centerLabel} />
              </div>
              {/* Bar chart breakdown below donut */}
              {data.segments.length > 1 && (
                <div className="w-full border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Breakdown</p>
                  <BarChart segments={data.segments} />
                </div>
              )}
            </div>
          )}
          <div className={`${data.segments.length > 0 ? "md:col-span-3" : ""} p-5`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {data.segments.length > 0 ? `${data.title.split(" ")[0]} insights` : "Analysis"}
            </p>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                table: () => null, thead: () => null, tbody: () => null, tr: () => null, th: () => null, td: () => null,
                p: ({ children }) => <p className="text-sm text-gray-600 leading-relaxed my-1.5">{children}</p>,
                ul: ({ children }) => <ul className="space-y-2.5 mt-2">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-2.5 mt-2">{children}</ol>,
                li: ({ children }) => (
                  <li className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="w-6 h-6 rounded-full bg-brand-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-brand-teal" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </span>
                    <span className="leading-relaxed">{children}</span>
                  </li>
                ),
                strong: ({ children }) => <strong className="font-semibold text-brand-navy">{children}</strong>,
                h1: ({ children }) => <h3 className="text-base font-bold text-brand-navy mt-3 mb-1.5">{children}</h3>,
                h2: ({ children }) => <h3 className="text-sm font-bold text-brand-navy mt-2.5 mb-1">{children}</h3>,
                h3: ({ children }) => <h4 className="text-sm font-semibold text-brand-navy mt-2 mb-0.5">{children}</h4>,
                blockquote: ({ children }) => <blockquote className="border-l-3 border-brand-teal bg-brand-teal/5 rounded-r-lg px-4 py-2 my-2 text-gray-600 italic">{children}</blockquote>,
                hr: () => <hr className="my-3 border-gray-200/60" />,
              }}>{content}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Recharts Analytics Panel */}
        <AnalyticsPanel analytics={buildAnalytics(toolCalls, department)} />

        {/* Data Table (collapsible) */}
        {data.tables.length > 0 && data.tables.some(t => t.rows.length > 0) && (
          <div>
            <button onClick={() => setTableOpen(!tableOpen)} className="flex w-full items-center justify-between px-5 py-2.5 bg-gray-50/50 hover:bg-gray-50 transition text-xs">
              <span className="flex items-center gap-2 font-semibold text-gray-500 uppercase tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" /></svg>
                Data ({data.tables.reduce((s, t) => s + t.rows.length, 0)} rows)
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${tableOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {tableOpen && data.tables.map((t, i) => <DashboardTable key={i} rows={t.rows} />)}
          </div>
        )}

        {/* Follow-up Suggestions */}
        {data.followUps.length > 0 && (
          <div className="px-5 py-3 bg-gray-50/30 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {data.followUps.map((fu, i) => (
                <button key={i} onClick={() => onFollowUp?.(fu)} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-brand-teal/40 hover:text-brand-teal hover:bg-brand-teal/5 transition-all shadow-sm">
                  {fu}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <MessageActions content={content} />
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
    <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="rounded-md px-2 py-1 text-gray-400 hover:text-brand-teal hover:bg-brand-teal/5 transition text-xs"
        title="Copy"
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <button
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        className={`rounded-md px-2 py-1 transition text-xs ${feedback === "up" ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
      >
        👍
      </button>
      <button
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        className={`rounded-md px-2 py-1 transition text-xs ${feedback === "down" ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
      >
        👎
      </button>
    </div>
  );
}

/* ── Main Chat Page ───────────────────────────────────────────────────── */

import { Suspense } from "react";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#f8f9fc]" />}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  /** Text chunks that have arrived so far in the current streaming response */
  const [streamingContent, setStreamingContent] = useState("");
  /** Name of the tool currently being executed (shown during tool calls) */
  const [streamingToolStatus, setStreamingToolStatus] = useState<string | null>(null);
  /** Ref that mirrors streamingContent so the finally-block can read the latest value */
  const streamingContentRef = useRef("");
  const [attachments, setAttachments] = useState<{ file_id: string; filename: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Abort any in-flight stream when the component unmounts (e.g. navigation)
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
    // Check email connection status — mark connected provider active, others inactive
    api.getEmailStatus(dept).then((status) => {
      setIntegrations((prev) =>
        prev.map((integ) =>
          integ.connectType === "gmail" || integ.connectType === "outlook"
            ? integ.connectType === status.provider
              ? { ...integ, active: true, connected: true }
              : { ...integ, active: false, connected: false }
            : integ
        )
      );
    }).catch(() => { /* no email configured — leave as inactive */ });
    // Check Slack connection status
    api.getSlackStatus(dept).then(() => {
      setIntegrations((prev) =>
        prev.map((integ) =>
          integ.connectType === "slack"
            ? { ...integ, active: true, connected: true }
            : integ
        )
      );
    }).catch(() => { /* Slack not connected */ });
    // Check QuickBooks connection status
    api.getQuickBooksStatus(dept).then(() => {
      setIntegrations((prev) =>
        prev.map((integ) =>
          integ.connectType === "quickbooks"
            ? { ...integ, active: true, connected: true }
            : integ
        )
      );
    }).catch(() => { /* QuickBooks not connected */ });
    // Clear OAuth redirect params from URL
    if (searchParams.get("slack_connected") || searchParams.get("email_connected") || searchParams.get("quickbooks_connected")) {
      window.history.replaceState({}, "", "/chat");
    }
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large (max 10 MB)`);
        continue;
      }
      try {
        const result = await api.uploadFile(file);
        setAttachments((prev) => [...prev, { file_id: result.file_id, filename: result.filename, size: result.size }]);
      } catch (err) {
        alert(`Failed to upload "${file.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeAttachment = useCallback((file_id: string) => {
    setAttachments((prev) => prev.filter((a) => a.file_id !== file_id));
  }, []);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      recognitionRef.current = null;
    }
    if (!overrideMessage) setInput("");
    const currentAttachments = attachments.length > 0 ? [...attachments] : undefined;
    setAttachments([]);
    const displayMsg = currentAttachments
      ? `${msg}\n\n📎 ${currentAttachments.map(a => a.filename).join(", ")}`
      : msg;
    setMessages((prev) => [...prev, { role: "user", content: displayMsg }]);
    setLoading(true);
    streamingContentRef.current = "";
    setStreamingContent("");
    setStreamingToolStatus(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let finalConvId: string | undefined;
    let finalToolCalls: Record<string, unknown>[] | undefined;

    // ── Frontend retry logic ──────────────────────────────────────────────
    // Retry the request up to 3 times (with exponential back-off) when the
    // connection fails BEFORE any text has been streamed. Once text has
    // started arriving we never retry (partial output is already visible).
    const MAX_ATTEMPTS = 3;
    let lastError: unknown = null;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Reset streamed content at the start of each attempt
        streamingContentRef.current = "";
        setStreamingContent("");
        setStreamingToolStatus(null);
        lastError = null;

        try {
          await api.streamMessage(
            msg,
            conversationId || undefined,
            {
              onConversationId: (id) => {
                // Set immediately so follow-up messages use the right conversation
                finalConvId = id;
                setConversationId(id);
              },
              onChunk: (text) => {
                streamingContentRef.current += text;
                setStreamingContent((prev) => prev + text);
                setStreamingToolStatus(null);
              },
              onToolStatus: (tool) => {
                setStreamingToolStatus(tool);
              },
              onDone: (data) => {
                finalConvId = data.conversation_id;
                finalToolCalls = data.tool_calls;
              },
              onError: (error) => {
                // Server-side error event — treat as terminal, no retry.
                // If text was already streaming, append the error to it so
                // we don't create a duplicate assistant message.
                const partial = streamingContentRef.current;
                if (partial) {
                  streamingContentRef.current = partial + `\n\n---\n**Error:** ${error}`;
                  setStreamingContent(streamingContentRef.current);
                } else {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `Sorry, I encountered an error: ${error}` },
                  ]);
                  streamingContentRef.current = "";
                }
              },
            },
            controller.signal
          );
          break; // success — exit retry loop
        } catch (err: unknown) {
          // User clicked Stop — never retry
          if (err instanceof DOMException && err.name === "AbortError") throw err;

          // If text was already streaming, don't retry (partial output visible)
          if (streamingContentRef.current.length > 0) throw err;

          lastError = err;

          if (attempt < MAX_ATTEMPTS) {
            const delayMs = Math.pow(2, attempt - 1) * 1000; // 1 s, 2 s
            setStreamingToolStatus(`Connection issue — retrying (${attempt}/${MAX_ATTEMPTS - 1})…`);
            await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // All retries exhausted
      if (lastError) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${lastError instanceof Error ? lastError.message : "Failed to get response after multiple attempts. Please try again."}`,
          },
        ]);
        streamingContentRef.current = "";
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        // Unexpected throw (e.g. mid-stream network drop after text started)
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}` },
        ]);
        streamingContentRef.current = "";
      }
      // AbortError = user clicked Stop — fall through to finally to commit partial text
    } finally {
      const content = streamingContentRef.current;
      if (content) {
        // Commit whatever was streamed (full response or partial if stopped early)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content,
            tool_calls: finalToolCalls?.length ? finalToolCalls : undefined,
          },
        ]);
      }
      if (finalConvId) setConversationId(finalConvId);
      streamingContentRef.current = "";
      setStreamingContent("");
      setStreamingToolStatus(null);
      abortControllerRef.current = null;
      setLoading(false);
      loadConversations();
    }
  }, [input, loading, conversationId, attachments]);

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

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
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

  const getIntegrationAccentStyle = (color: string) => ({
    color,
    backgroundColor: `${color}12`,
    borderColor: `${color}24`,
  });



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
                <p className="text-sm font-semibold text-brand-navy truncate">TechYard AI</p>
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
            {activeIntegrations.map((integ) => {
              const canDisconnect = integ.oauthRequired && role === "admin";
              return (
                <div
                  key={integ.id}
                  className="group mb-2 flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white px-3 py-3 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] transition hover:border-gray-300/80 hover:shadow-[0_16px_32px_-24px_rgba(15,23,42,0.45)]"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-base"
                    style={getIntegrationAccentStyle(integ.color)}
                  >
                    {integ.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-navy">{integ.name}</p>
                    <p className="text-[11px] text-gray-500">Connected and ready</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                    {canDisconnect && (
                      <button
                        title="Disconnect"
                        onClick={async () => {
                          if (!confirm(`Disconnect ${integ.name} from ${department}?`)) return;
                          try {
                            if (integ.connectType === "slack") await api.disconnectDepartmentSlack(department);
                            else if (integ.connectType === "gmail" || integ.connectType === "outlook") await api.disconnectDepartmentEmail(department);
                            else if (integ.connectType === "quickbooks") await api.disconnectDepartmentQuickBooks(department);
                            setIntegrations((prev) => prev.map((i) => i.id === integ.id && i.department === integ.department ? { ...i, active: false, connected: false } : i));
                          } catch { /* ignore */ }
                        }}
                        className="rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Not connected */}
            {lockedIntegrations.map((integ) => {
              const canConnect = integ.oauthRequired && role === "admin";
              return (
                <div key={integ.id} className="mb-1">
                  {canConnect ? (
                    <button
                      onClick={async () => {
                        try {
                          if (integ.connectType === "slack") {
                            const { auth_url } = await api.connectDepartmentSlack(department);
                            window.location.href = auth_url;
                          } else if (integ.connectType === "gmail" || integ.connectType === "outlook") {
                            const { auth_url } = await api.connectDepartmentEmail(department, integ.connectType);
                            window.location.href = auth_url;
                          } else if (integ.connectType === "quickbooks") {
                            const { auth_url } = await api.connectDepartmentQuickBooks(department);
                            window.location.href = auth_url;
                          }
                        } catch { /* ignore */ }
                      }}
                      className="group mb-2 flex w-full items-center gap-3 rounded-2xl border border-gray-200/80 bg-white px-3 py-3 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)] transition hover:border-brand-teal/30 hover:bg-brand-teal/[0.02] hover:shadow-[0_16px_32px_-24px_rgba(15,23,42,0.35)]"
                    >
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-base transition group-hover:border-brand-teal/20"
                        style={getIntegrationAccentStyle(integ.color)}
                      >
                        {integ.icon}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-gray-700 group-hover:text-brand-navy transition">{integ.name}</p>
                        <p className="text-[11px] text-gray-500">Not connected</p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-brand-teal/15 bg-brand-teal px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition group-hover:bg-brand-navy">
                        Connect
                      </span>
                    </button>
                  ) : (
                    <div className="mb-2 flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-gray-50/70 px-3 py-3">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-base opacity-65"
                        style={getIntegrationAccentStyle(integ.color)}
                      >
                        {integ.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-500">{integ.name}</span>
                        <span className="text-[11px] text-gray-400">Not connected</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        Offline
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
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
              {department === "logistics" ? (
                <LogisticsWelcome onSend={handleSend} />
              ) : quickPrompts.length > 0 && (
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
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* ── Streaming text (chunks arriving) ── */}
            {loading && streamingContent && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[90%]">
                  <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 172 172" fill="none">
                      <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
                    </svg>
                  </div>
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
                            <h1 className="text-lg font-bold text-brand-navy flex items-center gap-2" {...props}>{children}</h1>
                          ),
                          h2: ({ children, ...props }) => (
                            <h2 className="text-base font-bold text-brand-navy flex items-center gap-2 mt-4 mb-2" {...props}>{children}</h2>
                          ),
                          h3: ({ children, ...props }) => (
                            <h3 className="text-sm font-bold text-brand-navy mt-3 mb-1" {...props}>{children}</h3>
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
                          hr: () => <hr className="my-3 border-gray-200/60" />,
                        }}
                      >
                        {streamingContent}
                      </ReactMarkdown>
                      {/* Blinking cursor to indicate text is still arriving */}
                      <span className="inline-block w-[2px] h-[1em] bg-brand-teal ml-0.5 animate-pulse align-middle rounded-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Waiting indicator (before first chunk, or during tool execution) ── */}
            {loading && !streamingContent && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 172 172" fill="none">
                      <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200/60 px-5 py-4 text-sm shadow-sm">
                    {streamingToolStatus ? (
                      /* Tool execution status */
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse flex-shrink-0" />
                        <span className="text-gray-500 text-xs">
                          Using {streamingToolStatus.replace(/_/g, " ")}…
                        </span>
                      </div>
                    ) : (
                      /* Bouncing dots while waiting for first token */
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-gray-400 text-xs">Analyzing your request…</span>
                      </div>
                    )}
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
            {/* Attachment preview chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {attachments.map((att) => (
                  <span key={att.file_id} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-teal/10 border border-brand-teal/20 px-3 py-1.5 text-xs text-brand-navy">
                    <svg className="w-3.5 h-3.5 text-brand-teal" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {att.filename}
                    <span className="text-gray-400 text-[10px]">({(att.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => removeAttachment(att.file_id)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              accept=".txt,.csv,.json,.xml,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.md,.log,.yaml,.yml"
            />
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus-within:border-brand-teal/40 focus-within:shadow-lg focus-within:shadow-brand-navy/5 transition-all">
              {/* Sparkle icon */}
              <svg className="w-5 h-5 text-brand-teal/60 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12" />
              </svg>
              {/* Attachment button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-gray-400 hover:text-brand-teal hover:bg-brand-teal/5 transition-all"
                title="Attach file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
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
              TechYard AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
