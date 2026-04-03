"use client";

import type { ChartSegment } from "@/departments/types";

export function DonutChart({ segments, centerLabel }: { segments: ChartSegment[]; centerLabel: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  let cum = 0;
  const parts = segments.map((seg) => {
    const start = (cum / total) * 360; cum += seg.value; const end = (cum / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36 rounded-full shadow-inner" style={{ background: `conic-gradient(${parts.join(", ")})` }}>
        <div className="absolute inset-[18px] bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
          <span className="text-2xl font-bold text-brand-navy">{total.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400">{centerLabel}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-semibold text-gray-800">{seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
