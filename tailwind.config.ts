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
          primary: "#0d1117",
          secondary: "#161b22",
          tertiary: "#21262d",
        },
        accent: {
          blue: "#58a6ff",
          green: "#3fb950",
          orange: "#d29922",
          red: "#f85149",
          purple: "#bc8cff",
        },
        border: {
          DEFAULT: "#30363d",
          subtle: "#21262d",
        },
        text: {
          primary: "#e6edf3",
          secondary: "#8b949e",
          muted: "#6e7681",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
