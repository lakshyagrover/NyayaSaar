/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NyayaSaar theme: "Maroon & Plum"
        // To go back to the old blue theme, use:
        // 50 #eff6ff, 100 #dbeafe, 200 #bfdbfe, 300 #93c5fd, 400 #60a5fa, 500 #3b82f6,
        // 600 #2563eb, 700 #1d4ed8, 800 #1e40af, 900 #1e3a8a, 950 #172554, navy #0f2044
        primary: {
          50: '#fcf2f4',
          100: '#f6dfe5',
          200: '#ecbfca',
          300: '#db92a3',
          400: '#c4647c',
          500: '#ad4560',
          600: '#94344e',
          700: '#7d2a42',
          800: '#672438',
          900: '#531f2f',
          950: '#33101c',
        },
        court: {
          navy:  '#2f1628',
          gold:  '#e6bfa7',
          cream: '#fcf8f9',
        },
      },
      fontFamily: {
        sans:  ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
