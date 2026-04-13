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
  /** True while this message is still being streamed in */
  isStreaming?: boolean;
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


