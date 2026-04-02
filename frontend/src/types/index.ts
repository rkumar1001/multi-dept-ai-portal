export interface User {
  id: string;
  email: string;
  full_name: string;
  department: "sales" | "finance" | "accounting" | "restaurant" | "logistics";
  role: "user" | "dept_admin" | "admin";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  department: string;
  role: string;
  full_name: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: Record<string, unknown>[] | null;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  department: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  department: string;
  messages: ChatMessage[];
  created_at: string;
}

export interface DepartmentUsage {
  department: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tool_calls: number;
  total_requests: number;
  period: string;
}

export interface BudgetConfig {
  department: string;
  monthly_token_limit: number;
  monthly_tool_call_limit: number;
  max_concurrent_users: number;
  alert_threshold_pct: number;
  current_token_usage: number;
  current_tool_call_usage: number;
  usage_pct: number;
}

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

export interface QuickPrompt {
  icon: string;
  label: string;
  description: string;
  prompt: string;
}

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
    { icon: "📍", label: "Find Nearby", description: "Vehicles near a location", prompt: "Find all vehicles within 10 km of downtown Toronto (43.65, -79.38)." },
    { icon: "⚡", label: "Speeding Alerts", description: "Vehicles over speed limit", prompt: "Show me any vehicles currently exceeding 100 km/h." },
  ],
};
