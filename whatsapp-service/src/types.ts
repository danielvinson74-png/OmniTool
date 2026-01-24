export interface WhatsAppSession {
  orgId: string
  status: 'disconnected' | 'qr' | 'connecting' | 'ready'
  qrCode?: string
  phoneNumber?: string
  pushname?: string
  platform?: string
}

export interface SessionCredentials {
  session_data?: string
  phone_number?: string
  pushname?: string
  platform?: string
  [key: string]: unknown
}

export interface IncomingMessage {
  id: string
  from: string // phone number with @c.us
  to: string
  body: string
  timestamp: number
  type: 'chat' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact'
  hasMedia: boolean
  mediaUrl?: string
  mimetype?: string
  filename?: string
  caption?: string
  location?: {
    latitude: number
    longitude: number
  }
  contact?: {
    name: string
    number: string
  }
}

export interface SendMessageRequest {
  chatId: string // phone number with @c.us
  message: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'document'
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface SessionStartResponse {
  success: boolean
  status: WhatsAppSession['status']
  qrCode?: string
  error?: string
}

export interface SessionStatusResponse {
  success: boolean
  status: WhatsAppSession['status']
  phoneNumber?: string
  pushname?: string
  error?: string
}
