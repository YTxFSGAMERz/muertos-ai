/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        altar: {
          bg: '#0a0608',
          dark: '#130d10',
          card: '#1a1018',
          border: '#3d1f2a',
          marigold: '#f59e0b',
          gold: '#fbbf24',
          rose: '#e11d48',
          purple: '#7c3aed',
          candle: '#fef3c7',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        flicker: 'flicker 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 1s ease-in forwards',
        float: 'float 3s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        flicker: {
          '0%': { opacity: '0.9', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1.02)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(245,158,11,0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(245,158,11,0.7), 0 0 60px rgba(245,158,11,0.3)' },
        },
      },
    },
  },
  plugins: [],
};
