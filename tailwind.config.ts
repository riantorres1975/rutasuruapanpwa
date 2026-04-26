import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-dm-sans)", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        serif:   ["var(--font-playfair)", "Georgia", "serif"],
        "serif-display": ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        bg: {
          DEFAULT: "#0c110a",
          2: "#111a0d",
          3: "#172012",
        },
        card: "#141c10",
        verde: {
          DEFAULT: "#6aab48",
          d: "#3d6828",
          l: "rgba(106,171,72,0.12)",
        },
        lima: {
          DEFAULT: "#b8e840",
          l: "rgba(184,232,64,0.10)",
        },
        agua: {
          DEFAULT: "#48a878",
          l: "rgba(72,168,120,0.12)",
        },
        // Compatibilidad con código existente
        avocado: {
          50:  "#e8f2d8",
          100: "#a8c888",
          400: "#6aab48",
          600: "#3d6828",
          700: "#172012",
          900: "#0c110a",
        },
        terracota: {
          50:  "#fde8d4",
          400: "#b8e840",
          500: "#6aab48",
          600: "#3d6828",
        },
        cream: {
          50:  "#e8f2d8",
          100: "#a8c888",
          200: "#5a7848",
        },
        ink: {
          900: "#0c110a",
          800: "#111a0d",
          700: "#172012",
        },
      },
      boxShadow: {
        soft: "0 12px 36px -20px rgba(2, 6, 23, 0.45)",
        ticket: "0 18px 40px -20px rgba(31, 47, 20, 0.55)"
      }
    }
  },
  plugins: []
};

export default config;
