"use client";

import { useState } from "react";
import Link from "next/link";

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  features: string[];
  popular?: boolean;
}

const SERVICES: ServiceItem[] = [
  {
    id: "logistics-ai",
    name: "Logistics AI",
    category: "Fleet & Transport",
    description:
      "Real-time fleet tracking, route optimization, speeding alerts, and geofence monitoring — all accessible via natural language queries.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    color: "text-brand-teal",
    bgColor: "bg-brand-teal/10",
    features: [
      "FleetHunt GPS Integration",
      "Samsara ELD Support",
      "Real-time Vehicle Tracking",
      "Speeding & Idle Alerts",
      "Geofence Monitoring",
      "Route Analytics",
    ],
    popular: true,
  },
  {
    id: "restaurant-ai",
    name: "Restaurant AI",
    category: "Food & Hospitality",
    description:
      "Menu management, order analytics, inventory forecasting, and customer insights — streamline your restaurant operations with AI.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
      </svg>
    ),
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    features: [
      "Menu Management AI",
      "Order Analytics",
      "Inventory Forecasting",
      "Customer Insights",
      "Dietary Filter Search",
      "Revenue Analytics",
    ],
  },
  {
    id: "finance-ai",
    name: "Finance AI",
    category: "Financial Operations",
    description:
      "Cash flow forecasting, compliance checks, budget analysis, and financial reporting — powered by AI for faster decisions.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    features: [
      "Cash Flow Forecasting",
      "QuickBooks Integration",
      "Budget vs Actuals",
      "Tax Compliance",
      "Expense Analytics",
      "Financial Reports",
    ],
  },
  {
    id: "accounting-ai",
    name: "Accounting AI",
    category: "Bookkeeping & Tax",
    description:
      "Automated invoice processing, reconciliation, expense categorization, and tax calculations with conversational AI.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    features: [
      "Invoice Processing",
      "Auto Reconciliation",
      "Expense Categories",
      "Tax Calculations",
      "Aging Reports",
      "GL Account Overview",
    ],
  },
  {
    id: "sales-ai",
    name: "Sales AI",
    category: "CRM & Pipeline",
    description:
      "Pipeline management, lead scoring, deal forecasting, and CRM intelligence — close deals faster with AI-driven insights.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      "Pipeline Analytics",
      "Lead Scoring",
      "Deal Forecasting",
      "Email Integration",
      "CRM Intelligence",
      "Win Rate Analysis",
    ],
  },
];

export default function ServicesPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 172 172" fill="none">
                <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-lg font-bold text-brand-navy">TechYard Systems</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-navy/20 hover:shadow-xl transition-all"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/10 px-4 py-1.5 text-sm font-medium text-brand-teal mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
            </svg>
            AI Service Catalog
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-navy mb-4 tracking-tight">
            Choose Your AI Integration
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Each service connects your existing tools to our AI engine. Ask questions in plain English and get real-time insights.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((svc) => (
            <div
              key={svc.id}
              onMouseEnter={() => setHoveredId(svc.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative group rounded-2xl bg-white/80 backdrop-blur-sm border p-8 transition-all duration-300 ${
                hoveredId === svc.id
                  ? "border-brand-teal/30 shadow-2xl shadow-brand-navy/10 -translate-y-1"
                  : "border-gray-200/60 shadow-sm"
              }`}
            >
              {svc.popular && (
                <div className="absolute -top-3 right-6 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-md">
                  Most Popular
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl ${svc.bgColor} flex items-center justify-center ${svc.color} mb-5`}>
                {svc.icon}
              </div>

              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {svc.category}
              </span>
              <h3 className="text-xl font-bold text-brand-navy mt-1 mb-3">{svc.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                {svc.description}
              </p>

              {/* Features list */}
              <ul className="space-y-2 mb-6">
                {svc.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-brand-teal flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={`/services/${svc.id}`}
                className={`block w-full text-center rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${
                  svc.popular
                    ? "bg-brand-gradient text-white shadow-lg shadow-brand-navy/20 hover:shadow-xl"
                    : "bg-gray-100 text-brand-navy hover:bg-brand-teal/10"
                }`}
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 py-8 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 opacity-60">
            <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 172 172" fill="none">
                <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-brand-navy">TechYard Systems</span>
          </Link>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} TechYard Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
