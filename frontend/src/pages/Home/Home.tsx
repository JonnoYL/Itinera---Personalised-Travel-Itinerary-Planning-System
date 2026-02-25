import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  Animated,
  PanResponder,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Polyline, Region, LatLng, Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../components/Nav/HomeStack";
import { apiGetItineraries } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { useFocusEffect } from "@react-navigation/native";
import type { BackendItinerary } from "../../lib/types";

function extractPolyline(it: BackendItinerary): LatLng[][] {
  const lines: LatLng[][] = [];
  const fc = it.feature_collection;
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    return lines;
  }
  for (const f of fc.features) {
    const geom = f?.geometry;
    if (!geom || typeof geom.type !== "string") continue;
    if (geom.type === "LineString") {
      const coords = (geom.coordinates as unknown[]) || [];
      const latlngs: LatLng[] = [];
      for (const pair of coords as [number, number][]) {
        if (
          Array.isArray(pair) &&
          typeof pair[0] === "number" &&
          typeof pair[1] === "number"
        ) {
          latlngs.push({ latitude: pair[1], longitude: pair[0] });
        }
      }
      if (latlngs.length >= 2) lines.push(latlngs);
    }
  }
  return lines;
}

function formatTime(ts?: string | null): string {
  if (!ts || typeof ts !== "string") return "—";
  const parts = ts.split(":");
  if (parts.length < 2) return ts;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ts;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, "0");
  return `${h12}:${mm} ${ampm}`;
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

