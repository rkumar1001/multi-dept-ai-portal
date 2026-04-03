"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { extractDashboardData } from "@/departments/dashboard";
import { DonutChart } from "./DonutChart";
import { DashboardTable } from "./DashboardTable";
import { MessageActions } from "./MessageActions";

export function DashboardMessage({ content, toolCalls, department, onFollowUp }: {
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
