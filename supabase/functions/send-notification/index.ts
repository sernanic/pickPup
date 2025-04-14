import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import type { Database } from './types.ts';
import { DatabaseService } from './database.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseClient = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const db = new DatabaseService(supabaseClient);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, table, record, old_record } = await req.json();

    // Handle different notification types
    switch (table) {
      case 'messages':
        await handleMessageNotification(record);
        break;
      case 'walking_bookings':
      case 'boarding_bookings':
        await handleBookingNotification(table, record, old_record);
        break;
      case 'reviews':
        await handleReviewNotification(record);
        break;
      default:
        console.error(`Unsupported table: ${table}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing notification:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handleMessageNotification(message: any) {
  const thread = await db.getMessageThread(message.thread_id);
  if (!thread) {
    console.error('Thread not found:', message.thread_id);
    return;
  }

  const sender = await db.getProfile(message.sender_id);
  if (!sender) {
    console.error('Sender not found:', message.sender_id);
    return;
  }

  // Determine recipient based on thread participants
  const recipientId = thread.owner_id === message.sender_id
    ? thread.sitter_id
    : thread.owner_id;

  await db.createNotification({
    recipient_id: recipientId,
    type: 'message',
    title: sender.full_name,
    body: message.content,
    data: {
      threadId: message.thread_id,
      messageId: message.id,
    }
  });
}

async function handleBookingNotification(table: string, booking: any, oldBooking: any) {
  const isNewBooking = !oldBooking;
  const hasStatusChanged = oldBooking && booking.status !== oldBooking.status;

  if (!isNewBooking && !hasStatusChanged) return;

  const [owner, sitter] = await Promise.all([
    db.getProfile(booking.owner_id),
    db.getProfile(booking.sitter_id)
  ]);

  if (!owner || !sitter) {
    console.error('Owner or sitter not found');
    return;
  }

  if (isNewBooking) {
    // Notify sitter about new booking
    await db.createNotification({
      recipient_id: booking.sitter_id,
      type: 'booking_request',
      title: 'New Booking Request',
      body: `${owner.full_name} has requested a ${table === 'walking_bookings' ? 'walk' : 'boarding'} service`,
      data: { bookingId: booking.id, type: table }
    });
  } else if (hasStatusChanged) {
    // Notify owner about booking status change
    await db.createNotification({
      recipient_id: booking.owner_id,
      type: 'booking_status',
      title: 'Booking Status Updated',
      body: `Your booking with ${sitter.full_name} is now ${booking.status}`,
      data: { bookingId: booking.id, type: table, status: booking.status }
    });
  }
}

async function handleReviewNotification(review: any) {
  const reviewer = await db.getProfile(review.reviewer_id);
  if (!reviewer) {
    console.error('Reviewer not found:', review.reviewer_id);
    return;
  }

  await db.createNotification({
    recipient_id: review.reviewee_id,
    type: 'review',
    title: 'New Review',
    body: `${reviewer.full_name} has left you a review`,
    data: { reviewId: review.id }
  });
}
