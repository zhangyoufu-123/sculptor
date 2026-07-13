"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ArchitectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/discover");
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-primary)",
      color: "var(--text-secondary)",
      fontFamily: "var(--font-ui)",
      fontSize: 14,
    }}>
      正在跳转...
    </div>
  );
}
