-- OmniTool Database Schema
-- Migration: 00001_initial_schema

-- =====================================================
-- TABLE: organizations (Tenants)
-- =====================================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- =====================================================
-- TABLE: organization_members
-- =====================================================
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,

    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);

-- =====================================================
-- TABLE: profiles
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    timezone VARCHAR(100) DEFAULT 'Europe/Moscow',
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    current_organization_id UUID REFERENCES public.organizations(id),
    notification_settings JSONB DEFAULT '{
        "email_new_message": true,
        "email_new_lead": true,
        "push_enabled": false
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- =====================================================
-- TABLE: subscription_plans
-- =====================================================
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    dialog_limit INTEGER, -- NULL = unlimited
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed subscription plans
INSERT INTO public.subscription_plans (name, slug, price_monthly, price_yearly, dialog_limit, features, sort_order) VALUES
('Free', 'free', 0, 0, 50, '["50 диалогов/мес", "1 мессенджер", "Базовая CRM"]', 0),
('Basic', 'basic', 990, 9900, 500, '["500 диалогов/мес", "2 мессенджера", "Расширенная CRM", "Email поддержка"]', 1),
('Pro', 'pro', 2490, 24900, 2000, '["2000 диалогов/мес", "Все мессенджеры", "Полная CRM", "Приоритетная поддержка", "API доступ"]', 2),
('Business', 'business', 4990, 49900, NULL, '["Безлимитные диалоги", "Все мессенджеры", "Полная CRM", "Выделенный менеджер", "Custom интеграции"]', 3);

-- =====================================================
-- TABLE: subscriptions
-- =====================================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    yookassa_subscription_id VARCHAR(255),
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)
);

CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- =====================================================
-- TABLE: payments
-- =====================================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    yookassa_payment_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled', 'refunded')),
    payment_method JSONB,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_org ON public.payments(organization_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_yookassa ON public.payments(yookassa_payment_id);

-- =====================================================
-- TABLE: messenger_connections
-- =====================================================
CREATE TABLE public.messenger_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    messenger_type VARCHAR(50) NOT NULL CHECK (messenger_type IN ('telegram', 'whatsapp', 'viber', 'vk', 'instagram')),
    connection_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    credentials JSONB NOT NULL, -- Encrypted: bot_token, api_key, etc.
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    settings JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, messenger_type)
);

CREATE INDEX idx_messenger_conn_org ON public.messenger_connections(organization_id);
CREATE INDEX idx_messenger_conn_type ON public.messenger_connections(messenger_type);

-- =====================================================
-- TABLE: leads
-- =====================================================
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    external_id_type VARCHAR(50) DEFAULT 'telegram',
    username VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    niche VARCHAR(255),
    budget VARCHAR(255),
    has_website BOOLEAN,
    uses_ads BOOLEAN,
    ad_types TEXT,
    city VARCHAR(255),
    source VARCHAR(50) DEFAULT 'telegram',
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost')),
    assigned_to UUID REFERENCES auth.users(id),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    last_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX idx_leads_external ON public.leads(external_id, external_id_type);

-- =====================================================
-- TABLE: conversations
-- =====================================================
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    messenger_connection_id UUID NOT NULL REFERENCES public.messenger_connections(id) ON DELETE CASCADE,
    external_chat_id VARCHAR(255) NOT NULL,
    messenger_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived', 'spam')),
    assigned_to UUID REFERENCES auth.users(id),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, messenger_type, external_chat_id)
);

CREATE INDEX idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX idx_conversations_lead ON public.conversations(lead_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- =====================================================
-- TABLE: messages
-- =====================================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'lead', 'system', 'ai')),
    sender_id UUID,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'location', 'contact')),
    attachments JSONB DEFAULT '[]',
    external_message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    is_ai_generated BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_org ON public.messages(organization_id);
CREATE INDEX idx_messages_conv ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- =====================================================
-- TABLE: usage_stats
-- =====================================================
CREATE TABLE public.usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    dialogs_count INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, period_start)
);

CREATE INDEX idx_usage_stats_org ON public.usage_stats(organization_id);
CREATE INDEX idx_usage_stats_period ON public.usage_stats(period_start);

-- =====================================================
-- FUNCTION: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messenger_connections_updated_at
    BEFORE UPDATE ON public.messenger_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Handle new user registration
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    free_plan_id UUID;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );

    -- Create organization
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '''s Workspace'),
        LOWER(REPLACE(NEW.id::text, '-', '')),
        NEW.id
    )
    RETURNING id INTO org_id;

    -- Add user as owner of organization
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
    VALUES (org_id, NEW.id, 'owner', NOW());

    -- Set current organization
    UPDATE public.profiles
    SET current_organization_id = org_id
    WHERE id = NEW.id;

    -- Create free subscription
    SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;

    INSERT INTO public.subscriptions (organization_id, plan_id, current_period_end)
    VALUES (org_id, free_plan_id, NOW() + INTERVAL '100 years');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
