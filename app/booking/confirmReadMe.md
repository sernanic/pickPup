# Component README: ConfirmBookingScreen (`app/booking/confirm.tsx`)

## Overview

The `ConfirmBookingScreen` serves as the final step in the booking process for both dog walking and dog boarding services. It presents a summary of the selected booking details, calculates the final price including fees, handles the payment process via Stripe (supporting both new and saved cards), and confirms the booking by saving relevant data and initiating communication channels.

## Responsibilities

*   Displays a summary of the booking details received via navigation parameters.
*   Fetches the specific rates for the selected sitter from the `sitter_info` table.
*   Calculates the total duration and price based on the booking mode (walking/boarding), sitter rates, number of pets, and platform fees.
*   Checks if the user has a saved payment method via the `get-payment-methods` Supabase Edge Function.
*   Handles the payment flow using the Stripe SDK (`@stripe/stripe-react-native`):
    *   Initializes and presents the Stripe Payment Sheet for adding a new card (using a Setup Intent flow managed by the `init-payment` Edge Function).
    *   Prompts the user to pay with a saved card, triggering the `charge-payment` Edge Function if confirmed.
*   Provides visual feedback during loading and submission states using `ActivityIndicator`.
*   Handles payment success by:
    *   Saving invoice details to the `invoices` Supabase table.
    *   Creating a new entry in the `message_threads` Supabase table between the owner and sitter.
*   Displays user-friendly alerts for errors, cancellations, and success confirmations.
*   Navigates the user to the messages screen upon successful booking.

## Expected Navigation Parameters (`useLocalSearchParams`)

This screen expects the following parameters passed via `expo-router`:

*   `mode`: `'walking' | 'boarding'` - Indicates the type of service being booked.
*   `sitterId`: `string` - The unique ID of the sitter being booked.
*   `selectedPets`: `string` - A JSON stringified array of selected pet objects.
*   **If `mode` is 'walking':**
    *   `slotId`: `string` - The ID of the selected availability slot (may contain sitterId prefix, e.g., `sitterId_slotId`).
    *   `date`: `string` - The selected date for the walk (Expected format like "Mar 15, 2025" - *Note: Standardized ISO format "YYYY-MM-DD" is recommended*).
    *   `startTime`: `string` - The start time (e.g., "9:00 AM").
    *   `endTime`: `string` - The end time (e.g., "10:00 AM").
*   **If `mode` is 'boarding':**
    *   `startDate`: `string` - The start date for boarding (Expected ISO format "YYYY-MM-DD").
    *   `endDate`: `string` - The end date for boarding (Expected ISO format "YYYY-MM-DD").

## Internal State (`useState`)

*   `isSubmitting`: `boolean` - Tracks if a booking/payment process is currently active.
*   `hasSavedCard`: `boolean` - Indicates if the user has a retrievable saved payment method on Stripe.
*   `cardLast4`: `string | null` - The last 4 digits of the saved card, if available.
*   `isLoadingPaymentMethods`: `boolean` - Tracks loading state while checking for saved cards.
*   `sitterRates`: `SitterRates | null` - Stores the fetched rates for the specific sitter.
*   `isLoadingRates`: `boolean` - Tracks loading state while fetching sitter rates.

## Key Functions

*   `fetchSitterRates()`: Fetches rate details for the `sitterId` from Supabase.
*   `calculateDuration()`: Calculates the booking duration in hours (walking) or nights (boarding).
*   `calculatePrice()`: Calculates the base fee, additional pet fees, platform fee, and total price based on rates, duration, and pet count. Uses fallback rates if `sitterRates` haven't loaded.
*   `checkSavedCard()`: Calls the `get-payment-methods` Supabase function to check for saved Stripe payment methods.
*   `initializePayment()`: Calls the `init-payment` Supabase function to get a Stripe Setup Intent client secret, initializes the Stripe Payment Sheet, and presents it for new card entry.
*   `chargePayment()`: Calls the `charge-payment` Supabase function to charge a saved Stripe payment method.
*   `handleBookNow()`: Orchestrates the booking flow, checking for saved cards, calling either `initializePayment` or `chargePayment`, and handling the results.
*   `handlePaymentSuccess()`: Called after successful payment confirmation. Saves invoice data to Supabase.
*   `createMessageThread()`: Creates a message thread entry in Supabase after successful booking and navigates the user.
*   `calculatePlatformFee()` / `calculateSitterPayout()`: Helper functions to determine fee/payout amounts (currently hardcoded percentages).

## Dependencies

*   `react`, `react-native`
*   `expo-router` (for `useLocalSearchParams`, `router`)
*   `react-native-safe-area-context` (for `useSafeAreaInsets`)
*   `lucide-react-native` (for icons)
*   `@stripe/stripe-react-native` (for Stripe SDK hooks `useStripe`)
*   `../lib/supabase` (for Supabase client instance)
*   `../stores/authStore` (for `useAuthStore` to get user details)
*   Supabase Edge Functions: `get-payment-methods`, `init-payment`, `charge-payment`

## Usage Notes

*   This screen should be navigated to *after* the user has selected all necessary booking details (service type, sitter, pets, dates/times).
*   Ensure the Supabase Edge Functions are correctly deployed and configured with Stripe secrets.
*   The reliability of date/time parsing depends heavily on the format passed via navigation parameters. Using standardized ISO 8601 formats is strongly recommended.
*   Platform fee and payout calculation logic currently uses hardcoded percentages (10% fee, 20%/80% split in invoice creation). Consider making these configurable if needed.