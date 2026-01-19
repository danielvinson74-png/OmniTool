import {
  CreatePaymentRequest,
  PaymentResponse,
  YooKassaError,
} from './types'

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

export class YooKassaClient {
  private shopId: string
  private secretKey: string

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID || ''
    this.secretKey = process.env.YOOKASSA_SECRET_KEY || ''

    if (!this.shopId || !this.secretKey) {
      console.warn('YooKassa credentials not configured')
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')
    return `Basic ${credentials}`
  }

  private generateIdempotenceKey(): string {
    return crypto.randomUUID()
  }

  /**
   * Создание платежа
   * https://yookassa.ru/developers/api#create_payment
   */
  async createPayment(
    request: CreatePaymentRequest,
    idempotenceKey?: string
  ): Promise<PaymentResponse> {
    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey || this.generateIdempotenceKey(),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error: YooKassaError = await response.json()
      throw new Error(`YooKassa error: ${error.description || error.code}`)
    }

    return response.json()
  }

  /**
   * Получение информации о платеже
   * https://yookassa.ru/developers/api#get_payment
   */
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error: YooKassaError = await response.json()
      throw new Error(`YooKassa error: ${error.description || error.code}`)
    }

    return response.json()
  }

  /**
   * Подтверждение платежа (для двухстадийной оплаты)
   * https://yookassa.ru/developers/api#capture_payment
   */
  async capturePayment(
    paymentId: string,
    amount?: { value: string; currency: string },
    idempotenceKey?: string
  ): Promise<PaymentResponse> {
    const body = amount ? { amount } : {}

    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey || this.generateIdempotenceKey(),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error: YooKassaError = await response.json()
      throw new Error(`YooKassa error: ${error.description || error.code}`)
    }

    return response.json()
  }

  /**
   * Отмена платежа
   * https://yookassa.ru/developers/api#cancel_payment
   */
  async cancelPayment(
    paymentId: string,
    idempotenceKey?: string
  ): Promise<PaymentResponse> {
    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey || this.generateIdempotenceKey(),
      },
    })

    if (!response.ok) {
      const error: YooKassaError = await response.json()
      throw new Error(`YooKassa error: ${error.description || error.code}`)
    }

    return response.json()
  }

  /**
   * Создать платеж для подписки
   */
  async createSubscriptionPayment(params: {
    organizationId: string
    planId: string
    planName: string
    amount: number
    billingPeriod: 'monthly' | 'yearly'
    returnUrl: string
    customerEmail?: string
  }): Promise<PaymentResponse> {
    const { organizationId, planId, planName, amount, billingPeriod, returnUrl, customerEmail } = params

    const periodLabel = billingPeriod === 'monthly' ? 'месяц' : 'год'
    const description = `Подписка "${planName}" на ${periodLabel}`

    const request: CreatePaymentRequest = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      capture: true,
      description,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
        billing_period: billingPeriod,
      },
    }

    // Добавляем чек если есть email
    if (customerEmail) {
      request.receipt = {
        customer: {
          email: customerEmail,
        },
        items: [
          {
            description: description.slice(0, 128), // Максимум 128 символов
            quantity: '1',
            amount: {
              value: amount.toFixed(2),
              currency: 'RUB',
            },
            vat_code: 1, // Без НДС
            payment_subject: 'service',
            payment_mode: 'full_payment',
          },
        ],
      }
    }

    return this.createPayment(request)
  }
}

// Singleton instance
let yookassaClient: YooKassaClient | null = null

export function getYooKassaClient(): YooKassaClient {
  if (!yookassaClient) {
    yookassaClient = new YooKassaClient()
  }
  return yookassaClient
}
