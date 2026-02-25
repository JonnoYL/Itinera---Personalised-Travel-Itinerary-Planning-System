declare module "expo-location" {
  export type PermissionStatus = "granted" | "denied" | "undetermined" | string;
  export interface PermissionResponse {
    status: PermissionStatus;
  }
  export interface Position {
    coords: { latitude: number; longitude: number };
  }
  export const Accuracy: { Balanced: number };
  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function getCurrentPositionAsync(options?: {
    accuracy?: number;
  }): Promise<Position>;
  export function getLastKnownPositionAsync(): Promise<Position | null>;
}
