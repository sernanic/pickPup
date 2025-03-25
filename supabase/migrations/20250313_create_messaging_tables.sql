-- Create message_threads table to track conversations between users
CREATE TABLE IF NOT EXISTS "message_threads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" UUID REFERENCES "walking_bookings"("id") ON DELETE CASCADE,
  "owner_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sitter_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "last_message" TEXT,
  "last_message_time" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table to store individual messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" UUID NOT NULL REFERENCES "message_threads"("id") ON DELETE CASCADE,
  "sender_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "idx_messages_thread_id" ON "messages" ("thread_id");
CREATE INDEX IF NOT EXISTS "idx_message_threads_owner_id" ON "message_threads" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_message_threads_sitter_id" ON "message_threads" ("sitter_id");

-- Trigger to update the last_message and last_message_time in the thread
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET 
    last_message = NEW.content,
    last_message_time = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to fire the function after messages insert
CREATE TRIGGER trigger_update_thread_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_last_message();
