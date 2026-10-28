"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginPage from "../components/LoginPage";

function safeNext(next: string | null): string {
  // Only allow same-site relative paths
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/login")) return "/";
  return next;
}

function LoginRoute() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  useEffect(() => {
    // Stale client-side info from a previous session
    try {
      localStorage.removeItem("dashboard_token");
      localStorage.removeItem("dashboard_user");
    } catch {}
  }, []);

  return <LoginPage onLogin={() => { router.replace(next); router.refresh(); }} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginRoute />
    </Suspense>
  );
}
