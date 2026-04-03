"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ── Service Data ───────────────────────────────────────────────────── */
interface ServiceData {
  name: string;
  category: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  bgColor: string;
  features: string[];
  integrations: { name: string; logo: string; desc: string }[];
  price: string;
  period: string;
  credentials: { email: string; password: string };
}

const SERVICE_DATA: Record<string, ServiceData> = {
  "logistics-ai": {
    name: "Logistics AI",
    category: "Fleet & Transport",
    description: "Real-time fleet tracking, route optimization, speeding alerts, and geofence monitoring.",
    longDescription:
      "Our Logistics AI connects directly to FleetHunt and Samsara to provide real-time GPS tracking, driver behavior analytics, and automated alerts. Ask questions in plain English like 'Show me all vehicles near Toronto' or 'Which trucks are speeding right now?' and get instant, accurate results from your actual fleet data.",
    icon: "🚛",
    color: "text-brand-teal",
    bgColor: "bg-brand-teal/10",
    features: [
      "FleetHunt GPS API integration with 10+ query tools",
      "Real-time vehicle location & status tracking",
      "Speed monitoring with configurable thresholds",
      "Geofence proximity search (find nearby vehicles)",
      "Driver behavior & idle time analytics",
      "Fleet summary with movement statistics",
      "Natural language queries — no dashboard needed",
      "Conversation history & context memory",
    ],
    integrations: [
      { name: "FleetHunt", logo: "🗺️", desc: "GPS fleet tracking" },
      { name: "Samsara", logo: "📡", desc: "ELD & telematics" },
      { name: "Highway", logo: "🛣️", desc: "Carrier compliance" },
      { name: "Triumph", logo: "💳", desc: "Factoring & payments" },
    ],
    price: "$299",
    period: "/month",
    credentials: { email: "admin1@gmail.com", password: "admin" },
  },
  "restaurant-ai": {
    name: "Restaurant AI",
    category: "Food & Hospitality",
    description: "Menu management, order analytics, inventory forecasting, and customer insights.",
    longDescription:
      "Restaurant AI connects to your POS and ordering systems to provide instant menu insights, order analytics, and inventory management. Ask 'What are our most popular dishes?' or 'Show me all vegan options' and get structured data with pricing and analytics.",
    icon: "🍽️",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    features: [
      "Full menu browsing with category filters",
      "Dietary preference search (vegan, gluten-free, etc.)",
      "Order history & analytics dashboard",
      "Revenue tracking by item and category",
      "Popular dishes ranking",
      "Real-time inventory alerts",
      "Natural language menu queries",
      "Customer insights & trends",
    ],
    integrations: [
      { name: "POS System", logo: "🖥️", desc: "Point of sale" },
      { name: "DoorDash", logo: "🚗", desc: "Delivery platform" },
      { name: "OpenTable", logo: "📅", desc: "Reservations" },
      { name: "QuickBooks", logo: "📊", desc: "Accounting" },
    ],
    price: "$199",
    period: "/month",
    credentials: { email: "admin@gmail.com", password: "admin" },
  },
  "finance-ai": {
    name: "Finance AI",
    category: "Financial Operations",
    description: "Cash flow forecasting, compliance checks, budget analysis, and financial reporting.",
    longDescription:
      "Finance AI integrates with your accounting software to provide real-time financial insights. Generate cash flow forecasts, run compliance checks, compare budget vs actuals, and get GL account summaries — all through simple English queries.",
    icon: "💰",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    features: [
      "30/60/90 day cash flow projections",
      "Budget vs actual comparison",
      "GL account balance summaries",
      "Regulatory compliance monitoring",
      "Revenue trend analysis",
      "Cost center breakdowns",
      "Automated financial reports",
      "QuickBooks integration",
    ],
    integrations: [
      { name: "QuickBooks", logo: "📊", desc: "Accounting" },
      { name: "Stripe", logo: "💳", desc: "Payments" },
      { name: "Plaid", logo: "🏦", desc: "Banking" },
      { name: "Xero", logo: "📒", desc: "Bookkeeping" },
    ],
    price: "$249",
    period: "/month",
    credentials: { email: "finance@demo.com", password: "admin" },
  },
  "accounting-ai": {
    name: "Accounting AI",
    category: "Bookkeeping & Tax",
    description: "Automated invoice processing, reconciliation, expense categorization, and tax calculations.",
    longDescription:
      "Accounting AI automates your bookkeeping workflows. From invoice aging to tax calculations, reconciliations to expense categorization — get instant answers to complex accounting questions without digging through spreadsheets.",
    icon: "📒",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    features: [
      "Invoice aging & overdue tracking",
      "Automated account reconciliation",
      "Expense categorization engine",
      "Quarterly tax estimation",
      "Accounts receivable/payable tracking",
      "Financial discrepancy detection",
      "Categorized expense reports",
      "GL overview & deep dives",
    ],
    integrations: [
      { name: "QuickBooks", logo: "📊", desc: "Accounting" },
      { name: "Bill.com", logo: "📄", desc: "AP automation" },
      { name: "Expensify", logo: "🧾", desc: "Expense mgmt" },
      { name: "Gusto", logo: "👥", desc: "Payroll" },
    ],
    price: "$199",
    period: "/month",
    credentials: { email: "accounting@demo.com", password: "admin" },
  },
  "sales-ai": {
    name: "Sales AI",
    category: "CRM & Pipeline",
    description: "Pipeline management, lead scoring, deal forecasting, and CRM intelligence.",
    longDescription:
      "Sales AI connects to your CRM to provide real-time pipeline analytics, lead prioritization, and deal forecasting. Ask 'Show me top deals this quarter' or 'Which leads need follow-up?' and make data-driven decisions instantly.",
    icon: "📊",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      "Pipeline analytics & stage tracking",
      "Lead scoring & prioritization",
      "Win probability forecasting",
      "Email follow-up reminders",
      "Competitive intelligence",
      "Revenue projection models",
      "CRM data queries in English",
      "Deal velocity tracking",
    ],
    integrations: [
      { name: "Salesforce", logo: "☁️", desc: "CRM" },
      { name: "HubSpot", logo: "🔶", desc: "Marketing" },
      { name: "Gmail", logo: "📧", desc: "Email" },
      { name: "LinkedIn", logo: "💼", desc: "Social selling" },
    ],
    price: "$249",
    period: "/month",
    credentials: { email: "sales@demo.com", password: "admin" },
  },
};

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const service = SERVICE_DATA[id];
  const [purchased, setPurchased] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [step, setStep] = useState<"select" | "buying" | "done">("select");
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);

  if (!service) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-navy mb-2">Service Not Found</h1>
          <Link href="/services" className="text-brand-teal hover:underline">
            ← Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const handleBuy = async () => {
    setProcessing(true);
    setStep("buying");
    // Simulate purchase processing
    await new Promise((r) => setTimeout(r, 2000));
    setPurchased(true);
    setProcessing(false);
    setStep("done");
  };

  const toggleIntegration = (name: string) => {
    setSelectedIntegrations((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleCopy = (text: string, field: "email" | "password") => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

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
            <span className="text-lg font-bold text-brand-navy">VRTek Consulting</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/services"
              className="rounded-lg px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-teal/10 transition"
            >
              All Services
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-navy/20"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
            <Link href="/services" className="hover:text-brand-teal transition">Services</Link>
            <span>/</span>
            <span className="text-brand-navy font-medium">{service.name}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left — Detail */}
            <div className="lg:col-span-2 space-y-8 animate-fade-in">
              {/* Header */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl ${service.bgColor} flex items-center justify-center text-3xl`}>
                    {service.icon}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {service.category}
                    </span>
                    <h1 className="text-3xl font-bold text-brand-navy">{service.name}</h1>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {service.longDescription}
                </p>
              </div>

              {/* Features */}
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-8">
                <h2 className="text-lg font-bold text-brand-navy mb-5">What&apos;s Included</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {service.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-teal/5 transition">
                      <svg className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-8">
                <h2 className="text-lg font-bold text-brand-navy mb-5">Connected Integrations</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {service.integrations.map((integ, i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                      <span className="text-2xl block mb-2">{integ.logo}</span>
                      <p className="text-sm font-semibold text-brand-navy">{integ.name}</p>
                      <p className="text-xs text-gray-400">{integ.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Pricing Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 rounded-2xl bg-white border border-gray-200/60 shadow-xl shadow-gray-200/40 overflow-hidden animate-slide-up">
                {/* Price Header */}
                <div className="bg-brand-gradient p-6 text-center">
                  <p className="text-white/60 text-sm mb-1">Starting at</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-white">{service.price}</span>
                    <span className="text-white/60">{service.period}</span>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {step === "select" && (
                    <>
                      {/* Integration selection */}
                      <div>
                        <h3 className="text-sm font-semibold text-brand-navy mb-3">Select Integrations to Connect</h3>
                        <div className="space-y-2">
                          {service.integrations.map((integ, i) => {
                            const selected = selectedIntegrations.includes(integ.name);
                            return (
                              <button
                                key={i}
                                onClick={() => toggleIntegration(integ.name)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                                  selected
                                    ? "border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal/20"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <span className="text-xl">{integ.logo}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-brand-navy">{integ.name}</p>
                                  <p className="text-xs text-gray-400">{integ.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  selected ? "border-brand-teal bg-brand-teal" : "border-gray-300"
                                }`}>
                                  {selected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (selectedIntegrations.length === 0) {
                            setSelectedIntegrations(service.integrations.map((i) => i.name));
                          }
                          handleBuy();
                        }}
                        className="w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-navy/20 hover:shadow-xl transition-all duration-300"
                      >
                        {selectedIntegrations.length > 0
                          ? `Buy Plan with ${selectedIntegrations.length} Integration${selectedIntegrations.length > 1 ? "s" : ""}`
                          : "Buy Plan with All Integrations"}
                      </button>

                      <p className="text-xs text-gray-400 text-center">
                        30-day money-back guarantee
                      </p>
                    </>
                  )}

                  {step === "buying" && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <svg className="w-8 h-8 animate-spin text-brand-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="text-sm font-medium text-brand-navy">Setting up your integrations...</p>
                      <p className="text-xs text-gray-400">This will only take a moment</p>
                    </div>
                  )}

                  {step === "done" && (
                    /* ── Credentials Card ── */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold">Purchase Successful!</span>
                      </div>

                      <p className="text-sm text-gray-500">
                        Your credentials for {service.name}:
                      </p>

                      {/* Connected integrations summary */}
                      {selectedIntegrations.length > 0 && (
                        <div className="rounded-lg bg-brand-teal/5 border border-brand-teal/10 p-3">
                          <p className="text-xs font-medium text-brand-teal mb-1.5">Connected Integrations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedIntegrations.map((name) => (
                              <span key={name} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-brand-navy border border-brand-teal/20">
                                ✓ {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-mono text-brand-navy">
                            {service.credentials.email}
                          </div>
                          <button
                            onClick={() => handleCopy(service.credentials.email, "email")}
                            className="rounded-lg p-2.5 text-gray-400 hover:text-brand-teal hover:bg-brand-teal/10 transition"
                          >
                            {copied === "email" ? (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-mono text-brand-navy">
                            {service.credentials.password}
                          </div>
                          <button
                            onClick={() => handleCopy(service.credentials.password, "password")}
                            className="rounded-lg p-2.5 text-gray-400 hover:text-brand-teal hover:bg-brand-teal/10 transition"
                          >
                            {copied === "password" ? (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <Link
                        href="/login"
                        className="block w-full text-center rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-navy/20 hover:shadow-xl transition-all mt-4"
                      >
                        Go to Login →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
