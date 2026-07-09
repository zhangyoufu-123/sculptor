import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // v5.1 TacitKnowledge — 暖色调主题令牌
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-tertiary": "var(--bg-tertiary)",
        "bg-elevated": "var(--bg-elevated)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-inverse": "var(--text-inverse)",
        gold: "var(--gold)",
        "gold-hover": "var(--gold-hover)",
        "gold-active": "var(--gold-active)",
        "gold-glow": "var(--gold-glow)",
        "warm-100": "var(--color-warm-100)",
        "warm-200": "var(--color-warm-200)",
        "warm-300": "var(--color-warm-300)",
        "accent-warm": "var(--color-accent-warm)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        "ghost-text": "var(--ghost-text)",
        "ghost-text-loading": "var(--ghost-text-loading)",
      },
      fontFamily: {
        body: "var(--font-body)",
        ui: "var(--font-ui)",
        mono: "var(--font-mono)",
      },
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
      },
    },
  },
  plugins: [],
};

export default config;
