// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import required libraries for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Stripe from 'https://esm.sh/stripe@12.0.0?dts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

// Create a Supabase client with the Admin key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface RequestBody {
  owner_id: string
}

Deno.serve(async (req) => {
  try {
    const { owner_id } = await req.json() as RequestBody

    // Get Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', owner_id)
      .single()

    // If no customer ID exists, return empty payment methods
    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ paymentMethods: [] }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    })

    // Format the payment methods for client use
    const formattedPaymentMethods = paymentMethods.data.map((method: any) => {
      if (method.type === 'card' && method.card) {
        return {
          id: method.id,
          brand: method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
        }
      }
      return null
    }).filter(Boolean)

    return new Response(
      JSON.stringify({
        paymentMethods: formattedPaymentMethods,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-payment-methods' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
