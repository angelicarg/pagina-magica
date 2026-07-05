import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Emulates Vercel's /api serverless functions during `vite dev`, since Vite
// itself has no idea the api/ folder exists. Production deploys don't use
// this — Vercel picks up api/*.js directly.
function vercelApiDevMiddleware() {
  return {
    name: 'vercel-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()

        const { default: handler } = await server.ssrLoadModule(`.${req.url}.js`)

        if (req.method === 'POST') {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const raw = Buffer.concat(chunks).toString('utf-8')
          try {
            req.body = raw ? JSON.parse(raw) : {}
          } catch {
            req.body = {}
          }
        }

        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (payload) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        }

        await handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only auto-loads .env into import.meta.env for client code. The
  // dev-only /api middleware above runs as plain Node and reads
  // process.env directly (same as Vercel does in production), so it needs
  // the vars merged in here.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), vercelApiDevMiddleware()],
  }
})
