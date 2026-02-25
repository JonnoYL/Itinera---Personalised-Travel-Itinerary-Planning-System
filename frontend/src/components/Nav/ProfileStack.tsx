import React from "react";
import Profile from "../../pages/Profile/Profile";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

export type ProfileStackParamList = {
  ProfileRoot: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileRoot" component={Profile} />
    </Stack.Navigator>
  );
}
