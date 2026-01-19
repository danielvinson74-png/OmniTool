export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'

export interface AISettings {
  id: string
  organization_id: string
  is_enabled: boolean
  provider: 'openai'
  api_key: string | null
  model: OpenAIModel
  temperature: number
  max_tokens: number
  system_prompt: string
  auto_reply_delay_seconds: number
  context_messages_count: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenAIError {
  error: {
    message: string
    type: string
    param?: string
    code?: string
  }
}

export interface GenerateResponseParams {
  apiKey: string
  model: OpenAIModel
  systemPrompt: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
}

export interface GenerateResponseResult {
  success: boolean
  content?: string
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
