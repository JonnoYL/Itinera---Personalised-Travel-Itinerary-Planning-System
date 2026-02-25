import React from "react";
import BottomTabs from "./components/Nav/BottomTabs";
import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import NewItinerary from "./pages/Itinerary/NewItinerary";
import ItineraryDetail from "./pages/Home/ItineraryDetail";
import EditItinerary from "./pages/Home/EditItinerary";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "./context/UserContext";
import { ItineraryProvider } from "./context/ItineraryContext";

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  NewItinerary: undefined;
  ItineraryDetail: undefined;
  EditItinerary: undefined;
  EditInterests: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <UserProvider>
      <ItineraryProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen
              name="SignUp"
              component={SignUp}
              options={{ title: "Sign Up" }}
            />
            <Stack.Screen
              name="MainTabs"
              component={BottomTabs}
              options={{
                animation: "fade",
                title: "Home",
              }}
            />
            <Stack.Screen name="NewItinerary" component={NewItinerary} />
            <Stack.Screen name="ItineraryDetail" component={ItineraryDetail} />
            <Stack.Screen name="EditItinerary" component={EditItinerary} />
          </Stack.Navigator>
        </NavigationContainer>
      </ItineraryProvider>
    </UserProvider>
  );
}
