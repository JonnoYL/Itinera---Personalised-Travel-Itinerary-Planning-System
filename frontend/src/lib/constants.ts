export const APP_NAME = "Itinera";
import Constants from "expo-constants";

export const GEOAPIFY_API_KEY: string =
  (Constants?.expoConfig?.extra?.geoapifyApiKey as string | undefined) ||
  (process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY as string | undefined) ||
  "";
