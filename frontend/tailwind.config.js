/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1B4FD8', dark: '#1340B0', light: '#3B72FF' },
        storm: { DEFAULT: '#DC2626', amber: '#D97706', orange: '#EA580C' },
        safe:  { DEFAULT: '#16A34A', light: '#22C55E' },
        navy:  { DEFAULT: '#0F1B35', mid: '#1E2D4E', light: '#2D4270' },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      animation: {
        'pulse-red':  'pulseRed 1.2s ease-in-out infinite',
        'slide-up':   'slideUp 0.35s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
        'ping-slow':  'ping 2s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        pulseRed: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'none' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
