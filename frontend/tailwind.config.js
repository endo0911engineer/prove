/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontSize: {
        xs:   ["13px", { lineHeight: "18px" }],
        sm:   ["15px", { lineHeight: "22px" }],
        base: ["17px", { lineHeight: "26px" }],
      },
      colors: {
        streak: "#FF6200",
      },
    },
  },
  plugins: [],
};
