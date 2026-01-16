import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050508",
        surface: "#0D0D12",
        glass: "rgba(255,255,255,0.06)",
        primary: "#FF2D2D",
        "text-primary": "#FFFFFF",
        "text-muted": "rgba(255,255,255,0.68)",
        border: "rgba(255,255,255,0.08)",
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
export default config;
