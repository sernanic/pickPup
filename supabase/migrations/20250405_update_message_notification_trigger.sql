-- Drop the old trigger first
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message();

-- Create a function to handle message notifications using pg_notify instead of HTTP
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify about the new message using pg_notify
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'message_id', NEW.id,
      'thread_id', NEW.thread_id,
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'content', NEW.content,
      'created_at', NEW.created_at
    )::text
  );
  
  -- Update the thread's last message
  UPDATE public.message_threads
  SET 
    last_message = NEW.content,
    last_message_time = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();

-- Add comment
COMMENT ON FUNCTION public.handle_new_message IS 'Handles new message notifications and updates thread metadata';
