"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-lg text-gray-500">Loading...</div>
    </main>
  );
}
