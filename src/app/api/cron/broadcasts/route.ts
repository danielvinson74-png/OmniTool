import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessageToConversation } from '@/lib/broadcasts/send-message'

const CRON_SECRET = process.env.CRON_SECRET || ''

// POST /api/cron/broadcasts
// Called every 60 seconds by the Alpine cron container.
// Claims a batch of pending recipients and sends their messages.
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const supabase = createAdminClient()
  let processed = 0

  try {
    // Atomically claim a batch of pending recipients
    const { data: recipients, error: claimError } = await supabase
      .rpc('claim_broadcast_recipients', { batch_size: 10 })

    if (claimError) throw claimError
    if (!recipients?.length) {
      return NextResponse.json({ success: true, processed: 0, duration_ms: Date.now() - startTime })
    }

    // Cache broadcast configs to avoid re-fetching for each recipient
    const broadcastCache: Record<string, { delay_between_sends: number; messenger_type: string | null }> = {}

    for (const recipient of recipients) {
      // Fetch broadcast config (cached)
      if (!broadcastCache[recipient.broadcast_id]) {
        const { data: bc } = await supabase
          .from('broadcasts')
          .select('delay_between_sends, messenger_type')
          .eq('id', recipient.broadcast_id)
          .single()

        if (bc) broadcastCache[recipient.broadcast_id] = bc
      }

      const broadcastConfig = broadcastCache[recipient.broadcast_id]

      // Fetch step message text
      const { data: step } = await supabase
        .from('broadcast_steps')
        .select('message_text')
        .eq('id', recipient.step_id)
        .single()

      if (!step) {
        await supabase
          .from('broadcast_recipients')
          .update({ status: 'skipped', updated_at: new Date().toISOString() } as never)
          .eq('id', recipient.id)
        continue
      }

      // Send the message
      const result = await sendMessageToConversation(
        supabase,
        recipient.organization_id,
        recipient.conversation_id,
        step.message_text
      )

      if (result.success) {
        await supabase
          .from('broadcast_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: result.messageId ?? null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', recipient.id)

        // Increment stats_sent atomically
        await supabase.rpc('increment_broadcast_stat' as never, {
          broadcast_id: recipient.broadcast_id,
          stat_name: 'stats_sent',
        } as never).catch(() => {
          // Fallback: manual increment
          supabase
            .from('broadcasts')
            .select('stats_sent')
            .eq('id', recipient.broadcast_id)
            .single()
            .then(({ data }) => {
              if (data) {
                supabase
                  .from('broadcasts')
                  .update({ stats_sent: (data.stats_sent ?? 0) + 1 } as never)
                  .eq('id', recipient.broadcast_id)
              }
            })
        })
      } else {
        await supabase
          .from('broadcast_recipients')
          .update({
            status: 'failed',
            error_message: result.error ?? 'Unknown error',
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', recipient.id)

        // Increment stats_failed
        const { data: bc } = await supabase
          .from('broadcasts')
          .select('stats_failed')
          .eq('id', recipient.broadcast_id)
          .single()
        if (bc) {
          await supabase
            .from('broadcasts')
            .update({ stats_failed: (bc.stats_failed ?? 0) + 1 } as never)
            .eq('id', recipient.broadcast_id)
        }
      }

      processed++

      // Apply inter-recipient delay (WhatsApp anti-ban)
      const delaySec = broadcastConfig?.delay_between_sends ?? 0
      if (delaySec > 0) {
        await new Promise((resolve) => setTimeout(resolve, delaySec * 1000))
      }
    }

    // Check if any broadcasts are now fully complete
    const broadcastIds = [...new Set(recipients.map((r) => r.broadcast_id))]
    for (const broadcastId of broadcastIds) {
      const { count: pendingCount } = await supabase
        .from('broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcastId)
        .in('status', ['pending', 'sending'])

      if (pendingCount === 0) {
        await supabase
          .from('broadcasts')
          .update({
            status: 'sent',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', broadcastId)
          .in('status', ['sending', 'scheduled'])
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      duration_ms: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Cron broadcasts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
