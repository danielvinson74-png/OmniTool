import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js'
import * as qrcode from 'qrcode'
import { WhatsAppSession, IncomingMessage } from './types'

export class WhatsAppClient {
  private client: Client
  private session: WhatsAppSession
  private onMessageCallback?: (message: IncomingMessage) => void
  private onStatusChangeCallback?: (session: WhatsAppSession) => void

  constructor(orgId: string, sessionPath: string) {
    this.session = {
      orgId,
      status: 'disconnected',
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: orgId,
        dataPath: sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.client.on('qr', async (qr) => {
      console.log(`[${this.session.orgId}] QR code received`)
      try {
        // Generate QR code as data URL
        const qrDataUrl = await qrcode.toDataURL(qr, {
          width: 256,
          margin: 2,
        })
        this.session.status = 'qr'
        this.session.qrCode = qrDataUrl
        this.notifyStatusChange()
      } catch (err) {
        console.error('Error generating QR code:', err)
      }
    })

    this.client.on('authenticated', () => {
      console.log(`[${this.session.orgId}] Authenticated`)
      this.session.status = 'connecting'
      this.session.qrCode = undefined
      this.notifyStatusChange()
    })

    this.client.on('ready', async () => {
      console.log(`[${this.session.orgId}] Client is ready`)

      // Get client info
      const info = this.client.info
      this.session.status = 'ready'
      this.session.phoneNumber = info.wid.user
      this.session.pushname = info.pushname
      this.session.platform = info.platform

      this.notifyStatusChange()
    })

    this.client.on('disconnected', (reason) => {
      console.log(`[${this.session.orgId}] Disconnected:`, reason)
      this.session.status = 'disconnected'
      this.session.qrCode = undefined
      this.session.phoneNumber = undefined
      this.notifyStatusChange()
    })

    this.client.on('auth_failure', (msg) => {
      console.error(`[${this.session.orgId}] Auth failure:`, msg)
      this.session.status = 'disconnected'
      this.notifyStatusChange()
    })

    this.client.on('message', async (msg: Message) => {
      if (this.onMessageCallback) {
        try {
          const incomingMessage = await this.parseMessage(msg)
          this.onMessageCallback(incomingMessage)
        } catch (err) {
          console.error('Error parsing message:', err)
        }
      }
    })
  }

  private async parseMessage(msg: Message): Promise<IncomingMessage> {
    const contact = await msg.getContact()

    const message: IncomingMessage = {
      id: msg.id.id,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      timestamp: msg.timestamp,
      type: this.getMessageType(msg),
      hasMedia: msg.hasMedia,
    }

    // Handle media
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia()
        if (media) {
          message.mediaUrl = `data:${media.mimetype};base64,${media.data}`
          message.mimetype = media.mimetype
          message.filename = media.filename || undefined
        }
      } catch (err) {
        console.error('Error downloading media:', err)
      }
    }

    // Handle caption for media messages
    if (msg.body && msg.hasMedia) {
      message.caption = msg.body
    }

    // Handle location
    if (msg.location) {
      message.location = {
        latitude: Number(msg.location.latitude),
        longitude: Number(msg.location.longitude),
      }
      message.body = `📍 ${msg.location.latitude}, ${msg.location.longitude}`
    }

    return message
  }

  private getMessageType(msg: Message): IncomingMessage['type'] {
    if (msg.type === 'image') return 'image'
    if (msg.type === 'video') return 'video'
    if (msg.type === 'audio' || msg.type === 'ptt') return 'audio'
    if (msg.type === 'document') return 'document'
    if (msg.type === 'sticker') return 'sticker'
    if (msg.type === 'location') return 'location'
    if (msg.type === 'vcard' || msg.type === 'multi_vcard') return 'contact'
    return 'chat'
  }

  private notifyStatusChange() {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ ...this.session })
    }
  }

  onMessage(callback: (message: IncomingMessage) => void) {
    this.onMessageCallback = callback
  }

  onStatusChange(callback: (session: WhatsAppSession) => void) {
    this.onStatusChangeCallback = callback
  }

  async start(): Promise<WhatsAppSession> {
    console.log(`[${this.session.orgId}] Starting client...`)
    await this.client.initialize()
    return this.session
  }

  async stop(): Promise<void> {
    console.log(`[${this.session.orgId}] Stopping client...`)
    try {
      await this.client.destroy()
    } catch (err) {
      console.error('Error destroying client:', err)
    }
    this.session.status = 'disconnected'
    this.session.qrCode = undefined
  }

  async sendMessage(chatId: string, message: string): Promise<Message> {
    if (this.session.status !== 'ready') {
      throw new Error('WhatsApp client is not ready')
    }
    return await this.client.sendMessage(chatId, message)
  }

  async sendMedia(
    chatId: string,
    mediaUrl: string,
    caption?: string
  ): Promise<Message> {
    if (this.session.status !== 'ready') {
      throw new Error('WhatsApp client is not ready')
    }
    const media = await MessageMedia.fromUrl(mediaUrl)
    return await this.client.sendMessage(chatId, media, { caption })
  }

  getSession(): WhatsAppSession {
    return { ...this.session }
  }

  isReady(): boolean {
    return this.session.status === 'ready'
  }
}
