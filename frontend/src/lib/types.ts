export interface User {
  id: string;
}

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

export type TimeString = string;

export interface BackendPOI {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  opening_time: TimeString;
  closing_time: TimeString;
  category: string;
  intrinsic_score: number;
  avg_visit_time: number;
  visit_cost: number;
}

export interface BackendItineraryPOI {
  id: number;
  poi_id: number;
  itinerary_id: number;
  order_index: number;
  arrival_time: TimeString;
  departure_time: TimeString;
  travel_time_from_prev: number;
  travel_distance_from_prev: number;
  poi: BackendPOI;
}

export interface BackendItinerary {
  id: number;
  user_id: number;
  name: string;
  description: string;
  date: string;
  cover_photos?: string[] | null;
  budget: number;
  start_time: TimeString;
  end_time: TimeString;
  start_name?: string | null;
  start_lat?: number | null;
  start_long?: number | null;
  start_cat?: string | null;
  end_name?: string | null;
  end_lat?: number | null;
  end_long?: number | null;
  end_cat?: string | null;
  start_loc?: string;
  categories: string[];
  total_time?: number | null;
  total_cost?: number | null;
  total_distance?: number | null;
  total_score?: number | null;
  pois: BackendItineraryPOI[];
  feature_collection?: GeoJSONFeatureCollection | null;
}

export type ItineraryViewMode = "list" | "map";

export interface GeoJSONGeometry {
  type: string;
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
