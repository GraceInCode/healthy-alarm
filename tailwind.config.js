/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        sky: {
          night: '#0a0a1a',
          dawn: '#1a1a2e',
          dusk: '#16213e',
          blue: '#0f3460',
          light: '#4a90d9',
        },
      },
    },
  },
  plugins: [],
};
