"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { api } from "@/lib/api";
import { ChatMessage, Conversation, DEPARTMENT_CONFIG, DEPARTMENT_PROMPTS } from "@/types";

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

/* ── Dashboard Helpers ─────────────────────────────────────────────────── */

interface KPI { label: string; value: string | number; subtitle?: string; color: string }
interface ChartSegment { label: string; value: number; color: string }
interface DashboardData {
  title: string; badge: string; kpis: KPI[]; segments: ChartSegment[];
  tables: { rows: Record<string, unknown>[] }[]; followUps: string[];
}

function extractDashboardData(toolCalls: Record<string, unknown>[], dept: string): DashboardData {
  const kpis: KPI[] = [];
  const segments: ChartSegment[] = [];
  const tables: { rows: Record<string, unknown>[] }[] = [];
  const followUps: string[] = [];
  let title = "Dashboard";
  let badge = "";

  for (const tc of toolCalls) {
    const tn = (tc.tool as string) || "";
    const out = tc.output as Record<string, unknown> | undefined;
    if (!out) continue;
    const res = (out.results as Record<string, unknown>[]) || [];
    const sum = out.summary as Record<string, unknown> | undefined;

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

  return { title, badge, kpis, segments, tables, followUps };
}

/* ── Donut Chart ──────────────────────────────────────────────────────── */

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

/* ── Dashboard Data Table ─────────────────────────────────────────────── */

function DashboardTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  const fmtH = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const fmtV = (v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number") return v.toLocaleString();
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };
  const display = rows.slice(0, 25);
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
              <p className="text-[10px] text-gray-400">Last updated: {dateStr} &middot; Region: All</p>
            </div>
          </div>
          {data.badge && (
            <span className="text-[11px] font-medium text-brand-teal bg-brand-teal/10 rounded-full px-3 py-1">{data.badge}</span>
          )}
        </div>

        {/* KPI Cards */}
        {data.kpis.length > 0 && (
          <div className="flex border-b border-gray-100">
            {data.kpis.slice(0, 4).map((kpi, i) => (
              <div key={i} className="flex-1 px-4 py-4 text-center border-r last:border-r-0 border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-3xl font-extrabold leading-none" style={{ color: kpi.color }}>{kpi.value}</p>
                {kpi.subtitle && <p className="text-[11px] text-gray-400 mt-1">{kpi.subtitle}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Chart + Insights Row */}
        <div className={`grid ${data.segments.length > 0 ? "md:grid-cols-5" : "grid-cols-1"} border-b border-gray-100`}>
          {data.segments.length > 0 && (
            <div className="md:col-span-2 flex flex-col items-center justify-center p-5 border-r border-gray-100 bg-gray-50/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {department === "logistics" ? "Fleet distribution" : "Distribution"}
              </p>
              <DonutChart segments={data.segments} centerLabel={centerLabel} />
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
              <p className="text-[11px] text-gray-400">Powered by Claude AI</p>
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
