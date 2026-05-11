module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      exo: ["'Exo 2'", "sans-serif"],
      orbitron: ["Orbitron", "sans-serif"],
    },
    extend: {
      colors: {
        primary: "#FF6B00",
        secondary: "#0066FF",
        accent: "#7B00FF",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};