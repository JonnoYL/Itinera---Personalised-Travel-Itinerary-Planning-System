import React, { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, Animated, Easing, View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import HomeStack from "./HomeStack";
import ProfileStack from "./ProfileStack";
import ItinerariesList from "../../pages/Home/ItinerariesList";

export type BottomTabParamList = {
  Home: undefined;
  Itineraries: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const introOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(introOpacity, {
      toValue: 0,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [introOpacity]);
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#F04623",
          tabBarInactiveTintColor: "#8C7F7A",
          tabBarStyle: {
            backgroundColor: "#FFF8F5",
            borderTopColor: "#EDE2DE",
            height: Platform.OS === "ios" ? 70 + insets.bottom : 70,
            paddingBottom: Math.max(insets.bottom, 5),
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 2,
            marginBottom: 0,
          },
          tabBarIcon: ({ color, focused }) => {
            const iconName =
              route.name === "Home"
                ? focused
                  ? "home"
                  : "home-outline"
                : route.name === "Itineraries"
                  ? focused
                    ? "list"
                    : "list-outline"
                  : focused
                    ? "person"
                    : "person-outline";
            return (
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={24}
                color={color}
                style={{ marginBottom: 0 }}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Itineraries" component={ItinerariesList} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "#FFFFFF", opacity: introOpacity },
        ]}
      />
    </View>
  );
}
