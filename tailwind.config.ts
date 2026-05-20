import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafbfc',
        foreground: '#1a1d23',
        muted: '#6b7280',
        border: '#e5e7eb',
        primary: '#2d3748',
        accent: '#d4af37',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.1)',
        cardHover: '0 12px 32px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        heading: ['Barlow Condensed', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'rare-gradient': 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.02) 70%, rgba(255,255,255,0.9) 100%)',
      },
    },
  },
  plugins: [],
}

export default config