function formatVisitDuration(mins?: number | null): string | null {
  if (typeof mins !== "number" || !Number.isFinite(mins) || mins <= 0) {
    return null;
  }
  if (mins < 60) return `${Math.round(mins)} mins`;
  const hours = Math.floor(mins / 60);
  const rem = Math.round(mins % 60);
  if (rem >= 10) {
    return `${hours} ${hours === 1 ? "hr" : "hrs"} ${rem} mins`;
  }
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { token } = useUser();
  const [backendIts, setBackendIts] = useState<BackendItinerary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedItinerary = useMemo(
    () => backendIts.find((i) => i.id === selectedId) || null,
    [backendIts, selectedId],
  );
  const [region, setRegion] = useState<Region>({
    latitude: -33.8688,
    longitude: 151.2093,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  });
  const mapRef = useRef<MapView | null>(null);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const sheetY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (selectedItinerary) {
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedItinerary, sheetY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_e, g) => {
        const dy = Math.max(0, g.dy);
        sheetY.setValue(dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 60 || g.vy > 0.8) {
          setSelectedId(null);
          Animated.timing(sheetY, {
            toValue: 200,
            duration: 150,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(sheetY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const fitItinerary = useCallback(
    (it: BackendItinerary) => {
      const lineGroups = extractPolyline(it);
      const all: LatLng[] = [];
      for (const g of lineGroups) {
        for (const c of g) all.push(c);
      }
      if (all.length >= 2 && mapRef.current) {
        mapRef.current.fitToCoordinates(all, {
          edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
          animated: true,
        });
      }
    },
    [mapRef],
  );

  const load = useCallback(async () => {
    try {
      const list = await apiGetItineraries(token);
      setBackendIts(list || []);
    } finally {
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load]),
  );

  useEffect(() => {
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const cur = region;
      const next: Region = {
        latitude: cur.latitude,
        longitude: cur.longitude,
        latitudeDelta: Math.max(
          0.0005,
          Math.min(80, cur.latitudeDelta * factor),
        ),
        longitudeDelta: Math.max(
          0.0005,
          Math.min(80, cur.longitudeDelta * factor),
        ),
      };
      setRegion(next);
      mapRef.current?.animateToRegion(next, 250);
    },
    [region],
  );
  const zoomIn = useCallback(() => zoomBy(0.5), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(2), [zoomBy]);

  return (
    <View style={styles.container}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        showsMyLocationButton={Platform.OS === "android"}
        initialRegion={region}
        onRegionChangeComplete={(r) => setRegion(r)}
        mapType={mapType}
      >
        {backendIts.map((it) => {
          const lines = extractPolyline(it);
          if (!lines.length) return null;
          return (
            <View key={it.id.toString()}>
              {lines.map((coords, idx) => (
                <Polyline
                  key={`${it.id}-${idx}`}
                  coordinates={coords}
                  strokeWidth={4}
                  strokeColor={selectedId === it.id ? "#FF5533" : "#FF9A7A"}
                  tappable
                  onPress={() => {
                    setSelectedId(it.id);
                    fitItinerary(it);
                  }}
                  zIndex={selectedId === it.id ? 10 : 5}
                />
              ))}
            </View>
          );
        })}
        {/* POI pins for the selected itinerary */}
        {selectedItinerary &&
          Array.isArray(selectedItinerary.pois) &&
          selectedItinerary.pois.map((ip, idx) => {
            const lat = ip.poi?.latitude;
            const lon = ip.poi?.longitude;
            if (typeof lat !== "number" || typeof lon !== "number") return null;
            const title = `${idx + 1}. ${ip.poi?.name || "POI"}`;
            const descParts: string[] = [];
            if (ip.poi?.category) {
              const cat = String(ip.poi.category).replace(/,/g, ", ");
              descParts.push(cat);
            }
            const dur = formatVisitDuration(
              typeof ip.poi?.avg_visit_time === "number"
                ? ip.poi.avg_visit_time
                : null,
            );
            if (dur) descParts.push(dur);
            if (typeof ip.poi?.visit_cost === "number")
              descParts.push(`$${ip.poi.visit_cost.toFixed(0)}`);
            const description = descParts.join(" • ");
            return (
              <Marker
                key={`poi-${selectedItinerary.id}-${ip.id}-${idx}`}
                coordinate={{ latitude: lat, longitude: lon }}
                title={title}
                description={description}
                zIndex={20}
              />
            );
          })}
      </MapView>
      {/* zoom controls */}
      <View style={[styles.zoomGroup, { bottom: 90 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          onPress={zoomIn}
          style={styles.ctrlBtn}
        >
          <Text style={styles.ctrlText}>+</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={zoomOut}
          style={[styles.ctrlBtn, { marginTop: 8 }]}
        >
          <Text style={styles.ctrlText}>−</Text>
        </Pressable>
      </View>
      {/* map type toggle (icon) */}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          setMapType((t) => (t === "standard" ? "satellite" : "standard"))
        }
        style={[
          styles.ctrlBtn,
          styles.typeIconBtn,
          { bottom: 194 + insets.bottom },
        ]}
      >
        <Ionicons
          name={mapType === "standard" ? "layers" : "map-outline"}
          size={18}
          color="#1E1E1E"
        />
      </Pressable>
      {/* floating New Itinerary button */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("NewItinerary")}
        style={[styles.newButton, { bottom: 16 + insets.bottom }]}
      >
        <Text style={styles.newButtonText}>+ New Itinerary</Text>
      </Pressable>

      {/* bottom popup for selected itinerary */}
      {selectedItinerary && (
        <Animated.View
          style={[
            styles.bottomCard,
            { paddingBottom: 12 + insets.bottom },
            { transform: [{ translateY: sheetY }] },
          ]}
        >
          {/* collapse handle - slideable */}
          <View
            style={{ alignItems: "center", paddingVertical: 6 }}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
          </View>
          {/* tappable card area */}
          <Pressable
            onPress={() => {
              const id = selectedItinerary.id;
              setSelectedId(null);
              navigation.navigate("ItineraryDetail", { backendId: id });
            }}
            accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            {/* cover photo */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                backgroundColor: "#EDE7E3",
                overflow: "hidden",
                marginRight: 12,
              }}
            >
              {Array.isArray(selectedItinerary.cover_photos) &&
              selectedItinerary.cover_photos?.[0] ? (
                <Image
                  source={{ uri: selectedItinerary.cover_photos[0] as string }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{selectedItinerary.name}</Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {formatDate(selectedItinerary.date)} •{" "}
                {formatTime(selectedItinerary.start_time)} →{" "}
                {formatTime(selectedItinerary.end_time)}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {Array.isArray(selectedItinerary.categories) &&
                selectedItinerary.categories.length
                  ? selectedItinerary.categories.join(", ")
                  : "—"}
              </Text>
              <Text
                style={[styles.cardSub, { marginTop: 2, fontWeight: "700" }]}
              >
                Tap to view itinerary
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F5" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    position: "relative",
  },
  cardRow: { flexDirection: "row", gap: 10 },
  bigImg: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#EDE7E3",
  },
  smallCol: { flex: 1, gap: 8 },
  smallImg: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#EDE7E3",
    minHeight: 66,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E1E1E" },
  cardPrice: { color: "#8C7F7A" },
  cardSub: { color: "#8C7F7A", marginTop: 2 },
  cardDate: { fontWeight: "700", color: "#1E1E1E", marginTop: 10 },
  bottomCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 8,
    elevation: 6,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: "#E6DCD8",
    borderRadius: 3,
  },
  viewBtn: {
    alignSelf: "center",
    backgroundColor: "#F04623",
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
  },
  viewBtnText: { color: "#fff", fontWeight: "700" },
  emptyOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  trashWrapBase: {
    position: "absolute",
    right: 12,
    bottom: 12,
    borderRadius: 20,
    padding: 8,
    opacity: 1,
  },
  trashHover: {
    shadowColor: "#F04623",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  placeholder: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 24,
  },
  placeholderText: {
    color: "#8C7F7A",
    textAlign: "center",
    backgroundColor: "#F3EAE6",
    paddingVertical: 14,
    borderRadius: 14,
  },
  newButton: {
    position: "absolute",
    right: 20,
    backgroundColor: "#F04623",
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  newButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  zoomGroup: {
    position: "absolute",
    right: 20,
    alignItems: "center",
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6DCD8",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  ctrlText: { color: "#1E1E1E", fontSize: 18, fontWeight: "700" },
  typeIconBtn: { position: "absolute", right: 20 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1E1E",
    textAlign: "center",
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2C201D",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    backgroundColor: "#F3EAE6",
  },
  modalDeleteBtn: {
    backgroundColor: "#F04623",
  },
  modalCancelText: {
    color: "#1E1E1E",
    fontWeight: "600",
  },
  modalDeleteText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
