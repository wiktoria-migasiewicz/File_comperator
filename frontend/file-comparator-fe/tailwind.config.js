/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",               // ← plik szablonu
    "./src/**/*.{js,jsx,ts,tsx}", // ← **wszystkie** pliki Reacta!
  ],
  theme: { extend: {} },
  plugins: [],
};
