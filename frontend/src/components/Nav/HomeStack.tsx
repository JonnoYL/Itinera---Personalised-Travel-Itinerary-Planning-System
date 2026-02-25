import React from "react";
import Home from "../../pages/Home/Home";
import NewItinerary from "../../pages/Itinerary/NewItinerary";
import ItineraryDetail from "../../pages/Home/ItineraryDetail";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

export type HomeStackParamList = {
  HomeRoot: undefined;
  NewItinerary: undefined;
  ItineraryDetail: { cardId?: string; backendId?: number };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeRoot" component={Home} />
      <Stack.Screen name="NewItinerary" component={NewItinerary} />
      <Stack.Screen name="ItineraryDetail" component={ItineraryDetail} />
    </Stack.Navigator>
  );
}
