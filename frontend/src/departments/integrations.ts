import type { Integration } from "./types";

export function getIntegrations(userDept: string): Integration[] {
  const all: Integration[] = [
    // ── Logistics ──────────────────────────────────────────────────────
    { id: "fleethunt",  name: "FleetHunt",    icon: "🗺️", active: true,  department: "logistics",  connected: true,  color: "#557C93" },
    { id: "samsara",    name: "Samsara",      icon: "📡", active: true,  department: "logistics",  connected: true,  color: "#14b8a6" },
    { id: "gmail",      name: "Gmail",        icon: "✉️", active: false, department: "logistics",  connected: false, color: "#EA4335", oauthRequired: true, connectType: "gmail"   },
    { id: "outlook",    name: "Outlook",      icon: "📧", active: false, department: "logistics",  connected: false, color: "#0078D4", oauthRequired: true, connectType: "outlook" },
    { id: "slack",      name: "Slack",        icon: "💬", active: false, department: "logistics",  connected: false, color: "#4A154B", oauthRequired: true, connectType: "slack"   },

    // ── Restaurant ─────────────────────────────────────────────────────
    { id: "restaurant-pos", name: "Restaurant POS", icon: "🖥️", active: true,  department: "restaurant", connected: true,  color: "#f97316" },
    { id: "gmail",          name: "Gmail",          icon: "✉️", active: false, department: "restaurant", connected: false, color: "#EA4335", oauthRequired: true, connectType: "gmail"   },
    { id: "outlook",        name: "Outlook",        icon: "📧", active: false, department: "restaurant", connected: false, color: "#0078D4", oauthRequired: true, connectType: "outlook" },
    { id: "slack",          name: "Slack",          icon: "💬", active: false, department: "restaurant", connected: false, color: "#4A154B", oauthRequired: true, connectType: "slack"   },

    // ── Finance ────────────────────────────────────────────────────────
    { id: "quickbooks", name: "QuickBooks", icon: "📊", active: false, department: "finance", connected: false, color: "#2CA01C", oauthRequired: true, connectType: "quickbooks" },
    { id: "gmail",      name: "Gmail",      icon: "✉️", active: false, department: "finance", connected: false, color: "#EA4335", oauthRequired: true, connectType: "gmail"   },
    { id: "outlook",    name: "Outlook",    icon: "📧", active: false, department: "finance", connected: false, color: "#0078D4", oauthRequired: true, connectType: "outlook" },
    { id: "slack",      name: "Slack",      icon: "💬", active: false, department: "finance", connected: false, color: "#4A154B", oauthRequired: true, connectType: "slack"   },

    // ── Accounting ─────────────────────────────────────────────────────
    { id: "quickbooks", name: "QuickBooks", icon: "📊", active: false, department: "accounting", connected: false, color: "#2CA01C", oauthRequired: true, connectType: "quickbooks" },
    { id: "gmail",      name: "Gmail",      icon: "✉️", active: false, department: "accounting", connected: false, color: "#EA4335", oauthRequired: true, connectType: "gmail"   },
    { id: "outlook",    name: "Outlook",    icon: "📧", active: false, department: "accounting", connected: false, color: "#0078D4", oauthRequired: true, connectType: "outlook" },
    { id: "slack",      name: "Slack",      icon: "💬", active: false, department: "accounting", connected: false, color: "#4A154B", oauthRequired: true, connectType: "slack"   },

    // ── Sales ──────────────────────────────────────────────────────────
    { id: "gmail",      name: "Gmail",       icon: "✉️", active: false, department: "sales", connected: false, color: "#EA4335", oauthRequired: true, connectType: "gmail"   },
    { id: "outlook",    name: "Outlook",     icon: "📧", active: false, department: "sales", connected: false, color: "#0078D4", oauthRequired: true, connectType: "outlook" },
    { id: "slack",      name: "Slack",       icon: "💬", active: false, department: "sales", connected: false, color: "#4A154B", oauthRequired: true, connectType: "slack"   },
  ];

  return all
    .filter((integ) => integ.department === userDept)
    .map((integ) => ({ ...integ, active: integ.connected }));
}
