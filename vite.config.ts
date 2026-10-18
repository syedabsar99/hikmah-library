import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

interface TokenEntry {
  tokenHash: string
  rawCode: string
  email: string
  role: string
  expiresAt: number
  used: boolean
  createdAt: number
}

// In-memory token store for local development reset verification (no plaintext passwords saved to disk)
const inMemoryTokens: TokenEntry[] = []

function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: any) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function authBackendPlugin(): Plugin {
  return {
    name: 'auth-backend-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // Set CORS headers for all /api/auth requests
        if (url.startsWith('/api/auth')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            return res.end()
          }
        }

        // 1. POST /api/auth/store-token
        if (url === '/api/auth/store-token' && req.method === 'POST') {
          const body = await parseBody(req)
          const { tokenHash, rawCode, email, role, expiresAt } = body
          if (tokenHash && email) {
            inMemoryTokens.push({
              tokenHash,
              rawCode: rawCode || '',
              email: email.toLowerCase(),
              role: role || 'admin',
              expiresAt: expiresAt || Date.now() + 15 * 60 * 1000,
              used: false,
              createdAt: Date.now(),
            })
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: true }))
          }
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: 'Missing token data' }))
        }

        // 2. POST /api/auth/verify-token
        if (url === '/api/auth/verify-token' && req.method === 'POST') {
          const body = await parseBody(req)
          const { tokenHash, code } = body
          if (!tokenHash && !code) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ valid: false, error: 'Missing token hash or code' }))
          }
          const cleanCode = (code || '').toUpperCase()
          const found = inMemoryTokens.find(
            (t) =>
              (tokenHash && t.tokenHash === tokenHash) ||
              (cleanCode && t.rawCode && t.rawCode.toUpperCase() === cleanCode)
          )
          if (!found) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ valid: false, error: 'Token not found or invalid' }))
          }
          if (found.used) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ valid: false, error: 'Reset link has already been used' }))
          }
          if (Date.now() > found.expiresAt) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ valid: false, error: 'Reset link has expired' }))
          }
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ valid: true, email: found.email, role: found.role }))
        }

        // 3. POST /api/auth/confirm-reset
        if (url === '/api/auth/confirm-reset' && req.method === 'POST') {
          const body = await parseBody(req)
          const { tokenHash, code, newPassword } = body
          if ((!tokenHash && !code) || !newPassword) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Missing token or password' }))
          }
          const cleanCode = (code || '').toUpperCase()
          const index = inMemoryTokens.findIndex(
            (t) =>
              (tokenHash && t.tokenHash === tokenHash) ||
              (cleanCode && t.rawCode && t.rawCode.toUpperCase() === cleanCode)
          )
          if (index === -1) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Invalid reset code' }))
          }
          const tokenEntry = inMemoryTokens[index]
          if (tokenEntry.used) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Reset link already used' }))
          }
          if (Date.now() > tokenEntry.expiresAt) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Reset link has expired' }))
          }

          // Mark token as burned/used immediately
          tokenEntry.used = true
          inMemoryTokens[index] = tokenEntry

          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ success: true, email: tokenEntry.email }))
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), authBackendPlugin()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    allowedHosts: true, // Allow custom hostnames and mobile dev test
  },
})

