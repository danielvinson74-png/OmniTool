// YooKassa API Types
// Documentation: https://yookassa.ru/developers/api

export type PaymentStatus =
  | 'pending'
  | 'waiting_for_capture'
  | 'succeeded'
  | 'canceled'

export type ConfirmationType = 'redirect' | 'embedded' | 'qr' | 'mobile_application'

export type CurrencyCode = 'RUB' | 'USD' | 'EUR'

export interface Amount {
  value: string // Сумма в виде строки с 2 знаками после запятой
  currency: CurrencyCode
}

export interface Confirmation {
  type: ConfirmationType
  return_url?: string
  confirmation_url?: string // Возвращается в ответе
  locale?: 'ru_RU' | 'en_US'
}

export interface PaymentMethod {
  type: string
  id?: string
  saved?: boolean
  title?: string
  card?: {
    first6?: string
    last4?: string
    expiry_month?: string
    expiry_year?: string
    card_type?: string
    issuer_country?: string
    issuer_name?: string
  }
}

export interface Recipient {
  account_id: string
  gateway_id: string
}

export interface CancellationDetails {
  party: 'yoo_money' | 'payment_network' | 'merchant'
  reason: string
}

export interface Metadata {
  organization_id?: string
  plan_id?: string
  billing_period?: 'monthly' | 'yearly'
  [key: string]: string | undefined
}

// Запрос на создание платежа
export interface CreatePaymentRequest {
  amount: Amount
  confirmation: Confirmation
  capture?: boolean // Автоматическое подтверждение (по умолчанию true для одностадийной оплаты)
  description?: string
  metadata?: Metadata
  receipt?: Receipt
  save_payment_method?: boolean
  payment_method_id?: string // Для повторных платежей
}

// Ответ создания платежа
export interface PaymentResponse {
  id: string
  status: PaymentStatus
  amount: Amount
  description?: string
  recipient: Recipient
  payment_method?: PaymentMethod
  created_at: string
  captured_at?: string
  confirmation?: Confirmation
  test: boolean
  paid: boolean
  refundable: boolean
  metadata?: Metadata
  cancellation_details?: CancellationDetails
}

// Чек для ФФД 1.2
export interface Receipt {
  customer: {
    email?: string
    phone?: string
  }
  items: ReceiptItem[]
}

export interface ReceiptItem {
  description: string
  quantity: string
  amount: Amount
  vat_code: 1 | 2 | 3 | 4 | 5 | 6 // НДС: 1 = без НДС, 2 = 0%, 3 = 10%, 4 = 20%, 5 = 10/110, 6 = 20/120
  payment_subject?: 'commodity' | 'service' | 'payment'
  payment_mode?: 'full_payment' | 'partial_payment'
}

// Webhook события
export type WebhookEventType =
  | 'payment.succeeded'
  | 'payment.waiting_for_capture'
  | 'payment.canceled'
  | 'refund.succeeded'

export interface WebhookEvent {
  type: WebhookEventType
  event: WebhookEventType
  object: PaymentResponse
}

// Ошибки API
export interface YooKassaError {
  type: string
  id: string
  code: string
  description: string
  parameter?: string
}
