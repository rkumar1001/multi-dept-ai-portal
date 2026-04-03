"use client";

import { useState } from "react";

export function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="rounded-md px-2 py-1 text-gray-400 hover:text-brand-teal hover:bg-brand-teal/5 transition text-xs"
        title="Copy"
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <button
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        className={`rounded-md px-2 py-1 transition text-xs ${feedback === "up" ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
      >
        👍
      </button>
      <button
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        className={`rounded-md px-2 py-1 transition text-xs ${feedback === "down" ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
      >
        👎
      </button>
    </div>
  );
}
