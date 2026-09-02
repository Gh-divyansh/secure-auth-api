/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#071425" }, boxShadow: { glow: "0 18px 60px -24px rgba(34,211,238,.45)" } } },
  plugins: [],
};
