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

interface RequestBody {
  owner_id: string
  sitter_id: string
  availability_slot_id: string
  booking_date: string
  start_time: string
  end_time: string
  selected_pets: string // Now a JSON string from frontend
  total_price: number
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('Request body received:', JSON.stringify(body))
    
    const { owner_id, sitter_id, availability_slot_id, booking_date, start_time, 
            end_time, selected_pets, total_price } = body as RequestBody
            
    // Parse the selected_pets string back to an object
    let parsedPets
    try {
      parsedPets = JSON.parse(selected_pets)
    } catch (e) {
      console.error('Error parsing selected_pets:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid selected_pets format' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get or create Stripe customer and get sitter's Stripe account
    const [ownerResult, sitterResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', owner_id)
        .single(),
      supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', sitter_id)
        .single()
    ])
    
    const { data: ownerProfile } = ownerResult
    const { data: sitterProfile } = sitterResult
    
    // Check if sitter has a Stripe account
    if (!sitterProfile?.stripe_account_id) {
      console.error('Sitter does not have a Stripe account set up')
      return new Response(
        JSON.stringify({ error: 'This sitter is not set up to receive payments yet' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    let customerID = ownerProfile?.stripe_customer_id
    const sitterStripeAccountID = sitterProfile.stripe_account_id

    if (!customerID) {
      // Get user email for creating Stripe customer
      const { data: user } = await supabase.auth.admin.getUserById(owner_id)
      if (!user?.user?.email) {
        throw new Error('User email not found')
      }

      const customer = await stripe.customers.create({
        email: user.user.email,
        metadata: { supabase_id: owner_id }
      })
      customerID = customer.id

      // Update profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerID })
        .eq('id', owner_id)
    }

    // Create a pending booking
    const { data: booking, error: bookingError } = await supabase
      .from('walking_bookings')
      .insert({
        owner_id,
        sitter_id,
        availability_slot_id,
        booking_date,
        start_time,
        end_time,
        selected_pets: parsedPets, // Use the parsed pets object
        total_price,
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError || !booking) {
      throw new Error('Failed to create booking')
    }

    // Create SetupIntent for saving card
    // Including transfer_data to specify the destination for funds
    const setupIntent = await stripe.setupIntents.create({
      customer: customerID,
      payment_method_types: ['card'],
      metadata: {
        booking_id: booking.id,
        sitter_id: sitter_id
      },
      // When this card is used for payment, funds will be transferred to the sitter's account
      on_behalf_of: sitterStripeAccountID
    })
    
    console.log('Created SetupIntent with destination account:', sitterStripeAccountID)

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
        bookingId: booking.id,
        customerId: customerID,
        sitterAccountId: sitterStripeAccountID
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in init-payment:', error)
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
