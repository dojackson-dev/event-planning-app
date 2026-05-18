/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'ring-2',
    'ring-primary-400',
    'hover:ring-primary-600',
    'border-2',
    'border-primary-400',
    'hover:border-primary-600',
  ],
  theme: {
    extend: {
      colors: {
        // Blue #008bea
        primary: {
          50:  '#e6f4fd',
          100: '#cce9fb',
          200: '#99d3f7',
          300: '#66bdf3',
          400: '#33a7ef',
          500: '#008bea',
          600: '#006fbb',
          700: '#00538c',
          800: '#00375d',
          900: '#001c2e',
        },
        // Cyan-Lime Green #35c178
        accent: {
          50:  '#edfaf3',
          100: '#d0f3e2',
          200: '#a2e7c6',
          300: '#74dba9',
          400: '#4ecf8c',
          500: '#35c178',
          600: '#27a063',
          700: '#1c7a4b',
          800: '#125433',
          900: '#092e1c',
        },
        // Vivid Aqua #01cec7
        aqua: {
          50:  '#e0fffe',
          100: '#b3fffd',
          200: '#66fffa',
          300: '#1afff7',
          400: '#00eee7',
          500: '#01cec7',
          600: '#01a8a2',
          700: '#01827d',
          800: '#005c59',
          900: '#003634',
        },
      },
    },
  },
  plugins: [],
}
