import React, { useMemo, useRef, useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  Animated,
  Image,
  Alert,
} from "react-native";
import LocationAutocomplete, {
  GeoPlace,
} from "../../components/UI/LocationAutocomplete";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "../../context/UserContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiGetPoiCategories } from "../../lib/api";
import * as ImagePicker from "expo-image-picker";

type ChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

function Chip({ label, selected, onToggle }: ChipProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={`chip-${label}`}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

type DateTimeModalProps = {
  visible: boolean;
  initial: Date | null;
  onClose: () => void;
  onConfirm: (d: Date) => void;
  title: string;
  mode?: "datetime" | "date" | "time";
};

function DateTimeModal({
  visible,
  initial,
  onClose,
  onConfirm,
  title,
  mode = "datetime",
}: DateTimeModalProps) {
  const [pickerValue, setPickerValue] = useState<Date>(initial ?? new Date());
  useEffect(() => {
    if (visible) setPickerValue(initial ?? new Date());
  }, [visible, initial]);

  const confirm = () => onConfirm(pickerValue);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <DateTimePicker
              value={pickerValue}
              mode={mode === "date" ? "date" : "time"}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              {...(Platform.OS === "ios"
                ? {
                    themeVariant: "light",
                    textColor: "#1E1E1E",
                  }
                : {})}
              style={{ height: 216, alignSelf: "stretch" }}
              onChange={(_, d) => {
                if (d) setPickerValue(d);
              }}
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={[styles.modalBtn, styles.modalCancel]}
              accessibilityRole="button"
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              style={[styles.modalBtn, styles.modalConfirm]}
              accessibilityRole="button"
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function NewItinerary() {
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const combineSteps = true;
  const compact = true;
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const { token, userId } = useUser();
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [budget, setBudget] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spin = useMemo(
    () =>
      spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [spinAnim],
  );
  useEffect(() => {
    if (isCreating) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation(() => spinAnim.setValue(0));
    }
  }, [isCreating, spinAnim]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGetPoiCategories();
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setCategories(list);
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startInput, setStartInput] = useState<string>("");
  const [startPlace, setStartPlace] = useState<GeoPlace | null>(null);
  const [endEnabled, setEndEnabled] = useState<boolean>(false);
  const [endInput, setEndInput] = useState<string>("");
  const [endPlace, setEndPlace] = useState<GeoPlace | null>(null);
  const [images, setImages] = useState<string[]>(["", "", ""]);
  const [showStartLocModal, setShowStartLocModal] = useState(false);
  const [showEndLocModal, setShowEndLocModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<boolean>(false);

  async function pickImage(slot: 0 | 1 | 2) {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access to add a cover photo.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImages((prev) => {
          const next = [...prev];
          next[slot] = uri;
          return next;
        });
      }
    } catch {
    }
  }

  const toggleCategory = (label: string) => {
    setSelectedCategories((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    );
  };

  const timeInvalid = useMemo(() => {
    if (!startTime || !endTime) return false;
    return endTime.getTime() <= startTime.getTime();
  }, [startTime, endTime]);

  const isTravelDateValid = useMemo(() => {
    if (!travelDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(travelDate);
    selected.setHours(0, 0, 0, 0);
    return selected >= today;
  }, [travelDate]);

  const budgetNumber = useMemo(() => {
    const n = Number(budget);
    return Number.isFinite(n) ? n : NaN;
  }, [budget]);

  const isBudgetValid = useMemo(
    () => budget.trim().length > 0 && budgetNumber > 0,
    [budget, budgetNumber],
  );
  const isNameValid = useMemo(() => name.trim().length >= 2, [name]);
  const isStartLocationValid = useMemo(() => !!startPlace, [startPlace]);

  const allRequiredValid =
    isTravelDateValid &&
    !!startTime &&
    !!endTime &&
    !timeInvalid &&
    isBudgetValid &&
    isNameValid &&
    isStartLocationValid;

  function formatTime(date: Date | null): string {
    if (!date) return "—";
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const mm = minutes.toString().padStart(2, "0");
    return `${h12}:${mm} ${ampm}`;
  }

  useEffect(() => {
    if (!endEnabled) {
      setEndInput("");
      setEndPlace(null);
    }
  }, [endEnabled]);

  const handleCreate = async () => {
    if (!allRequiredValid) return;
    try {
      setIsCreating(true);
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const toTime = (d: Date) => {
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        const ss = d.getSeconds().toString().padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
      };
      const dateStr = (travelDate ?? new Date()).toISOString().slice(0, 10);
      const startLoc = startInput.trim();
      const safeBudget = Math.max(budgetNumber, 50);
      const backendPayload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        date: dateStr,
        cover_photos: images.filter((u) => u.trim().length > 0).slice(0, 1),
        budget: safeBudget,
        start_time: toTime(startTime!),
        end_time: toTime(endTime!),
        start_loc:
          startPlace?.name ||
          startPlace?.formatted ||
          startLoc ||
          `${startPlace?.lat},${startPlace?.lon}`,
        start_lat: startPlace?.lat ?? null,
        start_long: startPlace?.lon ?? null,
        start_name: startPlace?.name || startPlace?.formatted || startLoc,
        start_cat:
          startPlace?.category ||
          (Array.isArray(startPlace?.categories) &&
          startPlace?.categories.length
            ? startPlace.categories[0]
            : "tourism.sights.city_hall"),
        categories: selectedCategories,
        user_id: userId ?? 1,
      };
      if (endPlace) {
        backendPayload.end_lat = endPlace.lat;
        backendPayload.end_long = endPlace.lon;
        backendPayload.end_name = endPlace.name || endPlace.formatted;
        backendPayload.end_cat =
          endPlace.category ||
          (Array.isArray(endPlace.categories) && endPlace.categories.length
            ? endPlace.categories[0]
            : "tourism.sights.city_hall");
      }
      console.log("Sending itinerary to backend:", backendPayload);
      const response = await axios.post(
        `${BASE_URL}/itineraries`,
        backendPayload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      const createdId: number | undefined = response?.data?.id;
      if (typeof createdId !== "number") {
        Alert.alert("Create failed", "Could not create itinerary.");
        return;
      }

      try {
        await axios.post(`${BASE_URL}/itineraries/${createdId}/generate`);
      } catch (err) {
        const e = err as AxiosError<{ detail?: unknown }>;
        const detail =
          (e.response?.data as { detail?: string } | undefined)?.detail ||
          "An itinerary could not be generated";
        try {
          await axios.delete(`${BASE_URL}/itineraries/${createdId}`);
        } catch {}
        Alert.alert("Generation failed", String(detail));
        return;
      }

      // @ts-expect-error typed in HomeStackParamList
      navigation.replace("ItineraryDetail", { backendId: createdId });
    } catch (e) {
      const err = e as AxiosError<unknown>;
      console.error("Itinerary create/generate failed:", err);
      Alert.alert("Error", "Create failed.");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [step, anim]);

  const fadeStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  } as const;

  return (
    <View style={styles.root}>
      {compact && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "ios" ? insets.top + 6 : 12,
            paddingBottom: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={{ color: "#1E1E1E", fontWeight: "700" }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: "#1E1E1E", fontWeight: "700", fontSize: 18 }}>
            Create Trip
          </Text>
          {!reviewMode ? (
            <Pressable
              onPress={() => {
                if (!allRequiredValid) return;
                setReviewMode(true);
              }}
              disabled={!allRequiredValid}
              accessibilityRole="button"
              accessibilityState={{ disabled: !allRequiredValid }}
            >
              <Text
                style={{
                  color: !allRequiredValid ? "#C9BBB6" : "#F04623",
                  fontWeight: "700",
                }}
              >
                Review
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setReviewMode(false)}
              accessibilityRole="button"
            >
              <Text style={{ color: "#F04623", fontWeight: "700" }}>Edit</Text>
            </Pressable>
          )}
        </View>
      )}
      <ScrollView
        contentContainerStyle={[styles.scroll, compact && { paddingTop: 8 }]}
      >
        {!compact && (
          <Text accessibilityRole="header" style={styles.headerTitle}>
            Itinera
          </Text>
        )}
        <View style={styles.centerWrap}>
          {compact && !reviewMode && (
            <Animated.View style={fadeStyle}>
              {/* Trip Name */}
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Trip Name*
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Weekend in New York"
                value={name}
                onChangeText={setName}
                accessibilityLabel="Itinerary name"
                maxLength={50}
                placeholderTextColor="#8C7F7A"
              />
              {!isNameValid && name.trim().length > 0 && (
                <Text
                  style={[styles.helper, { textAlign: "left", marginTop: 4 }]}
                >
                  Enter at least 2 characters
                </Text>
              )}

              {/* Description */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Trip Description*
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { height: 80, textAlignVertical: "top" },
                ]}
                placeholder="Short description"
                value={description}
                onChangeText={setDescription}
                accessibilityLabel="Itinerary description"
                multiline
                maxLength={100}
                placeholderTextColor="#8C7F7A"
              />

              {/* Start Date */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Date*
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                testID="btn-travel-date"
                style={styles.inputButton}
              >
                <Text
                  style={[
                    styles.inputButtonText,
                    !travelDate && styles.placeholderText,
                  ]}
                >
                  {travelDate
                    ? travelDate.toLocaleDateString()
                    : "Select Travel Date"}
                </Text>
              </Pressable>
              {travelDate && !isTravelDateValid && (
                <Text
                  style={[styles.helper, { textAlign: "left", marginTop: 4 }]}
                >
                  Travel date cannot be in the past
                </Text>
              )}

              {/* Start Location */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Start Location*
              </Text>
              <Pressable
                onPress={() => setShowStartLocModal(true)}
                accessibilityRole="button"
                style={styles.inputButton}
                testID="start-autocomplete-open"
              >
                <Text
                  style={[
                    styles.inputButtonText,
                    !(startPlace || startInput) && styles.placeholderText,
                  ]}
                >
                  {startPlace?.formatted ||
                    startPlace?.name ||
                    startInput ||
                    "Search city or place"}
                </Text>
              </Pressable>
              {!isStartLocationValid && startInput.trim().length > 0 && (
                <Text
                  style={[styles.helper, { textAlign: "left", marginTop: 4 }]}
                >
                  Start location is required
                </Text>
              )}

              {/* End Location (optional) */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                End Location (optional)
              </Text>
              <Pressable
                onPress={() => setShowEndLocModal(true)}
                accessibilityRole="button"
                style={styles.inputButton}
                testID="end-autocomplete-open"
              >
                <Text
                  style={[
                    styles.inputButtonText,
                    !(endPlace || endInput) && styles.placeholderText,
                  ]}
                >
                  {endPlace?.formatted ||
                    endPlace?.name ||
                    endInput ||
                    "Same as start (round trip)"}
                </Text>
              </Pressable>
              {!!(endPlace || endInput) && (
                <Pressable
                  onPress={() => {
                    setEndInput("");
                    setEndPlace(null);
                  }}
                  accessibilityRole="button"
                  style={{ alignSelf: "flex-end", marginTop: 6 }}
                >
                  <Text style={{ color: "#8C7F7A" }}>Clear</Text>
                </Pressable>
              )}

              {/* Times */}
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.subtleLbl,
                      { marginBottom: 4, textAlign: "left" },
                    ]}
                  >
                    Start Time*
                  </Text>
                  <Pressable
                    onPress={() => setShowStartPicker(true)}
                    accessibilityRole="button"
                    testID="btn-start-time"
                    style={styles.inputButton}
                  >
                    <Text
                      style={[
                        styles.inputButtonText,
                        !startTime && styles.placeholderText,
                      ]}
                    >
                      {startTime ? formatTime(startTime) : "Select Start Time"}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.subtleLbl,
                      { marginBottom: 4, textAlign: "left" },
                    ]}
                  >
                    End Time*
                  </Text>
                  <Pressable
                    onPress={() => setShowEndPicker(true)}
                    accessibilityRole="button"
                    testID="btn-end-time"
                    style={styles.inputButton}
                  >
                    <Text
                      style={[
                        styles.inputButtonText,
                        !endTime && styles.placeholderText,
                      ]}
                    >
                      {endTime ? formatTime(endTime) : "Select End Time"}
                    </Text>
                  </Pressable>
                </View>
              </View>
              {timeInvalid && (
                <Text
                  style={[styles.helper, { textAlign: "left", marginTop: 4 }]}
                >
                  End must be after start
                </Text>
              )}

              {/* Budget */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Budget*
              </Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="Enter Budget"
                value={budget}
                onChangeText={setBudget}
                accessibilityLabel="Budget"
                testID="input-budget"
                placeholderTextColor="#8C7F7A"
              />
              {!isBudgetValid && budget.trim().length > 0 && (
                <Text
                  style={[styles.helper, { textAlign: "left", marginTop: 4 }]}
                >
                  Enter a positive number
                </Text>
              )}

              {/* Categories */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Categories*
              </Text>
              <Pressable
                onPress={() => setShowCategoriesModal(true)}
                accessibilityRole="button"
                style={styles.inputButton}
              >
                <Text
                  style={[
                    styles.inputButtonText,
                    selectedCategories.length === 0 && styles.placeholderText,
                  ]}
                >
                  {selectedCategories.length
                    ? selectedCategories.join(", ")
                    : "Select categories"}
                </Text>
              </Pressable>

              {/* Cover Photo (single) */}
              <View style={{ height: 10 }} />
              <Text
                style={[
                  styles.subtleLbl,
                  { marginBottom: 4, textAlign: "left" },
                ]}
              >
                Cover Photo (optional)
              </Text>
              <Pressable
                onPress={() => pickImage(0)}
                accessibilityRole="button"
                style={{
                  height: 84,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E6DCD8",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                testID="cover-photo-picker"
              >
                {images[0] ? (
                  <Image
                    source={{ uri: images[0] }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: "#8C7F7A" }}>Add photo</Text>
                )}
              </Pressable>
            </Animated.View>
          )}
          {compact && reviewMode && (
            <Animated.View style={fadeStyle}>
              <Text style={styles.reviewHeader}>Review</Text>
              <Text style={styles.reviewSub}>Confirm your details</Text>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="text" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Name"
                  value={isNameValid ? name.trim() : "—"}
                />
              </View>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="create-outline" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Description"
                  value={description.trim() || "—"}
                />
              </View>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="location-outline" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Start"
                  value={
                    isStartLocationValid
                      ? startPlace?.formatted ||
                        startPlace?.name ||
                        startInput.trim()
                      : "—"
                  }
                />
              </View>
              {!!(endPlace || endInput) && (
                <View style={styles.reviewIconRow}>
                  <View style={styles.reviewIconWrap}>
                    <Ionicons name="location" size={22} color="#F04623" />
                  </View>
                  <ReviewRow
                    label="End"
                    value={
                      endPlace
                        ? endPlace.formatted || endPlace.name || "—"
                        : "—"
                    }
                  />
                </View>
              )}
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="calendar" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Travel Date"
                  value={travelDate ? travelDate.toLocaleDateString() : "—"}
                />
              </View>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="time" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Times"
                  value={`${formatTime(startTime)} → ${formatTime(endTime)}`}
                />
              </View>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="wallet" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Budget"
                  value={isBudgetValid ? `$${budgetNumber.toFixed(0)}` : "—"}
                />
              </View>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="list" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Categories"
                  value={
                    selectedCategories.length
                      ? selectedCategories.join(", ")
                      : "—"
                  }
                />
              </View>
              <View style={styles.reviewIconRow}>
                <View style={styles.reviewIconWrap}>
                  <Ionicons name="image-outline" size={22} color="#F04623" />
                </View>
                <ReviewRow
                  label="Images"
                  value={(
                    images.filter((u) => u.trim().length > 0).length || 0
                  ).toString()}
                />
              </View>
              <View style={{ alignItems: "center", marginTop: 14 }}>
                <Pressable
                  onPress={handleCreate}
                  disabled={!allRequiredValid}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !allRequiredValid }}
                  testID="btn-create-trip-inline"
                  style={[
                    styles.nextBtn,
                    !allRequiredValid && styles.createBtnDisabled,
                    { minWidth: 180 },
                  ]}
                >
                  <Text style={styles.nextBtnText}>Create Trip</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </Pressable>
              </View>
            </Animated.View>
          )}

          {!compact && (
            <>
              {(combineSteps || step === 0) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons name="time" size={20} color="#F04623" />
                    </View>
                    <Text style={styles.sectionTitle}>
                      Step 1: Travel Times
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Select travel date"
                      testID="btn-travel-date"
                      style={styles.inputButton}
                    >
                      <Text
                        style={[
                          styles.inputButtonText,
                          !travelDate && styles.placeholderText,
                        ]}
                      >
                        {travelDate
                          ? travelDate.toLocaleDateString()
                          : "Select Travel Date"}
                      </Text>
                    </Pressable>
                    {travelDate && !isTravelDateValid && (
                      <Text style={styles.helper}>
                        Travel date cannot be in the past
                      </Text>
                    )}
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => setShowStartPicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Select start time"
                      testID="btn-start-time"
                      style={styles.inputButton}
                    >
                      <Text
                        style={[
                          styles.inputButtonText,
                          !startTime && styles.placeholderText,
                        ]}
                      >
                        {startTime
                          ? formatTime(startTime)
                          : "Select Start Time"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => setShowEndPicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Select end time"
                      testID="btn-end-time"
                      style={styles.inputButton}
                    >
                      <Text
                        style={[
                          styles.inputButtonText,
                          !endTime && styles.placeholderText,
                        ]}
                      >
                        {endTime ? formatTime(endTime) : "Select End Time"}
                      </Text>
                    </Pressable>
                  </View>
                  {timeInvalid && (
                    <Text style={styles.helper}>End must be after start</Text>
                  )}
                </Animated.View>
              )}

              {(combineSteps || step === 1) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons name="wallet" size={20} color="#F04623" />
                    </View>
                    <Text style={styles.sectionTitle}>Step 2: Budget</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="Enter Budget"
                    value={budget}
                    onChangeText={setBudget}
                    accessibilityLabel="Budget"
                    testID="input-budget"
                  />
                  {!isBudgetValid && budget.trim().length > 0 && (
                    <Text style={styles.helper}>Enter a positive number</Text>
                  )}
                </Animated.View>
              )}

              {(combineSteps || step === 2) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons name="list" size={20} color="#F04623" />
                    </View>
                    <Text style={styles.sectionTitle}>Step 3: Categories</Text>
                  </View>
                  <View style={[styles.chipsRow, { justifyContent: "center" }]}>
                    {categories.map((c) => (
                      <Chip
                        key={c}
                        label={c}
                        selected={selectedCategories.includes(c)}
                        onToggle={() => toggleCategory(c)}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}

              {(combineSteps || step === 3) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons name="text" size={20} color="#F04623" />
                    </View>
                    <Text style={styles.sectionTitle}>
                      Step 4: Itinerary Name
                    </Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Weekend in New York"
                    value={name}
                    onChangeText={setName}
                    accessibilityLabel="Itinerary name"
                    maxLength={50}
                  />
                  {!isNameValid && name.trim().length > 0 && (
                    <Text style={styles.helper}>
                      Enter at least 2 characters
                    </Text>
                  )}
                </Animated.View>
              )}

              {(combineSteps || step === 4) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color="#F04623"
                      />
                    </View>
                    <Text style={styles.sectionTitle}>
                      Step 5: Short Description
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      { height: 90, textAlignVertical: "top" },
                    ]}
                    placeholder="Add a short description"
                    value={description}
                    onChangeText={setDescription}
                    accessibilityLabel="Itinerary description"
                    multiline
                    maxLength={100}
                  />
                  <Text
                    style={[styles.helper, { color: "#8C7F7A" }]}
                  >{`${description.length}/100`}</Text>
                </Animated.View>
              )}

              {(combineSteps || step === 5) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color="#F04623"
                      />
                    </View>
                    <Text style={styles.sectionTitle}>
                      Step 6: Start Location
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowStartLocModal(true)}
                    accessibilityRole="button"
                    style={styles.inputButton}
                    testID="start-autocomplete-open"
                  >
                    <Text style={styles.inputButtonText}>
                      {startPlace?.formatted ||
                        startPlace?.name ||
                        startInput ||
                        "Search address or place"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEndEnabled((v) => !v)}
                    accessibilityRole="button"
                    style={{
                      alignSelf: "center",
                      marginTop: 8,
                      backgroundColor: "#F3EAE6",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "#1E1E1E", fontWeight: "600" }}>
                      {endEnabled
                        ? "Remove end location"
                        : "Add end location (optional)"}
                    </Text>
                  </Pressable>
                  {endEnabled && (
                    <View style={{ marginTop: 10 }}>
                      <LocationAutocomplete
                        label="End point"
                        placeholder="Search address or place"
                        input={endInput}
                        onInputChange={(t) => {
                          setEndInput(t);
                          if (!t.trim()) setEndPlace(null);
                        }}
                        onSelect={(place) => setEndPlace(place)}
                        testID="end-autocomplete"
                      />
                    </View>
                  )}
                  {!isStartLocationValid && startInput.trim().length > 0 && (
                    <Text style={styles.helper}>
                      Start location is required
                    </Text>
                  )}
                </Animated.View>
              )}

              {(combineSteps || step === 6) && (
                <Animated.View style={fadeStyle}>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color="#F04623"
                      />
                    </View>
                    <Text style={styles.sectionTitle}>
                      Step 7: Cover Photos
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.helper,
                      { color: "#8C7F7A", marginBottom: 10 },
                    ]}
                  >
                    Add 1 photo from your device (optional)
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => pickImage(0)}
                      style={{
                        flex: 1,
                        height: 84,
                        borderRadius: 12,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#E6DCD8",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                      accessibilityRole="button"
                    >
                      {images[0] ? (
                        <Image
                          source={{ uri: images[0] }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ color: "#8C7F7A" }}>Add photo</Text>
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              )}

              {(combineSteps || step === 7) && (
                <Animated.View style={fadeStyle}>
                  <Text style={styles.reviewHeader}>Review</Text>
                  <Text style={styles.reviewSub}>Confirm your details</Text>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons name="text" size={22} color="#F04623" />
                    </View>
                    <ReviewRow
                      label="Name"
                      value={isNameValid ? name.trim() : "—"}
                    />
                  </View>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color="#F04623"
                      />
                    </View>
                    <ReviewRow
                      label="Description"
                      value={description.trim() || "—"}
                    />
                  </View>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons
                        name="location-outline"
                        size={22}
                        color="#F04623"
                      />
                    </View>
                    <ReviewRow
                      label="Start"
                      value={
                        isStartLocationValid
                          ? startPlace?.formatted ||
                            startPlace?.name ||
                            startInput.trim()
                          : "—"
                      }
                    />
                  </View>
                  {endEnabled && (
                    <View style={styles.reviewIconRow}>
                      <View style={styles.reviewIconWrap}>
                        <Ionicons name="location" size={22} color="#F04623" />
                      </View>
                      <ReviewRow
                        label="End"
                        value={
                          endPlace
                            ? endPlace.formatted || endPlace.name || "—"
                            : "—"
                        }
                      />
                    </View>
                  )}
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons name="calendar" size={22} color="#F04623" />
                    </View>
                    <ReviewRow
                      label="Travel Date"
                      value={travelDate ? travelDate.toLocaleDateString() : "—"}
                    />
                  </View>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons name="time" size={22} color="#F04623" />
                    </View>
                    <ReviewRow
                      label="Times"
                      value={`${formatTime(startTime)} → ${formatTime(endTime)}`}
                    />
                  </View>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons name="wallet" size={22} color="#F04623" />
                    </View>
                    <ReviewRow
                      label="Budget"
                      value={
                        isBudgetValid ? `$${budgetNumber.toFixed(0)}` : "—"
                      }
                    />
                  </View>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons name="list" size={22} color="#F04623" />
                    </View>
                    <ReviewRow
                      label="Categories"
                      value={
                        selectedCategories.length
                          ? selectedCategories.join(", ")
                          : "—"
                      }
                    />
                  </View>
                  <View style={styles.reviewIconRow}>
                    <View style={styles.reviewIconWrap}>
                      <Ionicons
                        name="image-outline"
                        size={22}
                        color="#F04623"
                      />
                    </View>
                    <ReviewRow
                      label="Images"
                      value={(
                        images.filter((u) => u.trim().length > 0).length || 0
                      ).toString()}
                    />
                  </View>
                </Animated.View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Travel Date Picker (only future / today allowed) */}
      <DateTimeModal
        visible={showDatePicker}
        initial={travelDate ?? new Date()}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(d) => {
          setTravelDate(d);
          setShowDatePicker(false);
        }}
        title="Select Travel Date"
        mode="date"
      />

      {/* Start Time Picker */}
      <DateTimeModal
        visible={showStartPicker}
        initial={startTime ?? travelDate ?? new Date()}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(d) => {
          setStartTime(d);
          setShowStartPicker(false);
        }}
        title="Select Start Time"
        mode="time"
      />

      {/* End Time Picker */}
      <DateTimeModal
        visible={showEndPicker}
        initial={endTime ?? travelDate ?? new Date()}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(d) => {
          setEndTime(d);
          setShowEndPicker(false);
        }}
        title="Select End Time"
        mode="time"
      />

      {/* start location modal with autosuggest */}
      <Modal
        visible={showStartLocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartLocModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420, width: "100%" }]}>
            <Text style={styles.modalTitle}>Choose Location</Text>
            <LocationAutocomplete
              label="Search"
              placeholder="City or place"
              input={startInput}
              onInputChange={(t) => {
                setStartInput(t);
                if (!t.trim()) setStartPlace(null);
              }}
              onSelect={(place) => {
                setStartPlace(place);
                setShowStartLocModal(false);
              }}
              testID="start-autocomplete-modal"
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowStartLocModal(false)}
                accessibilityRole="button"
                style={[styles.modalBtn, { backgroundColor: "#F04623" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* end location modal with autosuggest */}
      <Modal
        visible={showEndLocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndLocModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420, width: "100%" }]}>
            <Text style={styles.modalTitle}>Choose End Location</Text>
            <LocationAutocomplete
              label="Search"
              placeholder="City or place"
              input={endInput}
              onInputChange={(t) => {
                setEndInput(t);
                if (!t.trim()) setEndPlace(null);
              }}
              onSelect={(place) => {
                setEndPlace(place);
                setShowEndLocModal(false);
              }}
              testID="end-autocomplete-modal"
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEndLocModal(false)}
                accessibilityRole="button"
                style={[styles.modalBtn, { backgroundColor: "#F04623" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* categories modal */}
      <Modal
        visible={showCategoriesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoriesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420, width: "100%" }]}>
            <Text style={styles.modalTitle}>Select Categories</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              <View style={[styles.chipsRow, { justifyContent: "center" }]}>
                {categories.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={selectedCategories.includes(c)}
                    onToggle={() => toggleCategory(c)}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCategoriesModal(false)}
                accessibilityRole="button"
                style={[styles.modalBtn, { backgroundColor: "#F04623" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Creating Spinner */}
      <Modal
        visible={isCreating}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
              justifyContent: "center",
              width: 240,
            }}
          >
            <Animated.View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                borderWidth: 4,
                borderColor: "#F04623",
                borderRightColor: "transparent",
                borderTopColor: "#F04623",
                transform: [{ rotate: spin }],
                marginBottom: 14,
              }}
            />
            <Text style={{ fontWeight: "700", color: "#1E1E1E" }}>
              Planning your itinerary
            </Text>
            <Text style={{ color: "#8C7F7A", marginTop: 6 }}>
              Generating routes and points of interest... yay! 🎉
            </Text>
          </View>
        </View>
      </Modal>

      {/* footer action */}
      {!compact && (
        <View style={styles.footerNav}>
          {combineSteps ? (
            <Pressable
              onPress={handleCreate}
              disabled={!allRequiredValid}
              accessibilityRole="button"
              accessibilityState={{ disabled: !allRequiredValid }}
              testID="btn-create-trip"
              style={[
                styles.nextBtn,
                !allRequiredValid && styles.createBtnDisabled,
              ]}
            >
              <Text style={styles.nextBtnText}>Create Itinerary</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  if (step === 0) {
                    navigation.goBack();
                  } else {
                    setStep((s) => Math.max(0, s - 1));
                  }
                }}
                disabled={false}
                accessibilityRole="button"
                style={[
                  styles.circleBtn,
                  step === 0 && styles.circleBtnDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={step === 0 ? "#1E1E1E" : "#1E1E1E"}
                />
              </Pressable>
              {step < 7 ? (
                <Pressable
                  onPress={() => setStep((s) => Math.min(7, s + 1))}
                  disabled={
                    (step === 0 && (!startTime || !endTime || timeInvalid)) ||
                    (step === 1 && !isBudgetValid) ||
                    (step === 3 && !isNameValid) ||
                    (step === 5 && !isStartLocationValid)
                  }
                  accessibilityRole="button"
                  style={[
                    styles.nextBtn,
                    ((step === 0 && (!startTime || !endTime || timeInvalid)) ||
                      (step === 1 && !isBudgetValid) ||
                      (step === 3 && !isNameValid) ||
                      (step === 5 && !isStartLocationValid)) &&
                      styles.createBtnDisabled,
                  ]}
                >
                  <Text style={styles.nextBtnText}>Next</Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleCreate}
                  disabled={!allRequiredValid}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !allRequiredValid }}
                  testID="btn-create-trip"
                  style={[
                    styles.nextBtn,
                    !allRequiredValid && styles.createBtnDisabled,
                  ]}
                >
                  <Text style={styles.nextBtnText}>Create Trip</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({

  root: { flex: 1, backgroundColor: "#FFF8F5" },

  scroll: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1,
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1E1E1E",
  },

  centerWrap: { width: "100%", maxWidth: 360, alignSelf: "center" },
  section: { marginBottom: 24 },

  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE1D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#1E1E1E" },
  chevron: { fontSize: 18, color: "#8C7F7A" },
  row: { marginBottom: 12 },

  inputButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D5C9C5",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  inputButtonText: { color: "#1E1E1E", fontSize: 16 },

  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D5C9C5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    color: "#1E1E1E",
    fontSize: 16,
  },

  placeholderText: { color: "#8C7F7A" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DCD8",
    marginRight: 8,
    marginBottom: 8,
  },

  chipSelected: { backgroundColor: "#FFE1D8", borderColor: "#F04623" },
  chipText: { color: "#1E1E1E" },
  chipTextSelected: { color: "#F04623", fontWeight: "700" },
  helper: { color: "#D44B3A", marginTop: 6, textAlign: "center" },

  review: {
    marginTop: 20,
    paddingTop: 10,
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
  },
  reviewHeader: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1E1E1E",
    textAlign: "center",
  },

  reviewSub: { color: "#8C7F7A", marginBottom: 20, textAlign: "center" },

  reviewRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  reviewLabel: { color: "#1E1E1E", fontWeight: "700", marginRight: 8 },
  reviewValue: { color: "#1E1E1E", flexShrink: 1 },

  reviewIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFE1D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  footerNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    backgroundColor: "#F04623",
    borderRadius: 28,
    paddingHorizontal: 20,
    flex: 1,
  },

  createBtnDisabled: { backgroundColor: "#F7A892" },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    backgroundColor: "#F04623",
    paddingHorizontal: 16,
    borderRadius: 22,
    minWidth: 120,
  },

  nextBtnText: { color: "#fff", fontWeight: "700", marginRight: 6 },

  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3EAE6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  circleBtnDisabled: { backgroundColor: "#EFE7E3" },

  // ===== Calendar / Modal Styles =====
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
  modalTitle: {
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  calHeaderText: { fontWeight: "600", color: "#1E1E1E" },

  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3EAE6",
    alignItems: "center",
    justifyContent: "center",
  },
  calNavBtnDisabled: {
    backgroundColor: "#EFE7E3",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  weekCell: { width: 36, textAlign: "center", color: "#8C7F7A" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  dayCellFaded: { opacity: 0.4 },
  dayCellSelected: { backgroundColor: "#F04623" },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: { color: "#1E1E1E" },
  dayTextFaded: { color: "#8C7F7A" },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  dayTextDisabled: {
    color: "#8C7F7A",
  },

  subtleLbl: { color: "#8C7F7A", textAlign: "center" },
  timeGridWrap: { paddingHorizontal: 4 },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DCD8",
  },

  timeChipSelected: { backgroundColor: "#FFE1D8", borderColor: "#F04623" },
  timeChipText: { color: "#1E1E1E" },
  timeChipTextSelected: { color: "#F04623", fontWeight: "700" },

  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  modalCancel: { backgroundColor: "#F3EAE6" },
  modalConfirm: { backgroundColor: "#F04623" },
  modalBtnText: { color: "#1E1E1E", fontWeight: "600" },

  dayPressable: {
    cursor: "pointer",
  },
});
