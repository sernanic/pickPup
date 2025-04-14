-- Drop old triggers and functions that use the net extension
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message();

-- Drop any references to the net extension
DROP EXTENSION IF EXISTS net;
