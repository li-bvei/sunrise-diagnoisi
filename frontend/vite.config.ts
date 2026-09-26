import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolveBasePath } from './vite.base-path'

export default defineConfig(({ mode }) => {
  // process.env (Docker build arg / shell) wins over .env files; see vite.base-path.ts for the default.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: resolveBasePath(env.VITE_BASE_PATH, mode === 'production'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
