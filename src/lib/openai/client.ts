import type {
  GenerateResponseParams,
  GenerateResponseResult,
  OpenAIResponse,
  OpenAIError,
  ChatMessage,
} from './types'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

export async function generateResponse(
  params: GenerateResponseParams
): Promise<GenerateResponseResult> {
  const {
    apiKey,
    model,
    systemPrompt,
    messages,
    temperature = 0.7,
    maxTokens = 500,
  } = params

  if (!apiKey) {
    return {
      success: false,
      error: 'API ключ не настроен',
    }
  }

  // Build messages array with system prompt
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as OpenAIError

      // Handle specific error types
      if (response.status === 401) {
        return {
          success: false,
          error: 'Неверный API ключ',
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          error: 'Превышен лимит запросов. Попробуйте позже.',
        }
      }

      if (response.status === 400) {
        return {
          success: false,
          error: `Ошибка запроса: ${errorData.error?.message || 'Неизвестная ошибка'}`,
        }
      }

      return {
        success: false,
        error: errorData.error?.message || 'Ошибка OpenAI API',
      }
    }

    const data = (await response.json()) as OpenAIResponse

    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return {
        success: false,
        error: 'Пустой ответ от AI',
      }
    }

    return {
      success: true,
      content: content.trim(),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  } catch (error) {
    console.error('OpenAI API error:', error)

    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Ошибка соединения с OpenAI',
        }
      }
    }

    return {
      success: false,
      error: 'Неизвестная ошибка при обращении к AI',
    }
  }
}

// Test API key validity
export async function testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      }),
    })

    if (response.status === 401) {
      return { valid: false, error: 'Неверный API ключ' }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true }
    }

    if (!response.ok) {
      const data = (await response.json()) as OpenAIError
      return { valid: false, error: data.error?.message }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Ошибка проверки ключа' }
  }
}
