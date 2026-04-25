import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"]
      },
      colors: {
        avocado: {
          50: "#F1F5EC",
          100: "#DCE7CC",
          400: "#7BA05B",
          600: "#4A6B35",
          700: "#365024",
          900: "#1F2F14"
        },
        terracota: {
          50: "#FBEDE5",
          400: "#E85D2F",
          500: "#D24A1F",
          600: "#B33A14"
        },
        cream: {
          50: "#FBF5E8",
          100: "#F4EBD9",
          200: "#EADBB8"
        },
        ink: {
          900: "#0E1208",
          800: "#161B0E",
          700: "#1F2614"
        }
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
