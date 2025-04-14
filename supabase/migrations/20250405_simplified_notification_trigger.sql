-- Drop any existing triggers
DROP TRIGGER IF EXISTS messages_notification_trigger ON messages;
DROP TRIGGER IF EXISTS walking_bookings_notification_trigger ON walking_bookings;
DROP TRIGGER IF EXISTS boarding_bookings_notification_trigger ON boarding_bookings;
DROP TRIGGER IF EXISTS reviews_notification_trigger ON reviews;
DROP FUNCTION IF EXISTS invoke_send_notification();
DROP FUNCTION IF EXISTS handle_new_message();

-- Create a simple function to handle notifications
CREATE OR REPLACE FUNCTION handle_database_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Use pg_notify to send the change event
  PERFORM pg_notify(
    'database_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for each table
CREATE TRIGGER messages_notification_trigger
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_database_change();

CREATE TRIGGER walking_bookings_notification_trigger
  AFTER INSERT OR UPDATE ON walking_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_database_change();

CREATE TRIGGER boarding_bookings_notification_trigger
  AFTER INSERT OR UPDATE ON boarding_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_database_change();

CREATE TRIGGER reviews_notification_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION handle_database_change();
