import type { QuickPrompt } from "./types";

export const DEPARTMENT_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  sales: {
    label: "Sales",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: "📊",
  },
  finance: {
    label: "Finance",
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: "💰",
  },
  accounting: {
    label: "Accounting",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: "📒",
  },
  restaurant: {
    label: "Restaurant",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    icon: "🍽️",
  },
  logistics: {
    label: "Logistics",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    icon: "🚛",
  },
};

export const DEPARTMENT_PROMPTS: Record<string, QuickPrompt[]> = {
  sales: [
    { icon: "📈", label: "Pipeline Summary", description: "View current deals and stages", prompt: "Give me a summary of my current sales pipeline with deal stages and values." },
    { icon: "🏆", label: "Top Deals", description: "Highest value opportunities", prompt: "Show me the top deals this quarter by value and their win probability." },
    { icon: "📧", label: "Follow-up Reminders", description: "Pending email follow-ups", prompt: "Search recent email logs and identify contacts that need follow-up." },
    { icon: "🔍", label: "Market Analysis", description: "Competitive intelligence", prompt: "What are the latest market trends and competitive insights for our industry?" },
  ],
  finance: [
    { icon: "💵", label: "Cash Flow Forecast", description: "30-day cash flow projection", prompt: "Generate a cash flow forecast for the next 30 days." },
    { icon: "📊", label: "Revenue vs Budget", description: "Compare actuals to plan", prompt: "Query the ERP for current revenue and compare against our budget targets." },
    { icon: "⚠️", label: "Compliance Check", description: "Regulatory compliance status", prompt: "Run a compliance check across all active financial regulations." },
    { icon: "🏦", label: "GL Account Summary", description: "General ledger overview", prompt: "Show me the general ledger account balances for this quarter." },
  ],
  accounting: [
    { icon: "🧾", label: "Pending Invoices", description: "Overdue and upcoming invoices", prompt: "Query all pending and overdue invoices with aging analysis." },
    { icon: "🔄", label: "Account Reconciliation", description: "Reconcile accounts receivable", prompt: "Reconcile accounts receivable for this month and flag discrepancies." },
    { icon: "💰", label: "Tax Calculation", description: "Estimate tax liability", prompt: "Calculate the estimated tax liability for the current quarter with effective rates." },
    { icon: "📑", label: "Expense Report", description: "Categorized expense summary", prompt: "Show me a categorized breakdown of expenses for the current period." },
  ],
  restaurant: [
    { icon: "📋", label: "Full Menu", description: "Browse The Masala Twist menu", prompt: "Show me the full menu with all categories, items, and prices." },
    { icon: "🌟", label: "Popular Dishes", description: "Customer favorites", prompt: "What are the most popular dishes at The Masala Twist?" },
    { icon: "🥬", label: "Vegan Options", description: "Plant-based menu items", prompt: "Show me all the vegan options on the menu with prices." },
    { icon: "📦", label: "Recent Orders", description: "View latest orders", prompt: "Show me the most recent orders with their details and totals." },
    { icon: "📊", label: "Order Stats", description: "Order analytics", prompt: "Get the order statistics and analytics overview." },
    { icon: "🍗", label: "Chicken Dishes", description: "All chicken curries & tandoori", prompt: "Show me all the chicken dishes including curries and tandoori items." },
  ],
  logistics: [
    { icon: "🗺️", label: "Fleet Overview", description: "All vehicles with live status", prompt: "Give me a summary of the entire fleet — how many vehicles are moving, idle, and stopped?" },
    { icon: "🚗", label: "Moving Vehicles", description: "Currently on the road", prompt: "Show me all vehicles that are currently moving with their speed and location." },
    { icon: "🅿️", label: "Stopped Vehicles", description: "Parked with engine off", prompt: "Show me all vehicles that are currently stopped with their last known locations." },
    { icon: "🔥", label: "Idle Vehicles", description: "Engine on but stationary", prompt: "Which vehicles are currently idle with their engines running? Show locations." },
    { icon: "📍", label: "Find Nearby", description: "Vehicles near a location", prompt: "Find all vehicles within 10 km of downtown Toronto (43.65, -79.38)." },
    { icon: "⚡", label: "Speeding Alerts", description: "Vehicles over speed limit", prompt: "Show me any vehicles currently exceeding 100 km/h." },
    { icon: "🔍", label: "Search Vehicle", description: "Find a specific vehicle", prompt: "Search for vehicle with name containing 'truck' and show its live tracking details." },
    { icon: "📊", label: "Fleet Utilization", description: "Active vs parked ratio", prompt: "What percentage of the fleet is actively being used right now? Break down by moving, idle, and stopped." },
    { icon: "🛣️", label: "Route Activity", description: "Vehicles by region", prompt: "Find all vehicles within 25 km of Montreal (45.50, -73.57) and show their status." },
    { icon: "📋", label: "Full Fleet List", description: "All vehicles with details", prompt: "Show me a complete list of all vehicles with their current status, speed, and last update time." },
  ],
};

/* ── Logistics — Sectioned Dashboard Prompts ─────────────────────────── */

export interface PromptSection {
  id: string;
  label: string;
  icon: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  prompts: QuickPrompt[];
}

