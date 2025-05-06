// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import client libraries
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Platform fee percentage (10%)
const PLATFORM_FEE_PERCENTAGE = 0.1

interface RequestBody {
  customer_id: string
  total_price: number
  sitter_id: string
  booking_id: string
  booking_type: 'walking' | 'boarding'
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    
    const { customer_id, total_price, sitter_id, booking_id, booking_type } = body as RequestBody

    // Get sitter's Stripe account ID
    const { data: sitterProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', sitter_id)
      .single()

    if (!sitterProfile?.stripe_account_id) {
      throw new Error('Sitter Stripe account not found')
    }

    // Get customer's default payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer_id,
      type: 'card',
      limit: 1
    })

    if (!paymentMethods.data[0]?.id) {
      throw new Error('No payment method found')
    }

    // Calculate platform fee
    const amount = Math.round(total_price * 100) // Convert to cents
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE)

    // Create and confirm PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customer_id,
      payment_method: paymentMethods.data[0].id,
      off_session: true,
      confirm: true,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: sitterProfile.stripe_account_id,
      },
      metadata: {
        booking_id,
        sitter_id
      }
    })

    // Update booking with payment info based on booking type
    if (booking_type === 'walking' || !booking_type) {
      // Default to walking bookings for backward compatibility
      await supabase
        .from('walking_bookings')
        .update({
          payment_intent_id: paymentIntent.id,
          status: 'confirmed'
        })
        .eq('id', booking_id)
      
    } else if (booking_type === 'boarding') {
      await supabase
        .from('boarding_bookings')
        .update({
          payment_intent_id: paymentIntent.id,
          status: 'confirmed'
        })
        .eq('id', booking_id)
      
    } else {
      console.log(`Unknown booking type: ${booking_type}`);
    }

    return new Response(
      JSON.stringify({
        paymentIntentId: paymentIntent.id
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.log('Error in charge-payment:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack || 'No stack trace available'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
