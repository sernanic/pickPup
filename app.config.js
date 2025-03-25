module.exports = {
  name: "Dog Sitter",
  slug: "dogsitter",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.dogsitter.app"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.dogsitter.app"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    // Add your Stripe publishable key here
    stripePublishableKey: "pk_test_51R4AEyGEGWY8s9hUAE4oBe7SupMS66g46sxiSFZO8R1KGbQJz75r51s2s7fE9Wa7qHQiQQKNan0GboDv2BoXoEAi005RlzppHK",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  plugins: [
    [
      "@stripe/stripe-react-native",
      {
        // This is needed to support Apple Pay
        merchantIdentifier: "merchant.com.dogsitter",
        enableGooglePay: true
      }
    ]
  ]
};
