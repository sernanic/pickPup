-- Create a function to trigger the Edge Function
create or replace function public.handle_new_message()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://' || net.http_get('https://app.supabase.com/project/' || current_database() || '/api')::json->>'hostname' || '/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}',
    body := json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', case TG_OP when 'DELETE' then row_to_json(OLD) else null end
    )::text
  );
  return NEW;
end;
$$ language plpgsql security definer;

-- Create the trigger
drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
  after insert on public.messages
  for each row
  execute procedure public.handle_new_message();
