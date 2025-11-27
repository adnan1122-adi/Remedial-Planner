import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error if node types are missing
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Robustly find the API Key:
  // 1. Check `process.env` (System variables available in the Node process, e.g. Vercel Build context)
  // 2. Check `env` (loaded from .env files or system vars picked up by Vite)
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Stringify the value so it gets inserted as a string literal in the code
      // If missing, it injects "undefined" or empty string, handled by app logic
      'process.env.API_KEY': JSON.stringify(apiKey || '')
    }
  };
});