-- AI Settings table for organization-level AI configuration
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Main settings
  is_enabled BOOLEAN DEFAULT false,
  provider TEXT DEFAULT 'openai' CHECK (provider IN ('openai')),
  api_key TEXT,  -- encrypted API key

  -- Model settings
  model TEXT DEFAULT 'gpt-4o-mini' CHECK (model IN ('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo')),
  temperature DECIMAL(2,1) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 500 CHECK (max_tokens > 0 AND max_tokens <= 4096),

  -- System prompt
  system_prompt TEXT DEFAULT 'Ты вежливый помощник компании. Отвечай кратко и по делу на русском языке.',

  -- Behavior settings
  auto_reply_delay_seconds INTEGER DEFAULT 2 CHECK (auto_reply_delay_seconds >= 0 AND auto_reply_delay_seconds <= 30),
  context_messages_count INTEGER DEFAULT 10 CHECK (context_messages_count >= 1 AND context_messages_count <= 50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Add ai_enabled column to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- RLS policies for ai_settings
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view AI settings for their organization
CREATE POLICY "Users can view own organization AI settings"
  ON ai_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Policy: Users can insert AI settings for their organization
CREATE POLICY "Users can insert own organization AI settings"
  ON ai_settings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Policy: Users can update AI settings for their organization
CREATE POLICY "Users can update own organization AI settings"
  ON ai_settings FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Policy: Users can delete AI settings for their organization
CREATE POLICY "Users can delete own organization AI settings"
  ON ai_settings FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Index for faster lookups
CREATE INDEX idx_ai_settings_organization_id ON ai_settings(organization_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_settings_updated_at();
