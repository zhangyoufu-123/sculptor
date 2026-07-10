"use client";

import { useArchitectStore } from "@/store/architect-store";

export default function SchemeTabs() {
  const schemes = useArchitectStore((s) => s.schemes);
  const activeSchemeId = useArchitectStore((s) => s.activeSchemeId);
  const setActiveScheme = useArchitectStore((s) => s.setActiveScheme);
  const switchScheme = useArchitectStore((s) => s.switchScheme);

  if (schemes.length <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "8px 12px",
        background: "#0d0d0d",
        borderBottom: "1px solid #1a1a1a",
        overflowX: "auto",
      }}
    >
      {schemes.map((scheme) => (
        <button
          key={scheme.id}
          onClick={() => {
            if (scheme.id !== activeSchemeId) {
              switchScheme(scheme.id);
              setActiveScheme(scheme.id);
            }
          }}
          style={{
            padding: "4px 12px",
            borderRadius: 12,
            border: "none",
            background: scheme.id === activeSchemeId ? "#2a2a2a" : "transparent",
            color: scheme.id === activeSchemeId ? "#c4a565" : "#888",
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {scheme.name}
        </button>
      ))}
    </div>
  );
}
