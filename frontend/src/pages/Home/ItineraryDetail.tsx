import React, { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker, Polyline, LatLng, Region } from "react-native-maps";
import axios, { AxiosError } from "axios";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  Image,
  Alert,
  Modal,
} from "react-native";
import {
  BackendItinerary,
  BackendItineraryPOI,
  ClientItineraryCard,
} from "../../lib/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HomeStackParamList } from "../../components/Nav/HomeStack";
import { useItineraries } from "../../context/ItineraryContext";
import { apiGetItinerary, apiGetPOIs, BASE_URL } from "../../lib/api";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Route = {
  key: string;
  name: "ItineraryDetail";
  params: HomeStackParamList["ItineraryDetail"];
};

function timeLabel(t: string | undefined) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = Number(h);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${m} ${ampm}`;
}

// parse a time string into total minutes since midnight.
// supports "HH:MM:SS", "HH:MM" and ISO strings like "2025-11-18T09:00:00Z".
function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;

  // ISO datetime
  if (t.includes("T")) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  // "HH:MM:SS" or "HH:MM"
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

// format minutes since midnight as "HH:MM"
function minutesToHM(total: number): string {
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

// compute range + duration labels for header total time row
function computeTotalTimeLabels(
  geoListData: Array<{ opening_time?: string }>,
  pois: BackendItineraryPOI[],
): { rangeLabel: string | null; durationLabel: string | null } {
  let startMin: number | null = null;
  let endMin: number | null = null;

  if (geoListData.length) {
    // when using GeoJSON-driven list: first + last opening_time
    const firstT = geoListData[0]?.opening_time;
    const lastT = geoListData[geoListData.length - 1]?.opening_time;
    startMin = firstT ? parseTimeToMinutes(firstT) : null;
    endMin = lastT ? parseTimeToMinutes(lastT) : null;
  } else if (pois.length) {
    // fallback: use raw POIs (sorted by order_index)
    const ordered = [...pois].sort((a, b) => a.order_index - b.order_index);

    // start time = arrival_time of the first POI that has an arrival_time
    const firstWithArrival = ordered.find((p) => !!p.arrival_time);
    const startStr = firstWithArrival?.arrival_time ?? null;

    // end time = prefer last departure_time otherwise last arrival_time
    const reversed = [...ordered].reverse();
    const lastWithDeparture = reversed.find((p) => !!p.departure_time);
    const lastWithArrival = reversed.find((p) => !!p.arrival_time);
    const endStr =
      lastWithDeparture?.departure_time ??
      lastWithArrival?.arrival_time ??
      null;

    startMin = startStr ? parseTimeToMinutes(startStr) : null;
    endMin = endStr ? parseTimeToMinutes(endStr) : null;
  }

  if (
    startMin === null ||
    endMin === null ||
    !Number.isFinite(startMin) ||
    !Number.isFinite(endMin) ||
    endMin <= startMin
  ) {
    return { rangeLabel: null, durationLabel: null };
  }

  const rangeLabel = `${minutesToHM(startMin)} - ${minutesToHM(endMin)}`;

  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  if (mins > 0) parts.push(`${mins} ${mins === 1 ? "min" : "mins"}`);
  if (!parts.length) parts.push("0 mins");

  return { rangeLabel, durationLabel: parts.join(" ") };
}

function formatDurationMinutes(mins?: number | null): string | null {
  if (mins == null || !Number.isFinite(mins)) return null;
  const rounded = Math.round(mins);
  if (rounded < 60) return `${rounded} mins`;
  const hours = Math.floor(rounded / 60);
  const rem = rounded % 60;
  const parts: string[] = [];
  parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  if (rem > 0) parts.push(`${rem} mins`);
  return parts.join(" ");
}

function getStayDurationLabel(p: BackendItineraryPOI): string | null {
  const startMin = parseTimeToMinutes(p.arrival_time);
  const endMin = parseTimeToMinutes(p.departure_time);
  if (
    startMin == null ||
    endMin == null ||
    !Number.isFinite(startMin) ||
    !Number.isFinite(endMin) ||
    endMin <= startMin
  ) {
    return null;
  }
  return formatDurationMinutes(endMin - startMin);
}

export default function ItineraryDetail() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<Route>();
  const { itineraries } = useItineraries();
  const mapRef = useRef<MapView | null>(null);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const currentRegionRef = useRef<Region | undefined>(undefined);

  const card: ClientItineraryCard | undefined = useMemo(
    () => itineraries.find((i) => i.id === route.params?.cardId),
    [itineraries, route.params],
  );

  const [view, setView] = useState<"list" | "map">("list");
  const [backendItin, setBackendItin] = useState<BackendItinerary | null>(null);
  const [pois, setPois] = useState<BackendItineraryPOI[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editBudget, setEditBudget] = useState("");

  useEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  // load backend itinerary if an id is provided
  useEffect(() => {
    let active = true;
    (async () => {
      if (route.params?.backendId != null) {
        const data = await apiGetItinerary(route.params.backendId);
        if (active && data) {
          setBackendItin(data);
          const base = data.pois || [];
          if (base.length && !base[0]?.poi) {
            const all = await apiGetPOIs();
            const lookup = new Map(all.map((p) => [p.id, p]));
            setPois(
              base.map((p) => ({
                ...p,
                poi: p.poi ?? lookup.get(p.poi_id),
              })),
            );
          } else {
            setPois(base);
          }
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [route.params]);

  useEffect(() => {
    if (!backendItin) return;
    setPois(backendItin.pois || []);
  }, [backendItin]);

  useEffect(() => {
    if (backendItin) {
      const toHM = (t?: string) => (t ? t.slice(0, 5) : "");
      setEditStart(toHM(backendItin.start_time));
      setEditEnd(toHM(backendItin.end_time));
      setEditBudget(`${backendItin.budget ?? 0}`);
    }
  }, [backendItin]);
  const [showStartWheel, setShowStartWheel] = useState(false);
  const [showEndWheel, setShowEndWheel] = useState(false);
  const [startWheelValue, setStartWheelValue] = useState<Date>(new Date());
  const [endWheelValue, setEndWheelValue] = useState<Date>(new Date());

  const coverUri = useMemo(
    () =>
      (card?.images && card.images[0]) ||
      (backendItin?.cover_photos?.[0] ?? null),
    [card, backendItin],
  );

  const budgetText = useMemo(() => {
    const b = card?.budget ?? backendItin?.budget ?? 0;
    const poiTotal = (pois || []).reduce(
      (sum, p) => sum + (p.poi?.visit_cost ?? 0),
      0,
    );
    const grandTotal =
      typeof backendItin?.total_cost === "number"
        ? backendItin.total_cost
        : poiTotal;
    const travelTotal = Math.max(0, grandTotal - poiTotal);
    return {
      total: grandTotal,
      poiTotal,
      travelTotal,
      b,
      over: grandTotal > b,
    };
  }, [card, backendItin, pois]);

  const startCoord: LatLng | null = useMemo(() => {
    const slat = backendItin?.start_lat;
    const slon = backendItin?.start_long;
    if (
      typeof slat === "number" &&
      typeof slon === "number" &&
      Number.isFinite(slat) &&
      Number.isFinite(slon)
    ) {
      return { latitude: slat, longitude: slon };
    }
    const raw = backendItin?.start_loc || "";
    const m = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return null;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { latitude: lat, longitude: lon };
  }, [backendItin?.start_lat, backendItin?.start_long, backendItin?.start_loc]);

  // build route coordinates from start + POIs in order
  const routeCoords: LatLng[] = useMemo(() => {
    const ordered = [...pois].sort((a, b) => a.order_index - b.order_index);
    const pts: LatLng[] = [];
    if (startCoord) pts.push(startCoord);
    for (const p of ordered) {
      const lat = p.poi?.latitude;
      const lon = p.poi?.longitude;
      if (
        typeof lat === "number" &&
        typeof lon === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(lon)
      ) {
        pts.push({ latitude: lat, longitude: lon });
      }
    }
    return pts;
  }, [pois, startCoord]);

  const initialRegion: Region | undefined = useMemo(() => {
    const first = routeCoords[0];
    if (!first) return undefined;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [routeCoords]);

  // --- GeoJSON support ---
  type GeoPointProps = {
    name?: string;
    category?: string;
    order?: number;
    is_start?: boolean;
    is_poi?: boolean;
    id?: number;
    visit_cost?: number;
    opening_time?: string;
  };
  type GeoLineProps = {
    mode?: string;
    distance_m?: number;
    duration_min?: number;
    from?: string;
    to?: string;
    from_id?: number;
    to_id?: number;
  };
  type GeoJSONPoint = {
    type: "Feature";
    properties?: GeoPointProps;
    geometry: { type: "Point"; coordinates: [number, number] };
  };
  type GeoJSONLine = {
    type: "Feature";
    properties?: GeoLineProps;
    geometry:
      | { type: "LineString"; coordinates: [number, number][] }
      | { type: "MultiLineString"; coordinates: [number, number][][] };
  };
  type GeoJSONFC = {
    type: "FeatureCollection";
    features: Array<GeoJSONPoint | GeoJSONLine>;
  };

  const featureCollection: GeoJSONFC | null = useMemo(() => {
    const anyItin = backendItin as unknown as {
      feature_collection?: GeoJSONFC;
    };
    return anyItin?.feature_collection ?? null;
  }, [backendItin]);

  const geoPoints: {
    coordinate: LatLng;
    title?: string;
    description?: string;
    order?: number;
    props?: GeoPointProps;
  }[] = useMemo(() => {
    if (!featureCollection) return [];
    const pts: {
      coordinate: LatLng;
      title?: string;
      description?: string;
      order?: number;
      props?: GeoPointProps;
    }[] = [];
    for (const f of featureCollection.features) {
      if (f.geometry?.type === "Point") {
        const point = f as GeoJSONPoint;
        const [lon, lat] = point.geometry.coordinates;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          pts.push({
            coordinate: { latitude: lat, longitude: lon },
            title: point.properties?.name,
            description: point.properties?.category,
            order:
              typeof point.properties?.order === "number"
                ? point.properties?.order
                : undefined,
            props: point.properties,
          });
        }
      }
    }
    // if order present, sort by it, otherwise retain input order
    const hasOrder = pts.every((p) => typeof p.order === "number");
    return hasOrder ? [...pts].sort((a, b) => a.order! - b.order!) : pts;
  }, [featureCollection]);

  // build list rows from GeoJSON points when available
  type GeoListRow = {
    key: string;
    name: string;
    category?: string;
    cost?: number;
    opening_time?: string;
  };

  const geoListData: GeoListRow[] = useMemo(() => {
    if (!geoPoints.length) return [];
    const byOrder = new Map<number, BackendItineraryPOI>();
    for (const d of [...pois]) {
      byOrder.set((d.order_index ?? 0) + 1, d);
    }
    return geoPoints.map((p, idx) => {
      const matched =
        typeof p.order === "number" ? byOrder.get(p.order) : undefined;
      const arrival = matched?.arrival_time;
      const visitCost = matched?.poi?.visit_cost;
      let resolvedCost: number | undefined;
      if (typeof visitCost === "number") {
        resolvedCost = visitCost;
      } else if (typeof p.props?.visit_cost === "number") {
        resolvedCost = p.props?.visit_cost;
      } else {
        resolvedCost = undefined;
      }
      return {
        key: `${p.title || "poi"}-${p.order ?? idx}-${p.coordinate.latitude.toFixed(5)}-${p.coordinate.longitude.toFixed(5)}`,
        name: p.title || "POI",
        category: p.description,
        cost: resolvedCost,
        opening_time: arrival || p.props?.opening_time,
      } as GeoListRow;
    });
  }, [geoPoints, pois]);

  const totalTime = useMemo(
    () => computeTotalTimeLabels(geoListData, pois),
    [geoListData, pois],
  );

  const orderedPois = useMemo(
    () => [...pois].sort((a, b) => a.order_index - b.order_index),
    [pois],
  );

  const geoLineSegments: LatLng[][] = useMemo(() => {
    if (!featureCollection) return [];
    const lines: LatLng[][] = [];
    for (const f of featureCollection.features) {
      if (f.geometry?.type === "LineString") {
        const seg = (f.geometry.coordinates || [])
          .filter((c) => Array.isArray(c) && c.length >= 2)
          .map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
        if (seg.length >= 2) lines.push(seg);
      } else if (f.geometry?.type === "MultiLineString") {
        for (const part of f.geometry.coordinates || []) {
          const seg = part
            .filter((c) => Array.isArray(c) && c.length >= 2)
            .map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
          if (seg.length >= 2) lines.push(seg);
        }
      }
    }
    return lines;
  }, [featureCollection]);

  // midpoint labels between consecutive POIs showing travel time (minutes)
  const edgeLabels: { coordinate: LatLng; text: string }[] = useMemo(() => {
    const labels: { coordinate: LatLng; text: string }[] = [];
    const ordered = [...pois].sort((a, b) => a.order_index - b.order_index);
    for (let i = 1; i < ordered.length; i++) {
      const curr = ordered[i];
      const prev = ordered[i - 1];
      const plat = prev.poi?.latitude;
      const plon = prev.poi?.longitude;
      const clat = curr.poi?.latitude;
      const clon = curr.poi?.longitude;
      const t = curr.travel_time_from_prev;
      if (
        typeof plat === "number" &&
        typeof plon === "number" &&
        typeof clat === "number" &&
        typeof clon === "number" &&
        Number.isFinite(plat) &&
        Number.isFinite(plon) &&
        Number.isFinite(clat) &&
        Number.isFinite(clon) &&
        typeof t === "number" &&
        Number.isFinite(t)
      ) {
        const midLat = (plat + clat) / 2;
        const midLon = (plon + clon) / 2;
        const dLat = clat - plat;
        const dLon = clon - plon;
        const len = Math.sqrt(dLat * dLat + dLon * dLon) || 1;
        const offsetScale = 0.0007;
        const offLat = (-dLon / len) * offsetScale;
        const offLon = (dLat / len) * offsetScale;

        labels.push({
          coordinate: {
            latitude: midLat + offLat,
            longitude: midLon + offLon,
          },
          text: `${Math.round(t)} mins`,
        });
      }
    }
    return labels;
  }, [pois]);

  function formatCategoryLabel(raw?: unknown): string | undefined {
    if (!raw) return undefined;

    if (Array.isArray(raw)) {
      // ["Museum", "Gallery"] → "Museum, Gallery"
      return (raw as unknown[]).map(String).join(", ");
    }

    if (typeof raw === "string") {
      if (raw.includes(",")) {
        // "Museum,Gallery" → "Museum, Gallery"
        return raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", ");
      }
      // "MuseumGallery" → "Museum, Gallery"
      const parts = raw.split(/(?=[A-Z])/);
      return parts.join(", ");
    }

    return String(raw);
  }

  function getPoiCategoryText(p: BackendItineraryPOI): string | undefined {
    const catUnknown = (p.poi as unknown as { category?: unknown })?.category;
    return formatCategoryLabel(catUnknown);
  }

  // fit camera to either GeoJSON geometry
  useEffect(() => {
    if (!mapRef.current) return;
    const coords: LatLng[] = [];
    if (geoLineSegments.length) {
      for (const seg of geoLineSegments) coords.push(...seg);
    } else if (routeCoords.length) {
      coords.push(...routeCoords);
    } else if (geoPoints.length) {
      coords.push(...geoPoints.map((p) => p.coordinate));
    }
    if (!coords.length) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 80, bottom: 160, left: 80 },
      animated: false,
    });
  }, [routeCoords, geoLineSegments, geoPoints]);

  // helper function to get all coordinates currently relevant
  const allCoords: LatLng[] = useMemo(() => {
    const coords: LatLng[] = [];
    if (geoLineSegments.length) {
      for (const seg of geoLineSegments) coords.push(...seg);
    } else if (routeCoords.length) {
      coords.push(...routeCoords);
    } else if (geoPoints.length) {
      coords.push(...geoPoints.map((p) => p.coordinate));
    }
    return coords;
  }, [routeCoords, geoLineSegments, geoPoints]);

  const computeRegionFromCoords = (coords: LatLng[]): Region | undefined => {
    if (!coords.length) return undefined;
    if (coords.length === 1) {
      const c = coords[0];
      return {
        latitude: c.latitude,
        longitude: c.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    for (const c of coords) {
      minLat = Math.min(minLat, c.latitude);
      maxLat = Math.max(maxLat, c.latitude);
      minLon = Math.min(minLon, c.longitude);
      maxLon = Math.max(maxLon, c.longitude);
    }
    const padding = 1.2;
    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLon + maxLon) / 2;
    const latitudeDelta = Math.max(0.002, (maxLat - minLat) * padding);
    const longitudeDelta = Math.max(0.002, (maxLon - minLon) * padding);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  };

  const fitToAll = React.useCallback(() => {
    if (!mapRef.current || !allCoords.length) return;
    const region = computeRegionFromCoords(allCoords);
    if (!region) return;
    currentRegionRef.current = region;
    (
      mapRef.current as unknown as {
        animateToRegion?: (r: Region, d?: number) => void;
      }
    )?.animateToRegion?.(region, 250);
  }, [allCoords]);

  // ensure initial view is fitted to all geometry/points when map first becomes visible
  const didInitialFitRef = useRef(false);
  useEffect(() => {
    if (!allCoords.length || !mapRef.current) return;
    if (!didInitialFitRef.current) {
      didInitialFitRef.current = true;
      setTimeout(() => fitToAll(), 0);
    }
  }, [allCoords.length, fitToAll]);
  useEffect(() => {
    // refit whenever user switches to Map tab
    if (view === "map" && allCoords.length && mapRef.current) {
      setTimeout(() => fitToAll(), 0);
    }
  }, [view, allCoords.length, fitToAll]);

  // zoom helpers
  const zoomBy = (factor: number) => {
    if (!mapRef.current) return;
    const r = currentRegionRef.current || initialRegion;
    if (!r) return;
    const newRegion: Region = {
      ...r,
      latitudeDelta: Math.max(0.0005, r.latitudeDelta / factor),
      longitudeDelta: Math.max(0.0005, r.longitudeDelta / factor),
    };
    (
      mapRef.current as unknown as {
        animateToRegion?: (r: Region, d?: number) => void;
      }
    )?.animateToRegion?.(newRegion, 180);
    currentRegionRef.current = newRegion;
  };
  const zoomIn = () => zoomBy(1.5);
  const zoomOut = () => zoomBy(1 / 1.5);

  // responsive map height (depending on device)
  const mapHeight = useMemo(() => {
    const h = Dimensions.get("window").height;
    // reduce height so the map + cover fit without needing to scroll under navigation bar
    const target = Math.floor(h * 0.45);
    return Math.max(260, Math.min(420, target));
  }, []);

  const toHMS = (hm: string) => {
    if (!hm) return "";
    // expecting HH:MM convert to HH:MM:00
    const parts = hm.split(":");
    if (parts.length === 2)
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
    if (parts.length === 3)
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
    return hm;
  };

  // helpers to convert HH:MM to Date and back for wheel picker
  const hmToDate = (hm: string | undefined): Date => {
    const base = new Date();
    if (!hm) return base;
    const [hh, mm] = hm.split(":");
    const h = Number(hh);
    const m = Number(mm);
    const d = new Date(base);
    if (Number.isFinite(h) && Number.isFinite(m)) d.setHours(h, m, 0, 0);
    return d;
  };
  const dateToHM = (d: Date | null): string => {
    if (!d) return "";
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const handleSave = async () => {
    if (!backendItin?.id) return;
    try {
      const payload: Record<string, unknown> = {};
      if (editBudget !== "") payload.budget = Number(editBudget);
      if (editStart) payload.start_time = toHMS(editStart);
      if (editEnd) payload.end_time = toHMS(editEnd);
      await axios.patch(`${BASE_URL}/itineraries/${backendItin.id}`, payload);
      const fresh = await apiGetItinerary(backendItin.id);
      if (fresh) {
        setBackendItin(fresh);
        setPois(fresh.pois || []);
        Alert.alert("Saved", "Itinerary updated.");
        return;
      }
      Alert.alert("Saved", "Itinerary updated, but refresh failed.");
    } catch (err) {
      const e = err as AxiosError<{ detail?: string }>;
      const detail =
        (e.response?.data as { detail?: string } | undefined)?.detail ||
        "Could not update itinerary.";
      Alert.alert("Failed", String(detail));
    }
  };

  const HeaderSection = () => (
    <>
      {/* header with cover, title, budget summary */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => {
            if (backendItin) {
              const toHM = (t?: string) => (t ? t.slice(0, 5) : "");
              setEditStart(toHM(backendItin.start_time));
              setEditEnd(toHM(backendItin.end_time));
              setEditBudget(`${backendItin.budget ?? 0}`);
            } else if (card) {
              const toHMFromISO = (iso?: string) =>
                iso ? iso.slice(11, 16) : "";
              setEditStart(toHMFromISO(card.startTimeISO));
              setEditEnd(toHMFromISO(card.endTimeISO));
              setEditBudget(`${card.budget ?? 0}`);
            }
            setEditVisible(true);
          }}
          accessibilityRole="button"
          style={styles.editBtn}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
        </Pressable>
        <View style={styles.cover}>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={styles.coverImg}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverImg, { backgroundColor: "#EDE7E3" }]} />
          )}
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.tripName}>
            {card?.name || backendItin?.name || "Itinerary"}
          </Text>
          <Text style={styles.subtle}>
            {card
              ? new Date(card.dateISO).toLocaleDateString()
              : backendItin?.date}
          </Text>
          <Text
            style={[styles.budgetRow, budgetText.over && { color: "#D44B3A" }]}
          >
            ${budgetText.total.toFixed(0)} / ${budgetText.b.toFixed(0)}
          </Text>
          <Text style={styles.costBreakdownRow}>
            POIs ${budgetText.poiTotal.toFixed(0)}
          </Text>
          <Text style={styles.costBreakdownRow}>
            Travel ${budgetText.travelTotal.toFixed(0)}
          </Text>
          {totalTime.rangeLabel && (
            <Text style={styles.totalTimeRow}>
              {totalTime.rangeLabel}
              {totalTime.durationLabel ? `) ${totalTime.durationLabel}` : ")"}
            </Text>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setView("list")}
          accessibilityRole="button"
          style={[styles.tab, view === "list" && styles.tabActive]}
        >
          <Text
            style={[styles.tabText, view === "list" && styles.tabTextActive]}
          >
            List
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView("map")}
          accessibilityRole="button"
          style={[styles.tab, view === "map" && styles.tabActive]}
        >
          <Text
            style={[styles.tabText, view === "map" && styles.tabTextActive]}
          >
            Map
          </Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      {view === "list" ? (
        <FlatList
          contentContainerStyle={{
            paddingBottom: 120 + insets.bottom,
          }}
          ListHeaderComponent={<HeaderSection />}
          data={orderedPois}
          keyExtractor={(p) => `${p.order_index}-${p.poi_id}`}
          renderItem={({ item: poi, index }) => {
            const isFirst = index === 0;
            const isLast = index === orderedPois.length - 1;

            const categoryText = getPoiCategoryText(poi) ?? "—";

            const travelLabel =
              !isFirst &&
              typeof poi.travel_time_from_prev === "number" &&
              poi.travel_time_from_prev > 0
                ? formatDurationMinutes(poi.travel_time_from_prev)
                : null;

            const stayLabel = getStayDurationLabel(poi);

            const visitCost = poi.poi?.visit_cost;
            const costText =
              typeof visitCost === "number" && visitCost > 0
                ? `$${visitCost.toFixed(0)}`
                : "";

            return (
              <View style={styles.timelineRow}>
                {/* LEFT TIMELINE COLUMN */}
                <View style={styles.timelineAxisCol}>
                  {!isFirst && <View style={styles.timelineLine} />}
                  <View
                    style={[
                      styles.timelineDot,
                      isFirst && styles.timelineDotStart,
                      isLast && styles.timelineDotEnd,
                    ]}
                  >
                    {(isFirst || isLast) && (
                      <Text style={styles.timelineDotLabel}>
                        {isFirst ? "S" : "E"}
                      </Text>
                    )}
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* RIGHT CONTENT COLUMN */}
                <View style={styles.timelineContentCol}>
                  {!isFirst && travelLabel && (
                    <Text style={styles.travelLabel}>Travel {travelLabel}</Text>
                  )}

                  <View style={styles.timelineCard}>
                    <View style={styles.poiHeaderRow}>
                      <Text style={styles.poiTitle}>
                        {poi.poi?.name ?? "POI"}
                      </Text>
                      <View style={styles.badgeRow}>
                        {isFirst && (
                          <View style={styles.poiBadge}>
                            <Text style={styles.poiBadgeText}>Start</Text>
                          </View>
                        )}
                        {isLast && (
                          <View style={styles.poiBadge}>
                            <Text style={styles.poiBadgeText}>End</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text style={styles.poiMeta}>{categoryText}</Text>

                    <Text style={styles.poiMeta}>
                      Enter {timeLabel(poi.arrival_time)}
                      {"   "}
                      Exit {timeLabel(poi.departure_time)}
                      {stayLabel ? `   •   Stay ${stayLabel}` : ""}
                    </Text>

                    <View style={styles.poiFooterRow}>
                      {costText ? (
                        <Text style={styles.poiCost}>{costText}</Text>
                      ) : (
                        <View />
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No stops yet</Text>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 8 + insets.bottom }}
        >
          <HeaderSection />
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[styles.mapBox, { height: mapHeight }]}>
              {routeCoords.length ? (
                <MapView
                  ref={mapRef}
                  style={{ width: "100%", height: "100%" }}
                  initialRegion={initialRegion}
                  toolbarEnabled={false}
                  mapType={mapType}
                  onRegionChangeComplete={(r: Region) => {
                    currentRegionRef.current = r;
                  }}
                >
                  {/* GeoJSON points override default markers if provided */}
                  {!geoPoints.length && startCoord && (
                    <Marker
                      coordinate={startCoord}
                      title="Start"
                      description={backendItin?.start_loc}
                      pinColor="#2E7D32"
                    />
                  )}
                  {geoPoints.length
                    ? geoPoints.map((p, idx) => {
                        const parts: string[] = [];
                        if (p.description) parts.push(String(p.description));
                        if (typeof p.order === "number")
                          parts.push(`Stop #${p.order}`);
                        if (typeof p.props?.visit_cost === "number")
                          parts.push(`$${p.props.visit_cost.toFixed(0)}`);
                        const desc = parts.join(" • ");
                        return (
                          <Marker
                            key={`gpt-${idx}`}
                            coordinate={p.coordinate}
                            title={p.title || "POI"}
                            description={desc || undefined}
                            pinColor={idx === 0 ? "#2E7D32" : "#F04623"}
                          />
                        );
                      })
                    : [...pois]
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((p) => {
                          const lat = p.poi?.latitude;
                          const lon = p.poi?.longitude;
                          if (
                            typeof lat !== "number" ||
                            typeof lon !== "number"
                          )
                            return null;
                          const parts: string[] = [];
                          const cat = getPoiCategoryText(p);
                          if (cat) parts.push(cat);
                          if (
                            typeof p.travel_time_from_prev === "number" &&
                            p.order_index > 0
                          ) {
                            parts.push(
                              `${Math.round(p.travel_time_from_prev)}m`,
                            );
                          }
                          parts.push(
                            `${timeLabel(p.arrival_time)}–${timeLabel(p.departure_time)}`,
                          );
                          if (typeof p.poi?.visit_cost === "number")
                            parts.push(
                              `$${(p.poi?.visit_cost ?? 0).toFixed(0)}`,
                            );
                          const desc = parts.join(" • ");
                          return (
                            <Marker
                              key={`${p.order_index}-${p.poi_id}`}
                              coordinate={{ latitude: lat, longitude: lon }}
                              title={p.poi?.name || "POI"}
                              description={desc || undefined}
                              pinColor="#F04623"
                            />
                          );
                        })}
                  {geoLineSegments.length
                    ? geoLineSegments.map((seg, i) => (
                        <Polyline
                          key={`gln-${i}`}
                          coordinates={seg}
                          strokeWidth={4}
                          strokeColor="#F04623"
                        />
                      ))
                    : routeCoords.length >= 2 && (
                        <Polyline
                          coordinates={routeCoords}
                          strokeWidth={4}
                          strokeColor="#F04623"
                        />
                      )}
                  {/* edge time labels (midpoints between consecutive POIs) */}
                  {edgeLabels.map((e, i) => (
                    <Marker
                      key={`el-${i}`}
                      coordinate={e.coordinate}
                      anchor={{ x: 0.5, y: 0.5 }}
                      zIndex={999}
                    >
                      <View style={styles.edgeLabel}>
                        <Text style={styles.edgeLabelText}>🚗 {e.text}</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#8C7F7A" }}>
                    No coordinates to display
                  </Text>
                </View>
              )}
              {/* map controls overlay */}
              <View style={styles.mapControls}>
                <Pressable
                  onPress={() =>
                    setMapType((prev) =>
                      prev === "standard" ? "satellite" : "standard",
                    )
                  }
                  accessibilityRole="button"
                  style={styles.mapCtrlBtn}
                >
                  <Text style={styles.mapCtrlText}>
                    {mapType === "standard" ? "Sat" : "Std"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={zoomIn}
                  accessibilityRole="button"
                  style={styles.mapCtrlBtn}
                >
                  <Text style={styles.mapCtrlText}>＋</Text>
                </Pressable>
                <Pressable
                  onPress={zoomOut}
                  accessibilityRole="button"
                  style={styles.mapCtrlBtn}
                >
                  <Text style={styles.mapCtrlText}>－</Text>
                </Pressable>
                <Pressable
                  onPress={fitToAll}
                  accessibilityRole="button"
                  style={styles.mapCtrlBtn}
                >
                  <Text style={styles.mapCtrlText}>Fit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit details</Text>
            <View style={{ gap: 10 }}>
              <View>
                <Text style={styles.subtle}>Start time</Text>
                <Pressable
                  onPress={() => {
                    setStartWheelValue(hmToDate(editStart));
                    setShowStartWheel(true);
                  }}
                  accessibilityRole="button"
                  style={{
                    backgroundColor: "#F9F4F2",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ color: "#1E1E1E" }}>
                    {editStart || "09:00"}
                  </Text>
                </Pressable>
              </View>
              <View>
                <Text style={styles.subtle}>End time</Text>
                <Pressable
                  onPress={() => {
                    setEndWheelValue(hmToDate(editEnd));
                    setShowEndWheel(true);
                  }}
                  accessibilityRole="button"
                  style={{
                    backgroundColor: "#F9F4F2",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ color: "#1E1E1E" }}>{editEnd || "17:00"}</Text>
                </Pressable>
              </View>
              <View>
                <Text style={styles.subtle}>Budget</Text>
                <TextInput
                  value={editBudget}
                  onChangeText={setEditBudget}
                  placeholder="500"
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#F9F4F2",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginTop: 6,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <Pressable
                  onPress={() => setEditVisible(false)}
                  accessibilityRole="button"
                  style={[styles.modalBtn, { backgroundColor: "#F3EAE6" }]}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    handleSave();
                    setEditVisible(false);
                  }}
                  accessibilityRole="button"
                  style={[styles.modalBtn, { backgroundColor: "#F04623" }]}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Save
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
          {(showStartWheel || showEndWheel) && (
            <View style={styles.wheelOverlay}>
              <View style={styles.timeCard}>
                <Text style={styles.modalTitle}>
                  {showStartWheel ? "Select Start Time" : "Select End Time"}
                </Text>
                <View style={{ alignItems: "center", marginBottom: 8 }}>
                  <DateTimePicker
                    value={showStartWheel ? startWheelValue : endWheelValue}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    themeVariant="light"
                    textColor="#1E1E1E"
                    onChange={(_, d) => {
                      if (d) {
                        if (showStartWheel) setStartWheelValue(d);
                        else setEndWheelValue(d);
                      }
                    }}
                    style={{ height: 216, alignSelf: "stretch" }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (showStartWheel) setShowStartWheel(false);
                      if (showEndWheel) setShowEndWheel(false);
                    }}
                    style={[styles.modalBtn, { backgroundColor: "#F3EAE6" }]}
                  >
                    <Text style={styles.modalBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (showStartWheel) {
                        setEditStart(dateToHM(startWheelValue));
                        setShowStartWheel(false);
                      } else {
                        setEditEnd(dateToHM(endWheelValue));
                        setShowEndWheel(false);
                      }
                    }}
                    style={[styles.modalBtn, { backgroundColor: "#F04623" }]}
                  >
                    <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                      Confirm
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F5" },
  header: { marginBottom: 8 },
  backBtn: {
    position: "absolute",
    zIndex: 2,
    top: 44,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    position: "absolute",
    zIndex: 2,
    top: 44,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    height: 260,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%" },
  headerTextWrap: { paddingHorizontal: 16, paddingTop: 12 },
  tripName: { fontSize: 18, fontWeight: "700", color: "#1E1E1E" },
  subtle: { color: "#8C7F7A" },
  budgetRow: { marginTop: 6, fontWeight: "700", color: "#1E1E1E" },
  totalTimeRow: {
    marginTop: 2,
    fontWeight: "700",
    color: "#1E1E1E",
  },
  costBreakdownRow: { color: "#8C7F7A", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F3EAE6",
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { color: "#8C7F7A" },
  tabTextActive: { color: "#1E1E1E", fontWeight: "700" },
  dayHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1E1E",
    marginBottom: 8,
  },
  poiCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  poiTitle: { fontWeight: "700", color: "#1E1E1E" },
  poiMeta: { color: "#8C7F7A", marginTop: 2 },
  poiCost: { marginTop: 6, fontWeight: "700", color: "#1E1E1E" },
  actionsCol: { alignItems: "center", justifyContent: "center", marginLeft: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3EAE6",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  emptyText: { textAlign: "center", color: "#8C7F7A", marginVertical: 10 },
  mapBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControls: {
    position: "absolute",
    right: 10,
    bottom: 10,
    gap: 8,
  },
  mapCtrlBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCtrlText: { color: "#fff", fontWeight: "700" },
  edgeLabel: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  edgeLabelText: {
    color: "#1E1E1E",
    fontWeight: "700",
    fontSize: 11,
  },
  block: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  blockTitle: { fontWeight: "700", color: "#1E1E1E", marginBottom: 8 },
  warning: {
    color: "#D44B3A",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  actionBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DCD8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBtnText: { color: "#1E1E1E", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    padding: 16,
  },
  timeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    padding: 16,
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  modalBtnText: { color: "#1E1E1E", fontWeight: "600" },
  wheelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  poiRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E6E2",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  timelineAxisCol: {
    width: 30,
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E6DCD8",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F04623",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  timelineDotStart: {
    backgroundColor: "#2E7D32",
  },
  timelineDotEnd: {
    backgroundColor: "#2E7D32",
  },
  timelineDotLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
  },
  timelineContentCol: {
    flex: 1,
    paddingLeft: 8,
  },
  travelLabel: {
    fontSize: 12,
    color: "#8C7F7A",
    marginBottom: 6,
    marginLeft: 4,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  poiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  poiBadge: {
    backgroundColor: "#FFE1D8",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  poiBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F04623",
  },
  poiFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  poiUtility: {
    fontWeight: "600",
    color: "#8C7F7A",
  },
  poiRowTitle: { fontWeight: "700", color: "#1E1E1E" },
  poiRowMeta: { color: "#8C7F7A" },
});
