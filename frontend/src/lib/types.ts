export interface User {
  id: string;
}

// High-level itinerary card (client-side created in context)
export interface ClientItineraryCard {
  id: string;
  name: string;
  description: string;
  startLocation: string;
  dateISO: string;
  startTimeISO: string;
  endTimeISO: string;
  budget: number;
  categories: string[];
  images?: string[];
}

// Backend models
export type TimeString = string; // "HH:MM:SS"

export interface BackendPOI {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  opening_time: TimeString;
  closing_time: TimeString;
  category: string;
  intrinsic_score: number;
  avg_visit_time: number; // minutes
  visit_cost: number;
}

export interface BackendItineraryPOI {
  id: number; // row id
  poi_id: number;
  itinerary_id: number;
  order_index: number;
  arrival_time: TimeString;
  departure_time: TimeString;
  travel_time_from_prev: number; // minutes
  travel_distance_from_prev: number; // km
  poi: BackendPOI;
}

export interface BackendItinerary {
  id: number;
  user_id: number;
  name: string;
  description: string;
  date: string; // ISO date
  cover_photos?: string[] | null;
  budget: number;
  start_time: TimeString;
  end_time: TimeString;
  // New flexible start/end fields from backend
  start_name?: string | null;
  start_lat?: number | null;
  start_long?: number | null;
  start_cat?: string | null;
  end_name?: string | null;
  end_lat?: number | null;
  end_long?: number | null;
  end_cat?: string | null;
  // Back-compat: older backend may still return a single string??
  start_loc?: string;
  categories: string[];
  total_time?: number | null;
  total_cost?: number | null;
  total_distance?: number | null;
  total_score?: number | null;
  pois: BackendItineraryPOI[];
  // Optional GeoJSON FeatureCollection returned by backend after generation
  feature_collection?: GeoJSONFeatureCollection | null;
}

export type ItineraryViewMode = "list" | "map";

// Minimal GeoJSON types for feature_collection
export interface GeoJSONGeometry {
  type: string;
  // Coordinates structure depends on geometry type; leave generic
  coordinates?: unknown;
}

export interface GeoJSONFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry?: GeoJSONGeometry;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
