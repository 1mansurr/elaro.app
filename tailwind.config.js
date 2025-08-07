/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // Use class strategy for manual override
  theme: {
    extend: {
      colors: {
        // iOS Calendar-inspired dark mode palette
        background: {
          DEFAULT: '#1C1C1E', // main
          secondary: '#2C2C2E',
          elevated: '#3A3A3C',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8E8E93',
          accent: '#007AFF',
        },
        accent: {
          blue: '#007AFF',
        },
        destructive: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
        border: '#38383A',
        separator: '#38383A',
        card: '#1C1C1E',
        input: '#1C1C1E',
        inputBorder: '#38383A',
        // Light mode (for reference)
        light: {
          background: '#FFFFFF',
          surface: '#F2F2F7',
          text: '#000000',
        },
      },
    },
  },
  plugins: [],
};
