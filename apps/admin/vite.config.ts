import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Pages are lazy-loaded (see App.tsx); vendor code is split so no chunk passes 500 kB
        // and the big, rarely-changing SDKs cache separately from app code.
        codeSplitting: {
          groups: [
            { name: 'firebase-firestore', test: /node_modules[\\/]@firebase[\\/](firestore|webchannel-wrapper)/, priority: 30 },
            { name: 'firebase-auth', test: /node_modules[\\/]@firebase[\\/]auth/, priority: 30 },
            { name: 'firebase-core', test: /node_modules[\\/](@firebase|firebase)[\\/]/, priority: 20 },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor|@reduxjs|redux|immer|reselect|es-toolkit|decimal\.js-light)/, priority: 20 },
            { name: 'zod', test: /node_modules[\\/]zod[\\/]/, priority: 20 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
})
