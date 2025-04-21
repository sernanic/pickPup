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

interface BaseRequestBody {
  owner_id: string
  sitter_id: string
  selected_pets: string // JSON string from frontend
  total_price: number
  booking_type: 'walking' | 'boarding'
}

interface WalkingRequestBody extends BaseRequestBody {
  booking_type: 'walking'
  availability_slot_id?: string  // Now optional since we'll find it dynamically
  booking_date: string
  start_time: string
  end_time: string
  weekday: number  // Add weekday field (0-6 for Sunday-Saturday)
}

interface BoardingRequestBody extends BaseRequestBody {
  booking_type: 'boarding'
  start_date: string
  end_date: string
}

type RequestBody = WalkingRequestBody | BoardingRequestBody

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('Request body received:', JSON.stringify(body))
    
    const { owner_id, sitter_id, selected_pets, total_price, booking_type } = body as RequestBody
    
    // Log the booking type for debugging
    console.log(`Processing ${booking_type} booking`)
            
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

    // Create a pending booking based on booking type
    let booking;
    let bookingError;
    
    if (booking_type === 'walking') {
      // Extract walking-specific fields
      const { booking_date, start_time, end_time, weekday } = body as WalkingRequestBody;
      
      // Find the appropriate availability slot based on weekday
      let availability_slot_id = null;
      if (weekday !== undefined) {
        // Convert weekday to number if needed
        const weekdayNumber = typeof weekday === 'string' ? parseInt(weekday, 10) : weekday;
        
        // First, try to find an exact match for the weekday
        let { data: availabilityData, error: availabilityError } = await supabase
          .from('sitter_weekly_availability')
          .select('id')
          .eq('sitter_id', sitter_id)
          .eq('weekday', weekdayNumber)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error if no rows found
          
        if (availabilityError) {
          console.error('Error finding availability slot:', availabilityError);
        } else if (availabilityData) {
          availability_slot_id = availabilityData.id;
          console.log(`Found availability_slot_id: ${availability_slot_id} for weekday: ${weekday}`);
        } else {
          // If no exact match, try to find any availability slot for this sitter
          console.log(`No availability found for weekday ${weekday}, trying to find any slot`);
          const { data: anySlotData, error: anySlotError } = await supabase
            .from('sitter_weekly_availability')
            .select('id')
            .eq('sitter_id', sitter_id)
            .limit(1)
            .maybeSingle();
            
          if (anySlotError) {
            console.error('Error finding any availability slot:', anySlotError);
          } else if (anySlotData) {
            availability_slot_id = anySlotData.id;
            console.log(`Found fallback availability_slot_id: ${availability_slot_id}`);
          }
        }
      }
      
      // If still no availability slot, we'll use a UUID generator to create a fake one
      // This is needed because the walking_bookings table requires this field
      if (!availability_slot_id) {
        console.warn('No availability slot found, creating booking anyway');
        // Generate a random UUID for the availability_slot_id
        availability_slot_id = crypto.randomUUID();
        console.log(`Created placeholder availability_slot_id: ${availability_slot_id}`);
      }
      
      // Create walking booking
      const result = await supabase
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
        .single();
        
      booking = result.data;
      bookingError = result.error;
    } else if (booking_type === 'boarding') {
      // Extract boarding-specific fields
      const { start_date, end_date } = body as BoardingRequestBody;
      
      console.log(`Creating boarding booking: ${start_date} to ${end_date} for pets: ${selected_pets}`);
      
      // Create boarding booking
      const result = await supabase
        .from('boarding_bookings')
        .insert({
          owner_id,
          sitter_id,
          start_date,
          end_date,
          selected_pets: parsedPets, // Use the parsed pets object
          total_price,
          status: 'pending'
        })
        .select()
        .single();
        
      booking = result.data;
      bookingError = result.error;
    } else {
      throw new Error(`Invalid booking type: ${booking_type}`);
    }

    if (bookingError || !booking) {
      console.error('Booking error:', bookingError);
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
    
    // Update the booking with the payment intent ID
    if (booking_type === 'walking') {
      await supabase
        .from('walking_bookings')
        .update({ payment_intent_id: setupIntent.id })
        .eq('id', booking.id);
        
      console.log(`Updated walking booking ${booking.id} with payment_intent_id ${setupIntent.id}`);
    } else {
      await supabase
        .from('boarding_bookings')
        .update({ payment_intent_id: setupIntent.id })
        .eq('id', booking.id);
        
      console.log(`Updated boarding booking ${booking.id} with payment_intent_id ${setupIntent.id}`);
    }

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
