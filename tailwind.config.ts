import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: { colors: { ink: '#17251f', cream: '#f7f3e8', sage: '#44765d', coral: '#e87c5d' } },
  },
  plugins: [],
} satisfies Config;
