/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#8CD790', // pastel green
          dark: '#3E885B',
        },
        secondary: {
          light: '#C7F9CC',
          dark: '#2C6E49',
        },
        background: {
          light: '#F6FFF8',
          dark: '#1F2937',
        },
        text: {
          light: '#1F2937',
          dark: '#F9FAFB',
        },
        accent: {
          light: '#5BBA6F',
          dark: '#4ADE80',
        }
      },
    },
  },
  plugins: [],
}