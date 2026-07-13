import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        africhess: {
          gold: "#D4A017",
          green: "#1B7A3D",
          terracotta: "#C45C26",
          earth: "#8B4513",
          night: "#0D1117",
          slate: "#161B22",
          cream: "#F5F0E8",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Cambria", "serif"],
        body: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        premium: "var(--shadow-premium)",
        "premium-lg": "var(--shadow-premium-lg)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      backgroundImage: {
        "african-pattern": "url('/images/pattern-bg.png')",
      },
      animation: {
        "piece-move": "pieceMove 0.3s ease-out",
        "fade-in": "fadeIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up-sm": "slideUpSm 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scaleIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      animationDelay: {
        75: "75ms",
        100: "100ms",
        150: "150ms",
        200: "200ms",
        300: "300ms",
        400: "400ms",
        500: "500ms",
      },
      keyframes: {
        pieceMove: {
          "0%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUpSm: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
