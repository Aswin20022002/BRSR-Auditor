import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        mute: "var(--mute)",
        line: "var(--line)",
        brand: "var(--brand)",
        "brand-ink": "var(--brand-ink)",
        marigold: "var(--marigold)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        viol: "var(--viol)",
        bad: "var(--bad)",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque Variable'", "system-ui", "sans-serif"],
        sans: ["'Public Sans Variable'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 1px 0 rgba(20,27,58,.04), 0 12px 32px -16px rgba(20,27,58,.28)",
      },
    },
  },
  plugins: [],
};
export default config;
