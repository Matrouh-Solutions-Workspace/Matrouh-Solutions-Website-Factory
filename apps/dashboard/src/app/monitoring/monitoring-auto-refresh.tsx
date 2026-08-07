"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const MONITORING_REFRESH_INTERVAL_MS = 15_000;

export function MonitoringAutoRefresh() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    if (isRefreshing) return;
    const timeout = window.setTimeout(() => {
      startRefresh(() => router.refresh());
    }, MONITORING_REFRESH_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [isRefreshing, router]);

  return null;
}
