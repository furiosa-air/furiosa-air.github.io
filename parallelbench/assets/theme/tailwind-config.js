// FuriosaAI brand theme for the Tailwind Play CDN.
// Load right after https://cdn.tailwindcss.com so the existing utility classes
// (slate-*, blue-*, primary, rounded-*) render with Furiosa colors and shapes.
tailwind.config = {
  theme: {
    // Furiosa surfaces are square; only pills and dots stay round.
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['"ABC Favorit"', '"Helvetica Neue"', 'Inter', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: '#E21500',
        'primary-dark': '#B01500',
        // Neutral scale mapped onto the brand greys (#151515 / #444 / #7F7F7F / #D4D4D4).
        slate: {
          50: '#FAFAFA',
          100: '#F4F4F4',
          200: '#D4D4D4',
          300: '#B5B5B5',
          400: '#9A9A9A',
          500: '#7F7F7F',
          600: '#444444',
          700: '#2E2E2E',
          800: '#1F1F1F',
          900: '#151515',
          950: '#000000',
        },
        // Callouts used blue; render them as brand-red tints instead.
        blue: {
          50: '#FDF3F1',
          100: '#FBE7E4',
          200: '#F6C9C2',
          300: '#EE9C90',
          400: '#E8594A',
          500: '#E21500',
          600: '#E21500',
          700: '#C41300',
          800: '#B01500',
          900: '#440A07',
        },
      },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
      },
    },
  },
};
