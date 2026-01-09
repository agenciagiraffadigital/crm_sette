-- ============================================
-- Create notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'NEW_OPPORTUNITY',
    'OPPORTUNITY_ASSIGNED', 
    'PROPOSAL_STATUS_CHANGED',
    'DOCUMENT_UPLOADED',
    'DEADLINE_APPROACHING',
    'SYSTEM_MAINTENANCE'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND id = notifications.user_id
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND id = notifications.user_id
    )
  );

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Function to clean old notifications (optional)
-- ============================================
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than 30 days
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger to send real-time notifications
-- ============================================
CREATE OR REPLACE FUNCTION notify_user_realtime()
RETURNS TRIGGER AS $$
BEGIN
  -- Send real-time notification via pg_notify
  PERFORM pg_notify(
    'user_notification_' || NEW.user_id::text,
    json_build_object(
      'id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.message,
      'data', NEW.data,
      'created_at', NEW.created_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_user_realtime
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_realtime();