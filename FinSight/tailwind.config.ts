import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 50: "#f1f5f9", 100: "#e2e8f0", 600: "#1e3a5f", 700: "#152a47", 800: "#0f1f38", 900: "#0a1628" },
        income: "#16a34a",
        expense: "#dc2626",
      },
    },
  },
  plugins: [],
};
export default config;
