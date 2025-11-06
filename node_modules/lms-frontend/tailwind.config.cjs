module.exports = {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',

        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',

        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-600': 'rgb(var(--primary-600) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-600': 'rgb(var(--accent-600) / <alpha-value>)',

        line: 'rgb(var(--line) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      boxShadow: {
        glow: '0 0 0.5rem rgba(var(--glow-violet),0.4), 0 0 2rem rgba(var(--glow-orange),0.25)',
        card: '0 6px 24px rgba(0,0,0,0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      borderRadius: {
        xl2: '1rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, rgb(var(--primary)) 0%, rgb(var(--accent)) 100%)',
        'panel': 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
      },
    },
  },
  plugins: [],
};
