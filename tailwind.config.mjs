/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#2E7D32', // Verde cactus
        secondary: '#C62828', // Rojo para CTAs
      },
    },
  },
  plugins: [],
};
