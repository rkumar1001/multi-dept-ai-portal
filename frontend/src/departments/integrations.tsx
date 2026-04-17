import type { Integration } from "./types";

export function getIntegrations(userDept: string): Integration[] {
  const all: Integration[] = [
    // ── Logistics ────────────────────────────────────────────────────────────
    {
      id: "fleethunt",
      name: "FleetHunt",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
      active: false,
      department: "logistics",
      connected: true,
      color: "#557C93",
    },
    {
      id: "samsara",
      name: "Samsara",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
      active: false,
      department: "logistics",
      connected: true,
      color: "#14b8a6",
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

    // ── Restaurant ───────────────────────────────────────────────────────────
    {
      id: "restaurant-pos",
      name: "Restaurant POS",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" /></svg>,
      active: false,
      department: "restaurant",
      connected: true,
      color: "#f97316",
    },

    // ── Finance ──────────────────────────────────────────────────────────────
    {
      id: "quickbooks",
      name: "QuickBooks",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
      active: false,
      department: "__all__",
      connected: false,
      color: "#22c55e",
      oauthRequired: true,
      connectType: "quickbooks",
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

    // ── Shared (all departments) ──────────────────────────────────────────────
    {
      id: "slack",
      name: "Slack",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" /></svg>,
      active: false,
      department: "__all__",
      connected: false,
      color: "#4A154B",
      oauthRequired: true,
      connectType: "slack",
    },
    {
      id: "gmail",
      name: "Gmail",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" /></svg>,
      active: false,
      department: "__all__",
      connected: false,
      color: "#EA4335",
      oauthRequired: true,
      connectType: "gmail",
    },
    {
      id: "outlook",
      name: "Outlook",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 01-.587.234h-8.55v-6.91l1.904 1.39a.31.31 0 00.36 0l6.873-4.862a.637.637 0 01.238.094zm0-1.39a1.216 1.216 0 00-.476-.452 1.39 1.39 0 00-.71-.195h-8.55v-.825L24 5.997zM14.625 21.675V24H.863A.863.863 0 010 23.137v-.6l7.313-4.387 1.42.863 5.892-4.3v6.962zM14.625 0v2.325L13.5 3 0 11.325V5.457c0-.226.08-.418.238-.573A.806.806 0 01.825 4.65h13.8zM9.75 7.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM7.5 7.5c0-.756-.244-1.393-.731-1.913S5.706 4.875 4.875 4.875s-1.506.237-2.006.712S2.25 6.744 2.25 7.5s.213 1.387.619 1.894.944.756 1.631.756c.688 0 1.256-.244 1.744-.731S7.5 8.256 7.5 7.5z" /></svg>,
      active: false,
      department: "__all__",
      connected: false,
      color: "#0078D4",
      oauthRequired: true,
      connectType: "outlook",
    },
    {
      id: "gohighlevel",
      name: "GoHighLevel",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 110 14A7 7 0 0112 5zm0 2a5 5 0 100 10A5 5 0 0012 7zm0 2a3 3 0 110 6 3 3 0 010-6z"/></svg>,
      active: false,
      department: "__all__",
      connected: false,
      color: "#F97316",
      oauthRequired: true,
      connectType: "ghl",
    },
  ];

  // Hide OAuth integrations that aren't connected yet (for demo purposes)
  const hideUnconnectedOAuth = ["slack", "quickbooks"];

  return all
    .filter((integ) => integ.department === userDept || integ.department === "__all__")
    .filter((integ) => !hideUnconnectedOAuth.includes(integ.id)) // Hide Slack & QuickBooks for demo
    .map((integ) => ({
      ...integ,
      active: integ.connected,
    }));
}