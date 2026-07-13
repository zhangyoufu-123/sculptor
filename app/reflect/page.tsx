"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Reflection from "@/components/Reflection";

export default function ReflectPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    anchor: string;
    outline: any[];
    content: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const anchor = localStorage.getItem("sculptor-anchor") || "未命名";
    let outline: any[] = [];
    let content = "";

    // Load outline from discover or architect
    try {
      const raw = localStorage.getItem("sculptor-discover-outline");
      if (raw) outline = JSON.parse(raw).outline || [];
    } catch {}

    if (!outline.length) {
      try {
        const raw = localStorage.getItem("sculptor-architecture");
        if (raw) {
          const arch = JSON.parse(raw);
          outline = (arch.nodes || []).map((n: any) => ({
            level: 1,
            title: n.title || n.label,
            notes: n.summary || n.notes || "",
          }));
        }
      } catch {}
    }

    // Load content from last writing session
    content = localStorage.getItem("sculptor-last-content") || "";

    // If no content at all, redirect to write page
    if (!content && !outline.length) {
      router.push("/write");
      return;
    }

    setData({ anchor, outline, content });
  }, []);

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-ui)",
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 80px",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%" }}>
        <Reflection
          anchor={data.anchor}
          outline={data.outline}
          content={data.content}
        />
      </div>
    </div>
  );
}
