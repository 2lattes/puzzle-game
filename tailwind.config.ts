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
          bg: "#fdfbf7",
          board: "#f4f1ea",
          primary: "#c2d1c6",
          primaryDark: "#9cb1a2",
          accent: "#e1bec0",
          text: "#4a4643",
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
