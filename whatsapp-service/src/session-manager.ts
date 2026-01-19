import * as path from 'path'
import * as fs from 'fs'
import { WhatsAppClient } from './whatsapp-client'
import { WhatsAppSession, SessionCredentials } from './types'
import { handleIncomingMessage } from './message-handler'
import { saveMessengerConnection } from './supabase'

class SessionManager {
  private sessions: Map<string, WhatsAppClient> = new Map()
  private sessionsPath: string

  constructor() {
    this.sessionsPath = path.join(process.cwd(), '.wwebjs_auth')
    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true })
    }
  }

  async startSession(orgId: string): Promise<WhatsAppSession> {
    // Check if session already exists
    const existingClient = this.sessions.get(orgId)
    if (existingClient) {
      const session = existingClient.getSession()
      if (session.status === 'ready') {
        return session
      }
      // If not ready, destroy and recreate
      await this.stopSession(orgId)
    }

    // Create new client
    const client = new WhatsAppClient(orgId, this.sessionsPath)

    // Set up message handler
    client.onMessage(async (message) => {
      await handleIncomingMessage(orgId, message)
    })

    // Set up status change handler
    client.onStatusChange(async (session) => {
      console.log(`[${orgId}] Status changed to: ${session.status}`)

      // Save credentials when ready
      if (session.status === 'ready') {
        const credentials: SessionCredentials = {
          phone_number: session.phoneNumber,
          pushname: session.pushname,
          platform: session.platform,
        }
        try {
          await saveMessengerConnection(orgId, credentials, true)
          console.log(`[${orgId}] Credentials saved`)
        } catch (err) {
          console.error(`[${orgId}] Error saving credentials:`, err)
        }
      }
    })

    // Store client
    this.sessions.set(orgId, client)

    // Start and return session
    return await client.start()
  }

  async stopSession(orgId: string): Promise<void> {
    const client = this.sessions.get(orgId)
    if (client) {
      await client.stop()
      this.sessions.delete(orgId)

      // Update connection status
      try {
        await saveMessengerConnection(orgId, {}, false)
      } catch (err) {
        console.error(`[${orgId}] Error updating connection:`, err)
      }
    }
  }

  getSession(orgId: string): WhatsAppSession | null {
    const client = this.sessions.get(orgId)
    if (!client) {
      return null
    }
    return client.getSession()
  }

  getQRCode(orgId: string): string | null {
    const client = this.sessions.get(orgId)
    if (!client) {
      return null
    }
    return client.getSession().qrCode || null
  }

  async sendMessage(
    orgId: string,
    chatId: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const client = this.sessions.get(orgId)
    if (!client) {
      return { success: false, error: 'Session not found' }
    }

    if (!client.isReady()) {
      return { success: false, error: 'WhatsApp client is not ready' }
    }

    try {
      const sentMessage = await client.sendMessage(chatId, message)
      return { success: true, messageId: sentMessage.id.id }
    } catch (err) {
      console.error(`[${orgId}] Error sending message:`, err)
      return { success: false, error: (err as Error).message }
    }
  }

  getActiveSessionsCount(): number {
    return this.sessions.size
  }

  getAllSessions(): WhatsAppSession[] {
    return Array.from(this.sessions.values()).map((client) => client.getSession())
  }
}

// Singleton instance
export const sessionManager = new SessionManager()