export const LOGISTICS_SECTIONS: PromptSection[] = [
  {
    id: "fleethunt",
    label: "FleetHunt",
    icon: "📡",
    accentColor: "#557C93",
    badgeBg: "bg-[#EEF4F7]",
    badgeText: "text-[#557C93]",
    description: "Live GPS tracking & fleet management",
    prompts: [
      { icon: "🗺️", label: "Fleet Overview", description: "All vehicles with live status", prompt: "Give me a summary of the entire fleet — how many vehicles are moving, idle, and stopped?" },
      { icon: "🚗", label: "Moving Vehicles", description: "Currently on the road", prompt: "Show me all vehicles that are currently moving with their speed and location." },
      { icon: "🅿️", label: "Stopped Vehicles", description: "Parked with engine off", prompt: "Show me all vehicles that are currently stopped with their last known locations." },
      { icon: "🔥", label: "Idle Vehicles", description: "Engine on but stationary", prompt: "Which vehicles are currently idle with their engines running? Show locations." },
      { icon: "⚡", label: "Speeding Alerts", description: "Vehicles over speed limit", prompt: "Show me any vehicles currently exceeding 100 km/h." },
      { icon: "📍", label: "Find Nearby", description: "Vehicles near a location", prompt: "Find all vehicles within 10 km of downtown Toronto (43.65, -79.38)." },
      { icon: "🔍", label: "Search Vehicle", description: "Find a specific vehicle", prompt: "Search for a vehicle by name and show its live tracking details." },
      { icon: "📊", label: "Fleet Utilization", description: "Active vs parked ratio", prompt: "What percentage of the fleet is actively being used right now? Break down by moving, idle, and stopped." },
      { icon: "📋", label: "Full Fleet List", description: "All vehicles with details", prompt: "Show me a complete list of all vehicles with their current status, speed, and last update time." },
    ],
  },
  {
    id: "quickbooks",
    label: "QuickBooks",
    icon: "💳",
    accentColor: "#2CA01C",
    badgeBg: "bg-[#F0FAF0]",
    badgeText: "text-[#2CA01C]",
    description: "Financial reporting & accounting",
    prompts: [
      { icon: "📈", label: "Profit & Loss", description: "Income statement this month", prompt: "Generate a Profit & Loss report for this month from QuickBooks." },
      { icon: "🏦", label: "Balance Sheet", description: "Assets, liabilities & equity", prompt: "Show me the Balance Sheet report from QuickBooks." },
      { icon: "💵", label: "Cash Flow", description: "Cash movement overview", prompt: "Generate a Cash Flow statement from QuickBooks." },
      { icon: "🧾", label: "Open Invoices", description: "Unpaid customer invoices", prompt: "List all open and unpaid invoices from QuickBooks with amounts and due dates." },
      { icon: "📦", label: "Vendor Bills", description: "Outstanding bills to pay", prompt: "Show me all outstanding vendor bills from QuickBooks." },
      { icon: "👥", label: "Customer List", description: "All customers in QuickBooks", prompt: "List all customers from QuickBooks." },
      { icon: "📉", label: "AP Aging", description: "Overdue payables report", prompt: "Generate an Accounts Payable Aging report from QuickBooks." },
      { icon: "📋", label: "AR Aging", description: "Overdue receivables report", prompt: "Generate an Accounts Receivable Aging report from QuickBooks." },
      { icon: "🔢", label: "Trial Balance", description: "All account balances", prompt: "Show me the Trial Balance report from QuickBooks." },
    ],
  },
  {
    id: "samsara",
    label: "Samsara",
    icon: "📷",
    accentColor: "#14b8a6",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    description: "Dashcam footage, live shares & driver safety",
    prompts: [
      { icon: "🔴", label: "Live Share Links", description: "Active map sharing links", prompt: "Show me all active Samsara live share links." },
      { icon: "📹", label: "Create Live Share", description: "New fleet map link", prompt: "Create a new Samsara live share link for the entire fleet." },
      { icon: "🎥", label: "Request Dashcam Clip", description: "Retrieve footage by vehicle", prompt: "I need to request a dashcam clip — ask me which vehicle and time range." },
      { icon: "🖥️", label: "Media Library", description: "All uploaded dashcam footage", prompt: "Show me all uploaded dashcam media files in Samsara." },
      { icon: "📸", label: "Check Clip Status", description: "Is my footage ready?", prompt: "Check the status of the most recent dashcam clip retrieval in Samsara." },
      { icon: "🗺️", label: "Live Fleet Map", description: "Real-time vehicle positions", prompt: "Create a Samsara live share link and show me where all vehicles are right now." },
      { icon: "🚨", label: "Safety Alerts", description: "Active safety violations", prompt: "Are there any critical safety alerts or violations from Samsara right now?" },
      { icon: "🛡️", label: "Driver Safety", description: "Safety events & scores", prompt: "Give me a driver safety summary including recent events and safety scores from Samsara." },
      { icon: "📊", label: "Fleet Analytics", description: "Mileage & idle time summary", prompt: "Give me a complete fleet analytics summary including mileage, idle time, and utilization from Samsara." },
    ],
  },
];