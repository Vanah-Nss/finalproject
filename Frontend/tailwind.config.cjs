/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // ← nécessaire pour le mode sombre
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "marine-blue": "#0a1f44",
        "marine-dark": "#061732",
        "marine-light": "#1c2d5a",
      },
      animation: {
        spinSlow: "spin 10s linear infinite",
        fadeInLeft: "fadeInLeft 0.7s ease forwards",
        fadeInRight: "fadeInRight 0.7s ease forwards",
        fadeInDown: "fadeInDown 0.5s ease forwards",
        float: "float 6s ease-in-out infinite",
        blink: "blink 1s step-start infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1.5s infinite",
      },
      keyframes: {
        fadeInLeft: {
          "0%": { opacity: 0, transform: "translateX(-20px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        fadeInRight: {
          "0%": { opacity: 0, transform: "translateX(20px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        fadeInDown: {
          "0%": { opacity: 0, transform: "translateY(-20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        blink: {
          "0%, 100%": { opacity: 0 },
          "50%": { opacity: 1 },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15%)" },
        },
      },
    },
  },
  plugins: [],
};

