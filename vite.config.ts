import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Externalize optional Capacitor plugins that may not be installed
        if (id.includes('@codetrix-studio/capacitor-google-auth')) {
          return true;
        }
        if (id.includes('@capacitor/haptics')) {
          return true;
        }
        return false;
      },
    },
  },
}));
