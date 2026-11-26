export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
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
