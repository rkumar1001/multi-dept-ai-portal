"use client";

export function DashboardTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  const fmtH = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const fmtV = (v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number") return v.toLocaleString();
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };
  const display = rows.slice(0, 25);
  const keys = Object.keys(display[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-brand-navy to-brand-teal">
            {keys.map(k => (
              <th key={k} className="px-3 py-2.5 text-left text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">{fmtH(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {display.map((row, ri) => (
            <tr key={ri} className="hover:bg-brand-teal/[0.03] transition-colors">
              {keys.map((k, ci) => (
                <td key={ci} className={`px-3 py-2 whitespace-nowrap ${
                  k.toLowerCase().includes("speed") && typeof row[k] === "number" && Number(row[k]) > 100 ? "text-red-600 font-bold"
                  : k.toLowerCase().includes("name") || k.toLowerCase().includes("vehicle") ? "font-medium text-brand-navy"
                  : k.toLowerCase().includes("status") ? `font-medium ${row[k] === "moving" ? "text-teal-600" : row[k] === "idle" ? "text-amber-600" : row[k] === "overdue" ? "text-red-600" : row[k] === "stopped" ? "text-gray-500" : "text-gray-600"}`
                  : k.toLowerCase().includes("price") || k.toLowerCase().includes("amount") || k.toLowerCase().includes("value") || k.toLowerCase().includes("balance") ? "font-medium text-emerald-700"
                  : "text-gray-600"
                }`}>{fmtV(row[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 25 && (
        <div className="px-4 py-2 text-center text-[11px] text-gray-400 bg-gray-50/50 border-t border-gray-100">
          Showing 25 of {rows.length} results
        </div>
      )}
    </div>
  );
}
