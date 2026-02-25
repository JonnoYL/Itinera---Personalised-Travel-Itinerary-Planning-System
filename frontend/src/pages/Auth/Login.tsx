import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Keyboard } from "react-native";
import { useUser } from "../../context/UserContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { loginWithUsernamePassword } from "../../services/auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import TextField from "../../components/UI/TextField";
import PrimaryButton from "../../components/UI/PrimaryButton";
import HelpPopUp from "../../components/UI/HelpPopUp";
import LoginTransition from "../../components/animations/LoginTransition";
import type { RootStackParamList } from "../../App";

export default function Login() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setToken, setUsername: setCtxUsername, setUserId } = useUser();
  // const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [loginFailure, setLoginFailure] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [hasAnimCompleted, setHasAnimCompleted] = useState(false);
  const [hasLoginResolved, setHasLoginResolved] = useState(false);
  const formOpacity = useRef(new Animated.Value(1)).current;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View
          style={{ opacity: formOpacity, alignItems: "center", width: "100%" }}
        >
          <Text style={styles.brand}>Itinera</Text>
          <Text style={styles.title}>Login</Text>

          <View style={styles.form}>
            {/* <TextField
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          /> */}
            <TextField
              placeholder="Username"
              keyboardType="default"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <View style={{ height: 12 }} />
            <TextField
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {showHelp && (
              <HelpPopUp
                modalVisible={showHelp}
                setModalVisible={setShowHelp}
              />
            )}

            {loginFailure && (
              <View>
                <View style={{ height: 12 }} />
                <Text style={{ color: "red" }}>Wrong username or password</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Login"
            onPress={async () => {
              // Backend: Replace with actual login, saving token + user profile
              const loginResult = await loginWithUsernamePassword(
                username,
                password,
              );
              if (!loginResult) {
                setLoginFailure(true);
                return;
              }
              // On successful login, hide keyboard before running transition
              Keyboard.dismiss();
              setToken(loginResult.token);
              setUserId(loginResult.user_id);
              // Store username for Profile display (no backend changes required)
              setCtxUsername(username);
              // Start form fade immediately
              Animated.timing(formOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }).start();

              // Trigger overlay animation
              setAnimating(true);
              setHasAnimCompleted(false);
              setHasLoginResolved(false);

              // Simulate login at the same time
              // await loginWithEmailPassword(email, password);
              setHasLoginResolved(true);
              if (hasAnimCompleted) {
                navigation.replace("MainTabs");
              }
            }}
          />
          <View style={{ height: 12 }} />
          <PrimaryButton
            title="Sign Up"
            variant="secondary"
            onPress={async () => {
              navigation.navigate("SignUp");
            }}
          />
          <View style={{ height: 12 }} />
          <PrimaryButton
            title="Help"
            variant="outline"
            onPress={() => {
              setShowHelp(true);
            }}
          />
        </View>
      </View>
      {animating && (
        <LoginTransition
          // Hold logo on screen for a bit before navigating
          holdMs={450}
          onComplete={() => {
            setHasAnimCompleted(true);
            if (hasLoginResolved) {
              // Replace to avoid returning to login on back
              navigation.replace("MainTabs");
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF8F5",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    marginTop: 0,
    fontSize: 16,
    fontWeight: "600",
    color: "#2C201D",
  },
  title: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 28,
    fontWeight: "700",
    color: "#2C201D",
  },
  form: {
    width: "100%",
    marginTop: 8,
  },
  actions: {
    marginTop: 28,
    width: "100%",
  },
});
