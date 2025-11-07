/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // Use class strategy for manual override
  theme: {
    extend: {
      colors: {
        // Light mode colors (current theme)
        primary: '#007AFF',
        'primary-light': '#5A7FFF',
        'primary-dark': '#1E42CC',
        secondary: '#FF6B6B',
        accent: '#4ECDC4',

        // Neutral colors
        white: '#FFFFFF',
        black: '#000000',
        gray: '#F5F5F5',
        'light-gray': '#E0E0E0',
        'dark-gray': '#757575',

        // Semantic colors
        success: '#4CAF50',
        warning: '#FF9500',
        error: '#FF3B30',
        info: '#2196F3',

        // Text colors
        'text-primary': '#212121',
        'text-secondary': '#757575',
        'text-light': '#BDBDBD',

        // Background colors
        background: '#FFFFFF',
        'background-secondary': '#F8F9FA',
        surface: '#F8F9FA',
        card: '#FFFFFF',

        // Border colors
        border: '#E0E0E0',
        divider: '#F0F0F0',

        // Category colors
        green: '#8BC34A',
        blue: '#03A9F4',
        purple: '#9C27B0',
        orange: '#FF9500',
        yellow: '#FFEB3B',
        pink: '#E91E63',
        red: '#FF3B30',

        // Dark mode colors (for future implementation)
        'dark-background': '#1C1C1E',
        'dark-surface': '#2C2C2E',
        'dark-text': '#FFFFFF',
        'dark-text-secondary': '#8E8E93',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        xxxl: '64px',
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
