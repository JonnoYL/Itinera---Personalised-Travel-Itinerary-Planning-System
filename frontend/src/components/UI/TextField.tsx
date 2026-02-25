import React from "react";
import { TextInput, StyleSheet, View, TextInputProps } from "react-native";

type Props = TextInputProps & {
  testID?: string;
};

export default function TextField(props: Props) {
  // Styled text field used across auth, keeps colors and radius consistent with everything later on
  return (
    <View style={styles.container}>
      <TextInput
        placeholderTextColor="#8C7F7A"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    // Soft rose background
    backgroundColor: "#F0E8E4",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2C201D",
  },
});
