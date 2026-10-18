import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

const AUTH_STATE_FILE = path.resolve(__dirname, 'src/data/server_auth_state.json')
const TUNNEL_URL_FILE = path.resolve(__dirname, 'src/data/tunnel_url.json')

function readAuthState(): { tokens: any[]; adminCreds: any; memberCreds: Record<string, any> } {
  try {
    if (fs.existsSync(AUTH_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_STATE_FILE, 'utf-8'))
      return { tokens: data.tokens || [], adminCreds: data.adminCreds || null, memberCreds: data.memberCreds || {} }
    }
  } catch (err) {
    console.error('Error reading auth state:', err)
  }
  return { tokens: [], adminCreds: null, memberCreds: {} }
}

function writeAuthState(state: { tokens: any[]; adminCreds: any; memberCreds: Record<string, any> }) {
  try {
    fs.mkdirSync(path.dirname(AUTH_STATE_FILE), { recursive: true })
    fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing auth state:', err)
  }
}

function getTunnelUrl(): string {
  try {
    if (fs.existsSync(TUNNEL_URL_FILE)) {
      const data = JSON.parse(fs.readFileSync(TUNNEL_URL_FILE, 'utf-8'))
      if (data && data.url) return data.url
    }
  } catch (err) {}
  return ''
}

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

        // 1. GET /api/auth/tunnel-url
        if (url === '/api/auth/tunnel-url' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          const tunnelUrl = getTunnelUrl()
          return res.end(JSON.stringify({ url: tunnelUrl }))
        }

        // 2. POST /api/auth/store-token
        if (url === '/api/auth/store-token' && req.method === 'POST') {
          const body = await parseBody(req)
          const { tokenHash, rawCode, email, role, expiresAt } = body
          if (tokenHash && email) {
            const state = readAuthState()
            const activeTokens = state.tokens.filter((t) => Date.now() < t.expiresAt && !t.used)
            activeTokens.push({
              tokenHash,
              rawCode: rawCode || '',
              email: email.toLowerCase(),
              role: role || 'admin',
              expiresAt: expiresAt || Date.now() + 15 * 60 * 1000,
              used: false,
              createdAt: Date.now(),
            })
            state.tokens = activeTokens
            writeAuthState(state)
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: true }))
          }
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: 'Missing token data' }))
        }

        // 3. POST /api/auth/verify-token
        if (url === '/api/auth/verify-token' && req.method === 'POST') {
          const body = await parseBody(req)
          const { tokenHash, code } = body
          if (!tokenHash && !code) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ valid: false, error: 'Missing token hash or code' }))
          }
          const state = readAuthState()
          const cleanCode = (code || '').toUpperCase()
          const found = state.tokens.find(
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

        // 4. POST /api/auth/confirm-reset
        if (url === '/api/auth/confirm-reset' && req.method === 'POST') {
          const body = await parseBody(req)
          const { tokenHash, code, newPassword } = body
          if ((!tokenHash && !code) || !newPassword) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Missing token or password' }))
          }
          const state = readAuthState()
          const cleanCode = (code || '').toUpperCase()
          const index = state.tokens.findIndex(
            (t) =>
              (tokenHash && t.tokenHash === tokenHash) ||
              (cleanCode && t.rawCode && t.rawCode.toUpperCase() === cleanCode)
          )
          if (index === -1) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Invalid reset code' }))
          }
          const tokenEntry = state.tokens[index]
          if (tokenEntry.used) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Reset link already used' }))
          }
          if (Date.now() > tokenEntry.expiresAt) {
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ success: false, error: 'Reset link has expired' }))
          }

          // Mark token as used
          tokenEntry.used = true
          state.tokens[index] = tokenEntry

          // Update credentials based on role
          if (tokenEntry.role === 'admin' || tokenEntry.email === 'syedabsar99@gmail.com') {
            state.adminCreds = {
              email: tokenEntry.email,
              password: newPassword,
              updatedAt: new Date().toISOString(),
            }
          }

          if (tokenEntry.role === 'member') {
            state.memberCreds = state.memberCreds || {}
            state.memberCreds[tokenEntry.email.toLowerCase()] = {
              password: newPassword,
              updatedAt: new Date().toISOString(),
            }
          }

          writeAuthState(state)
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ success: true, email: tokenEntry.email }))
        }

        // 5. GET /api/auth/admin-creds
        if (url === '/api/auth/admin-creds' && req.method === 'GET') {
          const state = readAuthState()
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ adminCreds: state.adminCreds }))
        }

        // 6. GET /api/auth/member-creds
        if (url.startsWith('/api/auth/member-creds') && req.method === 'GET') {
          const state = readAuthState()
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ memberCreds: (state as any).memberCreds || {} }))
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), authBackendPlugin()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    allowedHosts: true, // Allow Cloudflare Tunnel domains and mobile device hostnames
  },
})
