/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.njk'],
  darkMode: ['selector', '[data-scheme="dark"]'],
  theme: {
    extend: {
      colors: {
        'accent': {
          300: 'color-mix(in srgb, rgba(var(--cl-accent), <alpha-value>) 55%, rgba(var(--cl-t-primary), <alpha-value>))',
          400: 'color-mix(in srgb, rgba(var(--cl-accent), <alpha-value>) 80%, rgba(var(--cl-t-primary), <alpha-value>))',
          500: 'rgba(var(--cl-accent), <alpha-value>)',
          600: 'color-mix(in srgb, rgba(var(--cl-accent), <alpha-value>), black 12%)',
          700: 'color-mix(in srgb, rgba(var(--cl-accent), <alpha-value>), black 25%)'
        },
        'on-accent': 'rgba(var(--cl-on-accent), <alpha-value>)',
        't-accent': 'rgba(var(--cl-on-accent), <alpha-value>)',
        't-primary': 'rgba(var(--cl-t-primary), <alpha-value>)',
        't-muted': 'rgba(var(--cl-t-muted), <alpha-value>)',
        'background': 'rgba(var(--cl-background), <alpha-value>)',
        'surface': 'rgba(var(--cl-surface), <alpha-value>)',
        'surface-raised': 'rgba(var(--cl-surface-raised), <alpha-value>)',
        'success': 'rgba(var(--cl-success), <alpha-value>)',
        'warning': 'rgba(var(--cl-warning), <alpha-value>)',
        'error': 'rgba(var(--cl-error), <alpha-value>)'
      },
      borderColor: {
        'theme': 'var(--cl-border)'
      },
      ringColor: {
        'theme': 'var(--cl-border)'
      },
      divideColor: {
        'theme': 'var(--cl-border)'
      },
      borderWidth: {
        'DEFAULT': 'var(--border-w)'
      },
      borderRadius: {
        'card': 'var(--radius-card)',
        'btn': 'var(--radius-button)',
        'input': 'var(--radius-input)',
        'badge': 'var(--radius-badge)'
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'btn': 'var(--shadow-button)',
        'nav': 'var(--shadow-nav)',
        'modal': 'var(--shadow-modal)'
      },
      transitionDuration: {
        'theme': 'var(--dur)'
      },
      fontFamily: {
        'heading': 'var(--ff-heading)',
        'body': 'var(--ff-body)'
      },
      fontSize: {
        'display': ['calc(3.25rem * var(--heading-scale))', { lineHeight: '1.1' }],
        'h1': ['calc(2.5rem * var(--heading-scale))', { lineHeight: '1.15' }],
        'h2': ['calc(1.875rem * var(--heading-scale))', { lineHeight: '1.2' }],
        'h3': ['calc(1.375rem * var(--heading-scale))', { lineHeight: '1.3' }],
        'h4': ['calc(1.125rem * var(--heading-scale))', { lineHeight: '1.4' }]
      },
      spacing: {
        'section': 'min(var(--section-py), 14vw)',
        'card': 'var(--card-pad)',
        'grid-gap': 'var(--grid-gap)'
      },
      maxWidth: {
        'container': 'var(--container-max)'
      },
      keyframes: {
        'announcement-fade': {
          '0%': { opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'announcement-scroll': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'announcement-scroll2': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0%)' },
        }
      },
      animation: {
        'announcement-fade': 'announcement-fade 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'announcement-scroll': 'announcement-scroll var(--announcement-duration) linear infinite',
        'announcement-scroll2': 'announcement-scroll2 var(--announcement-duration) linear infinite'
      },
    },
  },
  plugins: []
}
