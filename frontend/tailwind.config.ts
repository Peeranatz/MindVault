import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0f766e", // deep teal
        primaryDark: "#0b5c57",
        mint: "#2dd4bf",
        blush: "#f8b4b4",
        sky: "#a5d8ff",
        accent: "#0ea5e9",
        calm: "#22c55e",
        warn: "#f59e0b",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
