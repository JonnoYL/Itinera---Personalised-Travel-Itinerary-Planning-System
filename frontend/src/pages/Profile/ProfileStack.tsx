import React from "react";
import Profile from "./Profile";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

export type ProfileTabStackParamList = {
  ProfileMain: undefined;
};

const Stack = createNativeStackNavigator<ProfileTabStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
    </Stack.Navigator>
  );
}
