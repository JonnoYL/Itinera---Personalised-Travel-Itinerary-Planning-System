export const APP_NAME = "Itinera";
import Constants from "expo-constants";

// Prefer Expo extra, fallback to env if provided
export const GEOAPIFY_API_KEY: string =
  (Constants?.expoConfig?.extra?.geoapifyApiKey as string | undefined) ||
  (process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY as string | undefined) ||
  "";
