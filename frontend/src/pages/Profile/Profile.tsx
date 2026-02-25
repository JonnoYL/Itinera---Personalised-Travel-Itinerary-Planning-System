import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from "react-native";
import PrimaryButton from "../../components/UI/PrimaryButton";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "../../context/UserContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
};

export default function Profile() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { username, fullName, avatarUri, setAvatarUri, logout } = useUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Pressable
        style={{ alignItems: "center" }}
        onPress={async () => {
          if (Platform.OS === "web") {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = () => {
              const file = input.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setAvatarUri(url);
              }
            };
            input.click();
            return;
          }

          try {
            const ImagePicker = await import("expo-image-picker");
            const perm =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== "granted") return;
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (!result.canceled) {
              setAvatarUri(result.assets[0].uri);
            }
          } catch {
            return;
          }
        }}
      >
        <Image
          source={{
            uri:
              avatarUri ||
              "https://placehold.co/120x120/EBE0FF/5F4B8B?text=%F0%9F%91%A4",
          }}
          style={styles.avatar}
        />
        <Text style={styles.change}>Change</Text>
      </Pressable>
      <Text style={styles.name}>{username || fullName}</Text>

      <View style={{ height: 24 }} />
      <PrimaryButton
        title="Log Out"
        onPress={() => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }}
        style={styles.primaryBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#2C201D",
    marginBottom: 8,
  },
  change: {
    color: "#8C7F7A",
    fontSize: 12,
    marginTop: 6,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EBE0FF",
  },
  name: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#2C201D",
    marginTop: 12,
  },
  primaryBtn: {
    alignSelf: "center",
    width: "85%",
  },
});
