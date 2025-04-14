-- Drop existing notification function and triggers
DROP TRIGGER IF EXISTS messages_notification_trigger ON messages;
DROP TRIGGER IF EXISTS walking_bookings_notification_trigger ON walking_bookings;
DROP TRIGGER IF EXISTS boarding_bookings_notification_trigger ON boarding_bookings;
DROP TRIGGER IF EXISTS reviews_notification_trigger ON reviews;
DROP FUNCTION IF EXISTS invoke_send_notification();

-- Create a new notification function using pg_notify instead of net.http_post
CREATE OR REPLACE FUNCTION invoke_send_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Use pg_notify to send notifications
  PERFORM pg_notify(
    'app_notifications',
    jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'schema', TG_TABLE_SCHEMA,
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION invoke_send_notification IS 'Sends notifications using pg_notify when records are changed';

-- Re-create all triggers with the updated function
CREATE TRIGGER messages_notification_trigger
  AFTER INSERT OR UPDATE
  ON messages
  FOR EACH ROW
  EXECUTE FUNCTION invoke_send_notification();

CREATE TRIGGER walking_bookings_notification_trigger
  AFTER INSERT OR UPDATE
  ON walking_bookings
  FOR EACH ROW
  EXECUTE FUNCTION invoke_send_notification();

CREATE TRIGGER boarding_bookings_notification_trigger
  AFTER INSERT OR UPDATE
  ON boarding_bookings
  FOR EACH ROW
  EXECUTE FUNCTION invoke_send_notification();

CREATE TRIGGER reviews_notification_trigger
  AFTER INSERT
  ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION invoke_send_notification();
