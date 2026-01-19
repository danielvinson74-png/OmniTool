const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  audio?: TelegramAudio
  video?: TelegramVideo
  voice?: TelegramVoice
  sticker?: TelegramSticker
  location?: TelegramLocation
  caption?: string
}

export interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramAudio {
  file_id: string
  file_unique_id: string
  duration: number
  performer?: string
  title?: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramVideo {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramVoice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

export interface TelegramSticker {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  is_animated: boolean
  is_video: boolean
  emoji?: string
}

export interface TelegramLocation {
  longitude: number
  latitude: number
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  callback_query?: {
    id: string
    from: TelegramUser
    message?: TelegramMessage
    data?: string
  }
}

export interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

export interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export class TelegramClient {
  private token: string
  private baseUrl: string

  constructor(token: string) {
    this.token = token
    this.baseUrl = `${TELEGRAM_API_BASE}${token}`
  }

  private async request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/${method}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: params ? JSON.stringify(params) : undefined,
    })

    const data: TelegramApiResponse<T> = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error')
    }

    return data.result as T
  }

  async getMe(): Promise<TelegramBotInfo> {
    return this.request<TelegramBotInfo>('getMe')
  }

  async setWebhook(url: string, options?: {
    certificate?: string
    max_connections?: number
    allowed_updates?: string[]
    drop_pending_updates?: boolean
    secret_token?: string
  }): Promise<boolean> {
    return this.request<boolean>('setWebhook', { url, ...options })
  }

  async deleteWebhook(dropPendingUpdates?: boolean): Promise<boolean> {
    return this.request<boolean>('deleteWebhook', {
      drop_pending_updates: dropPendingUpdates
    })
  }

  async getWebhookInfo(): Promise<{
    url: string
    has_custom_certificate: boolean
    pending_update_count: number
    last_error_date?: number
    last_error_message?: string
  }> {
    return this.request('getWebhookInfo')
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      disable_web_page_preview?: boolean
      disable_notification?: boolean
      reply_to_message_id?: number
      reply_markup?: unknown
    }
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      ...options,
    })
  }

  async sendPhoto(
    chatId: number | string,
    photo: string,
    options?: {
      caption?: string
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      disable_notification?: boolean
      reply_to_message_id?: number
    }
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>('sendPhoto', {
      chat_id: chatId,
      photo,
      ...options,
    })
  }

  async sendDocument(
    chatId: number | string,
    document: string,
    options?: {
      caption?: string
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      disable_notification?: boolean
      reply_to_message_id?: number
    }
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>('sendDocument', {
      chat_id: chatId,
      document,
      ...options,
    })
  }

  async getFile(fileId: string): Promise<{
    file_id: string
    file_unique_id: string
    file_size?: number
    file_path?: string
  }> {
    return this.request('getFile', { file_id: fileId })
  }

  getFileUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.token}/${filePath}`
  }
}

export function createTelegramClient(token: string): TelegramClient {
  return new TelegramClient(token)
}
