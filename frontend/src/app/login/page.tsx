"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DEPARTMENT_CONFIG } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("sales");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = isRegister
        ? await api.register({ email, password, full_name: fullName, department })
        : await api.login(email, password);

      localStorage.setItem("token", res.access_token);
      localStorage.setItem("department", res.department);
      localStorage.setItem("role", res.role);
      localStorage.setItem("fullName", res.full_name);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Agent Portal</h1>
          <p className="mt-2 text-gray-600">
            Multi-Department AI Assistant for Sales, Finance, Accounting &amp; Restaurant
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                !isRegister ? "bg-white shadow text-gray-900" : "text-gray-500"
              }`}
              onClick={() => setIsRegister(false)}
            >
              Sign In
            </button>
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                isRegister ? "bg-white shadow text-gray-900" : "text-gray-500"
              }`}
              onClick={() => setIsRegister(true)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {Object.entries(DEPARTMENT_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDepartment(key)}
                      className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition ${
                        department === key
                          ? `border-current ${cfg.color} ${cfg.bgColor}`
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <span className="block text-lg">{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
