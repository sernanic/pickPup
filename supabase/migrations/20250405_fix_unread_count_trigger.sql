-- Drop existing trigger and function
DROP TRIGGER IF EXISTS messages_unread_count_trigger ON messages;
DROP FUNCTION IF EXISTS public.update_unread_message_count();

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_unread_message_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  thread_owner_id UUID;
  thread_sitter_id UUID;
  count_change INTEGER;
BEGIN
  -- Get the owner and sitter IDs from the message thread
  SELECT owner_id, sitter_id INTO thread_owner_id, thread_sitter_id
  FROM message_threads
  WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);

  -- Determine how the count should change
  IF (TG_OP = 'INSERT' AND NEW.is_read = false) OR
     (TG_OP = 'UPDATE' AND NEW.is_read = false AND OLD.is_read = true) THEN
    count_change := 1;
  ELSIF (TG_OP = 'UPDATE' AND NEW.is_read = true AND OLD.is_read = false) OR
        (TG_OP = 'DELETE' AND OLD.is_read = false) THEN
    count_change := -1;
  ELSE
    RETURN NEW;
  END IF;

  -- Update count for owner if they're not the sender
  IF COALESCE(NEW.sender_id, OLD.sender_id) != thread_owner_id THEN
    INSERT INTO public.unread_message_counts (user_id, unread_count)
    VALUES (thread_owner_id, GREATEST(0, count_change))
    ON CONFLICT (user_id) DO UPDATE
    SET unread_count = GREATEST(0, unread_message_counts.unread_count + count_change),
        updated_at = now();
  END IF;

  -- Update count for sitter if they're not the sender
  IF COALESCE(NEW.sender_id, OLD.sender_id) != thread_sitter_id THEN
    INSERT INTO public.unread_message_counts (user_id, unread_count)
    VALUES (thread_sitter_id, GREATEST(0, count_change))
    ON CONFLICT (user_id) DO UPDATE
    SET unread_count = GREATEST(0, unread_message_counts.unread_count + count_change),
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER messages_unread_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_message_count();
