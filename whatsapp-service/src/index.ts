import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { sessionManager } from './session-manager'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.NEXTJS_APP_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Auth middleware - validate webhook secret
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const webhookSecret = process.env.WEBHOOK_SECRET

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessionManager.getActiveSessionsCount(),
  })
})

// Start a new session
app.post('/sessions/:orgId/start', authMiddleware, async (req, res) => {
  const { orgId } = req.params

  try {
    console.log(`Starting session for org: ${orgId}`)
    const session = await sessionManager.startSession(orgId)

    res.json({
      success: true,
      status: session.status,
      qrCode: session.qrCode,
    })
  } catch (err) {
    console.error('Error starting session:', err)
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    })
  }
})

// Get QR code
app.get('/sessions/:orgId/qr', authMiddleware, (req, res) => {
  const { orgId } = req.params

  const qrCode = sessionManager.getQRCode(orgId)
  const session = sessionManager.getSession(orgId)

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found',
    })
  }

  res.json({
    success: true,
    status: session.status,
    qrCode: qrCode,
  })
})

// Get session status
app.get('/sessions/:orgId/status', authMiddleware, (req, res) => {
  const { orgId } = req.params

  const session = sessionManager.getSession(orgId)

  if (!session) {
    return res.json({
      success: true,
      status: 'disconnected',
    })
  }

  res.json({
    success: true,
    status: session.status,
    phoneNumber: session.phoneNumber,
    pushname: session.pushname,
  })
})

// Stop session
app.post('/sessions/:orgId/stop', authMiddleware, async (req, res) => {
  const { orgId } = req.params

  try {
    await sessionManager.stopSession(orgId)
    res.json({ success: true })
  } catch (err) {
    console.error('Error stopping session:', err)
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    })
  }
})

// Send message
app.post('/sessions/:orgId/send', authMiddleware, async (req, res) => {
  const { orgId } = req.params
  const { chatId, message } = req.body

  if (!chatId || !message) {
    return res.status(400).json({
      success: false,
      error: 'chatId and message are required',
    })
  }

  const result = await sessionManager.sendMessage(orgId, chatId, message)
  res.json(result)
})

// List all sessions (admin endpoint)
app.get('/sessions', authMiddleware, (req, res) => {
  const sessions = sessionManager.getAllSessions()
  res.json({
    success: true,
    count: sessions.length,
    sessions,
  })
})

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`WhatsApp Service running on port ${PORT}`)
  console.log(`CORS origin: ${process.env.NEXTJS_APP_URL || 'http://localhost:3000'}`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  const sessions = sessionManager.getAllSessions()
  for (const session of sessions) {
    await sessionManager.stopSession(session.orgId)
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  const sessions = sessionManager.getAllSessions()
  for (const session of sessions) {
    await sessionManager.stopSession(session.orgId)
  }
  process.exit(0)
})
