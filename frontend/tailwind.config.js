/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#FCE7F3',    // Blush
          sage: '#D1FAE5',    // Sage
          cream: '#FFFBEB',   // Cream
          lavender: '#F3E8FF',
          accent: '#B91C1C',  // Price red
          dark: '#374151',    // Text
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Quicksand"', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}