import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react"; // 1. Importa React

export default defineConfig({
  // 2. Agrega react() a las integraciones
  integrations: [tailwind(), react()],
  
  // 3. Forzar a Vite a reconocer Firebase
  vite: {
    optimizeDeps: {
      include: ['firebase/app', 'firebase/firestore'],
    },
    ssr: {
      external: ['firebase'],
    }
  }
});

