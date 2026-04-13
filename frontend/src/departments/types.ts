import type React from "react";

export interface DashboardKPI {
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface DashboardData {
  title: string;
  badge: string;
  kpis: DashboardKPI[];
  segments: ChartSegment[];
  tables: { rows: Record<string, unknown>[] }[];
  followUps: string[];
}

export interface QuickPrompt {
  icon: string;
  label: string;
  description: string;
  prompt: string;
}

export interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  active: boolean;
  department: string;
  connected: boolean;
  color: string;
  oauthRequired?: boolean;  // true = needs admin OAuth (Slack, Email, QuickBooks)
  connectType?: "slack" | "gmail" | "outlook" | "quickbooks";
}