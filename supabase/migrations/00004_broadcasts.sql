-- OmniTool Broadcasts Schema
-- Migration: 00004_broadcasts

-- Ensure update_updated_at_column exists (may already exist from 00001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLE: broadcasts
-- Top-level broadcast campaign record
-- =====================================================
CREATE TABLE public.broadcasts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by           UUID NOT NULL REFERENCES auth.users(id),

    name                 VARCHAR(255) NOT NULL,
    description          TEXT,

    -- draft     → being built, not yet launched
    -- scheduled → has a future scheduled_at, waiting for cron
    -- sending   → cron picked it up, actively dispatching
    -- sent      → all recipients processed
    -- cancelled → user cancelled before or during send
    status               VARCHAR(50) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),

    -- NULL = send immediately when launched
    scheduled_at         TIMESTAMPTZ,

    -- Segment filters: { "statuses": ["new","contacted"], "tags": ["vip"] }
    -- Empty arrays = no filter on that dimension (include all)
    segment_filters      JSONB NOT NULL DEFAULT '{"statuses": [], "tags": []}',

    -- NULL = all active messengers, otherwise specific type
    messenger_type       VARCHAR(50) CHECK (messenger_type IN ('telegram', 'whatsapp')),

    -- Delay between recipients (seconds) — for WhatsApp anti-ban
    delay_between_sends  INTEGER NOT NULL DEFAULT 5
                         CHECK (delay_between_sends >= 0 AND delay_between_sends <= 60),

    -- Denormalized stats (updated after each send for quick display)
    stats_total          INTEGER NOT NULL DEFAULT 0,
    stats_sent           INTEGER NOT NULL DEFAULT 0,
    stats_failed         INTEGER NOT NULL DEFAULT 0,
    stats_replied        INTEGER NOT NULL DEFAULT 0,

    started_at           TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_org       ON public.broadcasts(organization_id);
CREATE INDEX idx_broadcasts_status    ON public.broadcasts(status);
CREATE INDEX idx_broadcasts_scheduled ON public.broadcasts(scheduled_at)
    WHERE status = 'scheduled';

-- =====================================================
-- TABLE: broadcast_steps
-- Ordered chain of messages with inter-step delays
-- =====================================================
CREATE TABLE public.broadcast_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id    UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    step_order      INTEGER NOT NULL CHECK (step_order >= 0),
    message_text    TEXT NOT NULL,

    -- Days to wait BEFORE this step fires (always 0 for the first step)
    delay_days      INTEGER NOT NULL DEFAULT 0
                    CHECK (delay_days >= 0 AND delay_days <= 365),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(broadcast_id, step_order)
);

CREATE INDEX idx_broadcast_steps_broadcast ON public.broadcast_steps(broadcast_id);

-- =====================================================
-- TABLE: broadcast_recipients
-- One row per (conversation × step) combination.
-- Created when broadcast is launched.
-- =====================================================
CREATE TABLE public.broadcast_recipients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id    UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
    step_id         UUID NOT NULL REFERENCES public.broadcast_steps(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    lead_id             UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    conversation_id     UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

    -- When this step should fire for this recipient
    scheduled_send_at   TIMESTAMPTZ NOT NULL,

    -- pending  → waiting for scheduled_send_at
    -- sending  → cron currently processing
    -- sent     → message delivered to messenger API
    -- failed   → messenger API returned error
    -- skipped  → conversation became invalid before send
    status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),

    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    message_id      UUID REFERENCES public.messages(id) ON DELETE SET NULL,

    -- True if lead replied AFTER this step was sent
    has_replied     BOOLEAN NOT NULL DEFAULT false,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(broadcast_id, step_id, lead_id)
);

CREATE INDEX idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_conv      ON public.broadcast_recipients(conversation_id);
CREATE INDEX idx_broadcast_recipients_status    ON public.broadcast_recipients(status);
-- Key index for cron: find all pending rows due now
CREATE INDEX idx_broadcast_recipients_pending   ON public.broadcast_recipients(scheduled_send_at)
    WHERE status = 'pending';

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================
CREATE TRIGGER update_broadcasts_updated_at
    BEFORE UPDATE ON public.broadcasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broadcast_steps_updated_at
    BEFORE UPDATE ON public.broadcast_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broadcast_recipients_updated_at
    BEFORE UPDATE ON public.broadcast_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-increment stats_replied on broadcast
-- when a recipient marks has_replied = true
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_broadcast_replied()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.has_replied = true AND OLD.has_replied = false THEN
        UPDATE public.broadcasts
        SET stats_replied = stats_replied + 1
        WHERE id = NEW.broadcast_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_broadcast_recipient_replied
    AFTER UPDATE OF has_replied ON public.broadcast_recipients
    FOR EACH ROW EXECUTE FUNCTION public.increment_broadcast_replied();

-- =====================================================
-- RPC: Atomically claim a batch of pending recipients
-- Uses SELECT FOR UPDATE SKIP LOCKED to prevent
-- duplicate processing if cron invocations overlap
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_broadcast_recipients(batch_size INTEGER DEFAULT 10)
RETURNS SETOF public.broadcast_recipients AS $$
    UPDATE public.broadcast_recipients
    SET status = 'sending', updated_at = NOW()
    WHERE id IN (
        SELECT id FROM public.broadcast_recipients
        WHERE status = 'pending'
          AND scheduled_send_at <= NOW()
        ORDER BY scheduled_send_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
$$ LANGUAGE sql;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- broadcasts
CREATE POLICY "Members can view organization broadcasts"
    ON public.broadcasts FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Members can create broadcasts"
    ON public.broadcasts FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Members can update organization broadcasts"
    ON public.broadcasts FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Members can delete draft broadcasts"
    ON public.broadcasts FOR DELETE
    USING (organization_id = public.get_user_organization_id() AND status = 'draft');

-- broadcast_steps
CREATE POLICY "Members can view organization broadcast steps"
    ON public.broadcast_steps FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Members can manage broadcast steps"
    ON public.broadcast_steps FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- broadcast_recipients
CREATE POLICY "Members can view organization broadcast recipients"
    ON public.broadcast_recipients FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Members can manage broadcast recipients"
    ON public.broadcast_recipients FOR ALL
    USING (organization_id = public.get_user_organization_id());
