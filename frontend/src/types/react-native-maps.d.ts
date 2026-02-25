declare module "react-native-maps" {
  import * as React from "react";
  import { ViewStyle } from "react-native";

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface Region extends LatLng {
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface FitToOptions {
    edgePadding?: { top: number; right: number; bottom: number; left: number };
    animated?: boolean;
  }

  export interface MapViewProps {
    style?: ViewStyle | { width?: number | string; height?: number | string };
    initialRegion?: Region;
    toolbarEnabled?: boolean;
    mapType?: "standard" | "satellite";
    onRegionChangeComplete?: (r: Region) => void;
    showsUserLocation?: boolean;
    showsMyLocationButton?: boolean;
    children?: React.ReactNode;
  }

  export default class MapView extends React.Component<MapViewProps> {
    fitToCoordinates(coords: LatLng[], options?: FitToOptions): void;
    animateToRegion(region: Region, duration?: number): void;
  }

  export const Marker: React.ComponentType<{
    coordinate: LatLng;
    title?: string;
    description?: string;
    pinColor?: string;
    children?: React.ReactNode;
    anchor?: { x: number; y: number };
    zIndex?: number;
  }>;

  export const Polyline: React.ComponentType<{
    coordinates: LatLng[];
    strokeWidth?: number;
    strokeColor?: string;
    onPress?: () => void;
    tappable?: boolean;
    zIndex?: number;
  }>;
}
