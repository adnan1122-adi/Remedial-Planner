import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Safely inject the API key environment variable as a string
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});