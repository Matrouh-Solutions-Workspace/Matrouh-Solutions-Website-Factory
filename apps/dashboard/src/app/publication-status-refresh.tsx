"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const PUBLICATION_REFRESH_INTERVAL_MS = 2_000;

export function PublicationStatusRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    if (!active || isRefreshing) return;

    const timeout = window.setTimeout(() => {
      startRefresh(() => router.refresh());
    }, PUBLICATION_REFRESH_INTERVAL_MS);

    return () => window.clearTimeout(timeout);
  }, [active, isRefreshing, router]);

  return null;
}
