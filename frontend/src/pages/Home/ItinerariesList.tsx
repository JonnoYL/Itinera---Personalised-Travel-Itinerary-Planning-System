import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Modal,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../components/Nav/HomeStack";
import { useItineraries } from "../../context/ItineraryContext";
import { apiGetItineraries, apiDeleteItinerary } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BackendItinerary } from "../../lib/types";

export default function ItinerariesList() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { token } = useUser();
  const { deleteItinerary } = useItineraries();
  const [backendIts, setBackendIts] = useState<BackendItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGetItineraries(token);
      setBackendIts(list || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load]),
  );

  return (
    <View style={styles.container}>
      {backendIts.length === 0 ? (
        <View
          style={[
            styles.placeholder,
            { paddingBottom: 16 + insets.bottom + 56 + 20 },
          ]}
        >
          <Text style={styles.placeholderText}>
            {loading ? "Loading..." : "No itineraries yet — create one"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={backendIts}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={{
            paddingTop: 16 + insets.top,
            paddingBottom: 16 + insets.bottom + 56 + 20,
          }}
          renderItem={({ item }) => (
            <ItineraryCardBackend
              item={item}
              onPressDelete={() => setPendingDeleteId(item.id)}
            />
          )}
        />
      )}

      {/* New Itinerary Button */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("NewItinerary")}
        style={[styles.newButton, { bottom: 16 + insets.bottom }]}
      >
        <Text style={styles.newButtonText}>+ New Itinerary</Text>
      </Pressable>

      {/* Confirm Delete Modal */}
      <Modal
        transparent
        visible={pendingDeleteId !== null}
        animationType="fade"
        onRequestClose={() => setPendingDeleteId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Itinerary Deletion</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to delete this itinerary?
            </Text>
            <View style={styles.modalButtonsRow}>
              <Pressable
                accessibilityRole="button"
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setPendingDeleteId(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.modalBtn, styles.modalDeleteBtn]}
                onPress={async () => {
                  if (pendingDeleteId !== null) {
                    const id = pendingDeleteId;
                    const ok = await apiDeleteItinerary(id);

                    if (ok) {
                      deleteItinerary(id.toString());
                    }
                    await load();
                  }
                  setPendingDeleteId(null);
                }}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F5",
    paddingHorizontal: 16,
  },
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
  cardCover: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    backgroundColor: "#EDE7E3",
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
  trashWrapBase: {
    position: "absolute",
    right: 12,
    bottom: 12,
    borderRadius: 20,
    padding: 8,
    backgroundColor: "#F04623",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: { backgroundColor: "#F3EAE6" },
  modalDeleteBtn: { backgroundColor: "#F04623" },
  modalCancelText: { color: "#1E1E1E", fontWeight: "600" },
  modalDeleteText: { color: "#FFFFFF", fontWeight: "600" },
});

function ItineraryCardBackend({
  item,
  onPressDelete,
}: {
  item: BackendItinerary;
  onPressDelete: () => void;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dateLabel = (() => {
    const d = new Date(item.date);
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  })();
  const imgs = (item.cover_photos || [])
    .filter((u) => u && u.trim().length > 0)
    .slice(0, 3) as string[];
  const coverUri = imgs[0] || null;
  const total =
    typeof item.total_cost === "number" && item.total_cost >= 0
      ? item.total_cost
      : 0;
  const budget =
    typeof item.budget === "number" && item.budget >= 0 ? item.budget : 0;
  const over = budget > 0 && total > budget;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        navigation.navigate("ItineraryDetail", { backendId: item.id })
      }
      style={styles.card}
    >
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={styles.cardCover}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardCover} />
      )}
      <View style={styles.cardTitleRow}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {item.name}
        </Text>
        <Text style={[styles.cardPrice, over && { color: "#D44B3A" }]}>
          {budget > 0
            ? `$${total.toFixed(0)} / $${budget.toFixed(0)}`
            : `$${total.toFixed(0)}`}
        </Text>
      </View>
      {!!item.description && (
        <Text numberOfLines={1} style={styles.cardSub}>
          {item.description}
        </Text>
      )}
      {!!(item.start_loc || item.start_name) && (
        <Text numberOfLines={1} style={styles.cardSub}>
          {item.start_loc || item.start_name}
        </Text>
      )}
      <Text style={styles.cardDate}>{dateLabel}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPressDelete}
        style={styles.trashWrapBase}
        hitSlop={8}
      >
        <Ionicons name="trash" size={18} color="#FFFFFF" />
      </Pressable>
    </Pressable>
  );
}
