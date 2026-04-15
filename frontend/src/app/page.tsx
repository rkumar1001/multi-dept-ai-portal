"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── TechYard Systems Logo (inline SVG) ────────────────────────────────────── */
function TechYardLogo({ className = "h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 720 172" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tyGrad" x1="0" y1="0" x2="172" y2="172" gradientUnits="userSpaceOnUse">
          <stop stopColor="#557C93" />
          <stop offset="1" stopColor="#08203E" />
        </linearGradient>
      </defs>
      <rect width="172" height="172" rx="40" fill="url(#tyGrad)" />
      <path d="M42 52H130V72H96V132H76V72H42V52Z" fill="white" />
      <text x="192" y="105" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="68" fill="#08203E">TECHYARD</text>
      <text x="192" y="155" fontFamily="Inter, sans-serif" fontWeight="400" fontSize="40" letterSpacing="10" fill="#557C93">SYSTEMS</text>
    </svg>
  );
}

/* ── Feature cards data ─────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: "AI-Powered Insights",
    desc: "Natural language queries across all your business integrations",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Multi-Integration Hub",
    desc: "FleetHunt, Samsara, QuickBooks and more — one dashboard",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Enterprise Security",
    desc: "Role-based access, encrypted data, and audit logging",
  },
];

export default function Home() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/chat");
      return;
    }
    setLoaded(true);
  }, [router]);

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="animate-pulse text-lg text-brand-teal">Loading...</div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-mesh overflow-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <TechYardLogo className="h-9" />
          <div className="flex items-center gap-3">
            <Link
              href="/services"
              className="rounded-lg px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-teal/10 transition"
            >
              Explore Services
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-navy/20 hover:shadow-xl hover:shadow-brand-navy/30 transition-all duration-300"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Decorative blobs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-brand-teal/5 blur-3xl -z-10 animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-navy/5 blur-3xl -z-10" />

        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Copy */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/10 px-4 py-1.5 text-sm font-medium text-brand-teal mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                AI-Powered Business Intelligence
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-brand-navy mb-6">
                Your Business,{" "}
                <span className="text-brand-gradient">Supercharged</span>{" "}
                with AI
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-lg mb-10">
                Connect your fleet, restaurant, and operations tools to a single 
                AI-powered dashboard. Ask questions in plain English and get 
                instant insights from all your integrations.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-navy/25 hover:shadow-xl hover:shadow-brand-navy/35 transition-all duration-300"
                >
                  Get Started
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-navy/15 px-7 py-3.5 text-base font-semibold text-brand-navy hover:border-brand-teal/40 hover:bg-brand-teal/5 transition-all duration-300"
                >
                  Explore Services
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  Real-time Data
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  Multi-Department
                </div>
              </div>
            </div>

            {/* Right — Dashboard Preview Card */}
            <div className="animate-slide-up">
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-4 rounded-3xl bg-brand-gradient opacity-10 blur-2xl" />
                {/* Card */}
                <div className="relative rounded-2xl bg-white shadow-2xl shadow-brand-navy/10 border border-gray-200/60 overflow-hidden">
                  {/* Fake browser bar */}
                  <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4 rounded-md bg-gray-200/60 px-3 py-1 text-xs text-gray-400 font-mono">
                      app.techyard.systems/chat
                    </div>
                  </div>
                  {/* Mini chat UI */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white text-xs font-bold">T</div>
                      <span className="text-sm font-semibold text-brand-navy">TechYard AI</span>
                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Online</span>
                    </div>
                    {/* Fake msgs */}
                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-br-md bg-brand-gradient text-white text-sm px-4 py-2.5 max-w-[75%]">
                        Show me all vehicles currently moving
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md bg-gray-100 text-gray-800 text-sm px-4 py-2.5 max-w-[85%]">
                        <p className="font-medium mb-1">Found 12 vehicles in motion:</p>
                        <div className="grid grid-cols-3 gap-1 text-xs text-gray-500 mt-2">
                          <span className="bg-white rounded px-2 py-1">🚛 TRK-001</span>
                          <span className="bg-white rounded px-2 py-1">🚛 TRK-004</span>
                          <span className="bg-white rounded px-2 py-1">🚛 TRK-007</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12" />
                      </svg>
                      Ask anything about your fleet...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-brand-navy mb-3">
              Everything you need, one AI away
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Combine the power of your existing tools with conversational AI for faster decisions
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-8 hover:shadow-xl hover:shadow-brand-navy/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-brand-navy mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="rounded-3xl bg-brand-gradient p-12 lg:p-16 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to transform your operations?
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">
                Start using TechYard AI to streamline your daily operations.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-navy hover:bg-gray-100 transition shadow-lg"
                >
                  Start Now
                </Link>
                <Link
                  href="/services"
                  className="rounded-xl border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition"
                >
                  View Services
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200/60 py-8 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <TechYardLogo className="h-7 opacity-60" />
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} TechYard Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
