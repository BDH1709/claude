import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#060d14",
          secondary: "#0d1520",
          tertiary: "#131f2e",
          card: "rgba(13, 21, 32, 0.85)",
        },
        accent: {
          blue: "#58a6ff",
          "blue-dim": "#1f6feb",
          orange: "#f77f00",
          "orange-dim": "#b35900",
          red: "#f85149",
          purple: "#bc8cff",
          cyan: "#39d0d8",
        },
        border: {
          DEFAULT: "#1e2d3d",
          bright: "#2d4a6e",
          glow: "rgba(88, 166, 255, 0.4)",
        },
        text: {
          primary: "#cdd9e5",
          secondary: "#768390",
          muted: "#444c56",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scan-line": "scan-line 4s linear infinite",
        blink: "blink 1.2s step-end infinite",
        "border-flow": "border-flow 3s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(88,166,255,0.2), 0 0 10px rgba(88,166,255,0.1)" },
          "50%": { boxShadow: "0 0 15px rgba(88,166,255,0.5), 0 0 30px rgba(88,166,255,0.2)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)", opacity: "0.6" },
          "100%": { transform: "translateY(100vh)", opacity: "0.6" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "border-flow": {
          "0%, 100%": { borderColor: "rgba(88,166,255,0.2)" },
          "50%": { borderColor: "rgba(88,166,255,0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
