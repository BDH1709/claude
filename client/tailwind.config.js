/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: '#CC0000',
          yellow: '#FFCB05',
          blue: '#3B5CA8',
          dark: '#1a1a2e',
          card: '#16213e',
          border: '#0f3460',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
