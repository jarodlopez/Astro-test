import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Tus colores de marca (los mantuve por si los usas en otro lado)
        primary: '#2E7D32',
        secondary: '#C62828',
        
        // Aquí activamos los colores PRO que usé en el diseño
        emerald: colors.emerald,
        stone: colors.stone,
      },
    },
  },
  plugins: [],
};

