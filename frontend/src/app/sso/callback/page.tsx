"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSsoLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

function SsoCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [ssoLogin] = useSsoLoginMutation();
  const executedRef = useRef(false);

  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      router.replace("/login");
      return;
    }

    if (executedRef.current) return;
    executedRef.current = true;

    const performSso = async () => {
      try {
        const response = await ssoLogin({ code }).unwrap();
        
        dispatch(
          setCredentials({
            user: response.data.user,
            token: response.data.token,
          })
        );

        const roleUpper = (response.data.user.role || "").toUpperCase();
        const usernameLower = (response.data.user.username || "").toLowerCase();
        const isKiosk =
          roleUpper.includes("GATE") ||
          roleUpper.includes("KIOSK") ||
          usernameLower.includes("gate") ||
          usernameLower.includes("kiosk");
        const isCashier =
          roleUpper.includes("CASHIER") ||
          usernameLower.includes("kasir") ||
          usernameLower.includes("cashier");
        const targetPath = isKiosk
          ? "/kiosk-print"
          : isCashier
          ? "/cashier/dashboard"
          : "/admin/dashboard";

        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = targetPath;
        } else {
          router.replace(targetPath);
        }
      } catch (err: unknown) {
        const errorObj = err as { name?: string };
        if (errorObj?.name === "AbortError") return;
        console.error("SSO Exchange failed", err);
        router.replace("/login");
      }
    };

    performSso();
  }, [code, ssoLogin, dispatch, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-center px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-t-2 border-zinc-600 dark:border-zinc-400 border-r-2 border-r-transparent animate-spin" />
          <div className="w-8 h-8 rounded-lg bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center font-bold text-white dark:text-zinc-900 shadow-lg">
            S
          </div>
        </div>
        <div className="flex flex-col gap-2 animate-pulse">
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">Authenticating...</h2>
          <p className="text-zinc-500 text-xs tracking-wider uppercase">Redirecting you to dashboard</p>
        </div>
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-center px-4">
        <span className="text-xs font-semibold text-zinc-500 animate-pulse uppercase">Memuat Sesi...</span>
      </div>
    }>
      <SsoCallbackInner />
    </Suspense>
  );
}
