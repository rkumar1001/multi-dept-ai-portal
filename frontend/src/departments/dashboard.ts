import type { DashboardData, DashboardKPI, ChartSegment } from "./types";

export function extractDashboardData(
  toolCalls: Record<string, unknown>[],
  dept: string
): DashboardData {
  const kpis: DashboardKPI[] = [];
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
