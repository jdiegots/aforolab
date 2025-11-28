import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "16px" },
    extend: {
      colors: {
        brand: {
          50: "#e6f6fd",
          100: "#c6eefe",
          600: "#0ea5e9",
          700: "#0284c7",
          900: "#0a2a3a"
        }
      },
      borderRadius: {
        xl: "12px"
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
