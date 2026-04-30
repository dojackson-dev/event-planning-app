/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'ring-2',
    'ring-blue-400',
    'hover:ring-blue-600',
    'border-2',
    'border-blue-400',
    'hover:border-blue-600',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99cbff',
          300: '#66b2ff',
          400: '#3399ff',
          500: '#0064FF',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001a33',
        },
      },
    },
  },
  plugins: [],
}
