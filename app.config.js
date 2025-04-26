module.exports = {
  name: "PikPup",
  slug: "pickpup-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/pikpupUserIcon.png",
  userInterfaceStyle: "light",
  // Removed splash block
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    icon: "./assets/images/pikpupUserIcon.png",
    supportsTablet: true,
    bundleIdentifier: "com.pikpup.app",
    buildNumber: '2',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/pikpupUserIcon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.dogsitter.app"
  },
  web: {
    favicon: "./assets/images/favicon.png"
  },
  extra: {
    // Add your Stripe publishable key here
    stripePublishableKey: "pk_test_51R4AEyGEGWY8s9hUAE4oBe7SupMS66g46sxiSFZO8R1KGbQJz75r51s2s7fE9Wa7qHQiQQKNan0GboDv2BoXoEAi005RlzppHK",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: 'bbcc3a73-8035-45ae-bd19-9667291f8d4d'
    }
  },
  plugins: [
    [
      "@stripe/stripe-react-native",
      {
        // This is needed to support Apple Pay
        merchantIdentifier: "merchant.com.dogsitter",
        enableGooglePay: true
      }
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "PikPup needs your location to show nearby sitters.",
        locationAlwaysAndWhenInUsePermission: "PikPup needs your location when the app is in the background to update sitter availability.",
        locationAlwaysPermission: "PikPup needs your location even when the app is not on screen."
      }
    ]
  ]
};
