/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        asphalt: '#1A100A',
        panel: '#2C231E',
        volt: '#FF6115',
        sun: '#FFC247',
        mist: '#FFFCF4',
        fog: '#B8A99C',
        paper: '#FFFCF4',
        ink: '#1A100A',
        sign: '#C2410C',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};