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
        // Dark Moderate Blue — #2d3693
        primary: {
          50:  '#f0f1fd',
          100: '#dfe2fa',
          200: '#bec4f5',
          300: '#929bec',
          400: '#6570e0',
          500: '#4550d4',
          600: '#2d3693',
          700: '#22296e',
          800: '#161b4a',
          900: '#0d1029',
        },
        // Cyan-Lime Green — #35c178
        accent: {
          50:  '#f0fbf5',
          100: '#d9f5e7',
          200: '#b4ead0',
          300: '#82d9b0',
          400: '#55c88f',
          500: '#35c178',
          600: '#28a065',
          700: '#1e7a4c',
          800: '#145333',
          900: '#0a2e1c',
        },
        // Vivid Aqua — #01cec7
        secondary: {
          50:  '#f0fefe',
          100: '#ccfaf9',
          200: '#9af4f2',
          300: '#57eceb',
          400: '#1cdeda',
          500: '#01cec7',
          600: '#01a49e',
          700: '#017a76',
          800: '#014f4d',
          900: '#012928',
        },
      },
    },
  },
  plugins: [],
}
