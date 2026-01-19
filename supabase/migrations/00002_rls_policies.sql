-- OmniTool RLS Policies
-- Migration: 00002_rls_policies

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT current_organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_member_of_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org admin or owner
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS: profiles
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- RLS: organizations
-- =====================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization"
    ON public.organizations FOR SELECT
    USING (public.is_member_of_organization(id) OR public.is_admin());

CREATE POLICY "Owner can update organization"
    ON public.organizations FOR UPDATE
    USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS: organization_members
-- =====================================================
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization members"
    ON public.organization_members FOR SELECT
    USING (public.is_member_of_organization(organization_id) OR public.is_admin());

CREATE POLICY "Org admins can manage members"
    ON public.organization_members FOR ALL
    USING (public.is_org_admin(organization_id) OR public.is_admin());

-- =====================================================
-- RLS: subscription_plans (public read)
-- =====================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can modify plans"
    ON public.subscription_plans FOR ALL
    USING (public.is_admin());

-- =====================================================
-- RLS: subscriptions
-- =====================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own organization subscription"
    ON public.subscriptions FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

-- Only via API (service role) for modifications
CREATE POLICY "Admin can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (public.is_admin());

-- =====================================================
-- RLS: payments
-- =====================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization payments"
    ON public.payments FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Admin can manage payments"
    ON public.payments FOR ALL
    USING (public.is_admin());

-- =====================================================
-- RLS: messenger_connections
-- =====================================================
ALTER TABLE public.messenger_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization connections"
    ON public.messenger_connections FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Org admins can manage connections"
    ON public.messenger_connections FOR INSERT
    WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can update connections"
    ON public.messenger_connections FOR UPDATE
    USING (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can delete connections"
    ON public.messenger_connections FOR DELETE
    USING (public.is_org_admin(organization_id));

-- =====================================================
-- RLS: leads
-- =====================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization leads"
    ON public.leads FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Members can create leads"
    ON public.leads FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Members can update organization leads"
    ON public.leads FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Members can delete organization leads"
    ON public.leads FOR DELETE
    USING (organization_id = public.get_user_organization_id());

-- =====================================================
-- RLS: conversations
-- =====================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization conversations"
    ON public.conversations FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Members can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Members can update organization conversations"
    ON public.conversations FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

-- =====================================================
-- RLS: messages
-- =====================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization messages"
    ON public.messages FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Members can create messages"
    ON public.messages FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

-- =====================================================
-- RLS: usage_stats
-- =====================================================
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization usage"
    ON public.usage_stats FOR SELECT
    USING (organization_id = public.get_user_organization_id() OR public.is_admin());

CREATE POLICY "Admin can manage usage stats"
    ON public.usage_stats FOR ALL
    USING (public.is_admin());
