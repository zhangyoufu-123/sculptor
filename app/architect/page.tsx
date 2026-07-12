"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ArchitectPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const legacy: Record<string, string> = {};
      params.forEach((value, key) => { legacy[key] = value; });
      if (Object.keys(legacy).length > 0) {
        localStorage.setItem("sculptor-legacy-architect-params", JSON.stringify(legacy));
      }
    }
    const t = setTimeout(() => router.push("/discover"), 300);
    return () => clearTimeout(t);
  }, [router, params]);

  return <p>正在跳转到新的思维探索流程...</p>;
}
