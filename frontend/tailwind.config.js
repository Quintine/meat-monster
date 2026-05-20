/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          900: '#1c1917',
          950: '#0c0a09',
        }
      }
    },
  },
  plugins: [],
}
