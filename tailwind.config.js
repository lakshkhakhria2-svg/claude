/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './work/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        archivo: ['Archivo', 'system-ui', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        plex: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        lexend: ['Lexend', 'system-ui', 'sans-serif'],
        source: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Palettes come from UI UX Pro Max (design-system/<project>/MASTER.md).
        // "*ink" / "*deep" tokens are the contrast fixes recorded in design-system/<project>/pages/home.md.
        studio: { primary: '#EC4899', secondary: '#F472B6', cta: '#06B6D4', bg: '#FDF2F8', text: '#831843', deep: '#BE185D', ctaink: '#083344', line: '#FBCFE8' },
        cadence: { primary: '#0D9488', secondary: '#14B8A6', cta: '#F97316', bg: '#F0FDFA', text: '#134E4A', deep: '#0F766E', ctaink: '#431407', line: '#CCFBF1' },
        vault: { primary: '#F59E0B', secondary: '#FBBF24', cta: '#8B5CF6', bg: '#0F172A', text: '#F8FAFC', deep: '#7C3AED', muted: '#CBD5E1', panel: '#1E293B', line: '#334155' },
        bright: { primary: '#0891B2', secondary: '#22D3EE', cta: '#22C55E', bg: '#ECFEFF', text: '#164E63', deep: '#0E7490', ctaink: '#052E16', line: '#CFFAFE' },
      },
    },
  },
  plugins: [],
};
