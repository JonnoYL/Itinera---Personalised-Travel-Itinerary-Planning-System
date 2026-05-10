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
  const [sameUsername, setSameUsername] = useState(false);
  const [isInvalidUsername, setIsInvalidUsername] = useState(false);
  const formOpacity = useRef(new Animated.Value(1)).current;
  const [signupError, setSignupError] = useState("");

  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <Animated.View
          style={{ opacity: formOpacity, alignItems: "center", width: "100%" }}
        >
          <Text style={styles.brand}>Itinera</Text>
          <Text style={styles.title}>Sign Up</Text>
          <View style={styles.form}>
            <TextField
              placeholder="Username"
              keyboardType="default"
              autoCapitalize="none"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setSameUsername(false);
                setIsInvalidUsername(false);
                setSignupError("");
              }}
            />
            <View style={{ height: 12 }} />
            <TextField
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setIsPasswordMismatch(false);
                setIsPasswordTooShort(false);
                setSameUsername(false);
                setSignupError("");
              }}
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
              onChangeText={(text) => {
                setConfirmedPassword(text);
                setIsPasswordMismatch(false);
                setSameUsername(false);
                setSignupError("");
              }}
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

            {signupError.length > 0 && (
              <View>
                <View style={{ height: 12 }} />
                <Text style={{ color: "red" }}>{signupError}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Sign Up"
            onPress={async () => {
              setIsPasswordMismatch(false);
              setIsPasswordTooShort(false);
              setSameUsername(false);
              setIsInvalidUsername(false);

              try {
                const signupResult = await signUpWithUsernamePassword(
                  username.trim(),
                  password,
                  confirmedPassword,
                );

                if (!signupResult) {
                  setSameUsername(true);
                  return;
                }

                Keyboard.dismiss();
                setToken(signupResult.token);
                setUserId(signupResult.user_id);
                setCtxUsername(username.trim());

                Animated.timing(formOpacity, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }).start();

                setAnimating(true);
              } catch (err) {
                const axiosError = err as AxiosError<SignupErrorResponse>;
                const detail = axiosError.response?.data?.detail;

                if (axiosError.response?.status === 400) {
                  if (detail === "Username already exists") {
                    setSameUsername(true);
                    return;
                  }

                  if (detail === "Passwords do not match") {
                    setIsPasswordMismatch(true);
                    return;
                  }

                  if (detail === "Password cannot be less than 8 characters") {
                    setIsPasswordTooShort(true);
                    return;
                  }
                }

                if (axiosError.response?.status === 422) {
                  const detail = axiosError.response.data?.detail;
                  const items = Array.isArray(detail) ? detail : [];

                  const hasUsernameError = items.some(
                    (d) => Array.isArray(d?.loc) && d.loc.includes("username"),
                  );

                  if (hasUsernameError) {
                    setIsInvalidUsername(true);
                    return;
                  }
                }
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
          holdMs={450}
          onComplete={() => {
            navigation.replace("MainTabs");
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
});
