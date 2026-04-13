import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        puzzle: {
          bg: "#FFEDEA",
          board: "#fde4df",
          primary: "#A8655D",
          primaryDark: "#7D3F37",
          secondary: "#926F6A",
          tertiary: "#96703D",
          accent: "#C9897F",
          text: "#2D1F1E",
        }
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
