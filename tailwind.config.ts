import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Share Tech Mono'", "monospace"],
        display: ["'Orbitron'", "monospace"],
        body: ["'DM Mono'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        flicker: "flicker 4s linear infinite",
        scan: "scan 6s linear infinite",
      },
      keyframes: {
        flicker: {
          "0%, 95%, 100%": { opacity: "1" },
          "96%": { opacity: "0.8" },
          "97%": { opacity: "1" },
          "98%": { opacity: "0.6" },
          "99%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
      colors: {
        doomer: {
          DEFAULT: "#ef4444",
          glow: "#ef444440",
        },
        crypto: {
          DEFAULT: "#22c55e",
          glow: "#22c55e40",
        },
        banker: {
          DEFAULT: "#3b82f6",
          glow: "#3b82f640",
        },
        unknown: {
          DEFAULT: "#a855f7",
          glow: "#a855f740",
        },
      },
    },
  },
  plugins: [],
};
export default config;
