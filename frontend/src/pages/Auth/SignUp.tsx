import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Keyboard } from "react-native";
import { useUser } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { signUpWithUsernamePassword } from "../../services/auth";
import TextField from "../../components/UI/TextField";
import PrimaryButton from "../../components/UI/PrimaryButton";
import HelpPopUp from "../../components/UI/HelpPopUp";
import LoginTransition from "../../components/animations/LoginTransition";
import type { RootStackParamList } from "../../App";
import type { AxiosError } from "axios";

type SignupErrorResponse = {
  detail?: unknown;
};

export default function SignUp() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setToken, setUsername: setCtxUsername, setUserId } = useUser();
  const [showHelp, setShowHelp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordMismatch, setIsPasswordMismatch] = useState(false);
  const [isPasswordTooShort, setIsPasswordTooShort] = useState(false);
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [animating, setAnimating] = useState(false);
  const [hasAnimCompleted, setHasAnimCompleted] = useState(false);
  const [sameUsername, setSameUsername] = useState(false);
  const [hasLoginResolved, setHasLoginResolved] = useState(false);
  const [isInvalidUsername, setIsInvalidUsername] = useState(false);
  const formOpacity = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <Animated.View
          style={{ opacity: formOpacity, alignItems: "center", width: "100%" }}
        >
          <Text style={styles.brand}>Itinera</Text>
          <Text style={styles.title}>Sign Up</Text>
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
              onChangeText={(text) => {
                setUsername(text);
                setSameUsername(false);
                setIsInvalidUsername(false);
              }}
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
            <View style={{ height: 12 }} />
            <TextField
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmedPassword}
              onChangeText={setConfirmedPassword}
            />

            {isPasswordMismatch && (
              <View>
                <View style={{ height: 12 }} />
                <Text style={{ color: "red" }}>Passwords do not match</Text>
              </View>
            )}

            {isPasswordTooShort && (
              <View>
                <View style={{ height: 12 }} />
                <Text style={{ color: "red" }}>
                  Password cannot be less than 8 characters
                </Text>
              </View>
            )}

            {isInvalidUsername && (
              <View>
                <View style={{ height: 12 }} />
                <Text style={{ color: "red" }}>Invalid Username</Text>
              </View>
            )}

            {sameUsername && (
              <View>
                <View style={{ height: 12 }} />
                <Text style={{ color: "red" }}>Username is taken</Text>
              </View>
            )}

            <Text style={styles.passwordHint}>
              Password must be 8 or more characters long
            </Text>
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Sign Up"
            onPress={async () => {
              // reset errors for this attempt
              setIsPasswordMismatch(false);
              setIsPasswordTooShort(false);
              setSameUsername(false);
              setIsInvalidUsername(false);

              // 1. Still block on password mismatch (purely client-side)
              if (password !== confirmedPassword) {
                setIsPasswordMismatch(true);
                await signUpWithUsernamePassword("", password);
                return;
              }

              // 2. For "too short" password, show the message BUT DO NOT RETURN.
              //    This allows the backend to receive the request and return 422.
              if (password.length < 8) {
                setIsPasswordTooShort(true);
                // important: no `return` here
              }

              const pwdTooShort = password.length < 8;
              if (pwdTooShort) {
                setIsPasswordTooShort(true);
                // Still call backend so it returns 422 and logs in the terminal
                await signUpWithUsernamePassword(username, password);
                return;
              }

              try {
                const signupResult = await signUpWithUsernamePassword(
                  username,
                  password,
                );

                // 400: "Username already exists" -> null -> show "Username is taken"
                if (!signupResult) {
                  setSameUsername(true);
                  return;
                }

                // Success (unchanged)
                Keyboard.dismiss();
                setToken(signupResult.token);
                setUserId(signupResult.user_id);
                setCtxUsername(username);

                Animated.timing(formOpacity, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }).start();

                setAnimating(true);
                setHasAnimCompleted(false);
                setHasLoginResolved(false);

                setHasLoginResolved(true);
                if (hasAnimCompleted) {
                  navigation.replace("MainTabs");
                }
              } catch (err) {
                const axiosError = err as AxiosError<SignupErrorResponse>;

                // 422 Validation Error from backend
                if (axiosError.response?.status === 422) {
                  const detail = axiosError.response.data?.detail;
                  const items = Array.isArray(detail) ? detail : [];

                  // Look at the validation errors to see which field failed.
                  const hasUsernameError = items.some(
                    (d) => Array.isArray(d?.loc) && d.loc.includes("username"),
                  );
                  const hasPasswordError = items.some(
                    (d) => Array.isArray(d?.loc) && d.loc.includes("password"),
                  );

                  if (hasUsernameError) {
                    setIsInvalidUsername(true);
                  }
                  if (hasPasswordError) {
                    setIsPasswordTooShort(true);
                  }

                  return;
                }

                // Other errors (network, 5xx, etc.) – optionally log, no UI change
                // console.error("Signup failed:", axiosError);
              }
            }}
          />
          <View style={{ height: 12 }} />
          <PrimaryButton
            title="Return to Login"
            variant="outline"
            onPress={async () => {
              navigation.navigate("Login");
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
    </View>
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
  passwordHint: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
    color: "#8C7F7A",
    textAlign: "center",
  },
});
