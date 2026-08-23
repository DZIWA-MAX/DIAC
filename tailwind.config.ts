import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b9d1ff",
          300: "#8fb3ff",
          400: "#5f8bff",
          500: "#3763f4",
          600: "#2a48d8",
          700: "#2338ac",
          800: "#1f3089",
          900: "#1c2c6e",
          950: "#141c42",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(20, 28, 66, 0.06)",
        card: "0 4px 24px rgba(20, 28, 66, 0.08)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
