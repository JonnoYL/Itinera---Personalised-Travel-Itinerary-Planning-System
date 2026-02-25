import React from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "outline";

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
};

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  variant = "primary",
  style,
  textStyle,
  testID,
}: Props) {
  const variantStyle =
    variant === "primary"
      ? styles.primary
      : variant === "secondary"
        ? styles.secondary
        : styles.outline;

  const variantTextStyle =
    variant === "outline" ? styles.outlineText : styles.filledText;

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {/* render the title with contrasting text color */}
      <Text style={[styles.textBase, variantTextStyle, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  textBase: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.5,
  },
  primary: {
    backgroundColor: "#F04623",
  },
  secondary: {
    backgroundColor: "#F04623",
    opacity: 0.85,
  },
  outline: {
    borderWidth: 1,
    borderColor: "#E5D9D4",
    backgroundColor: "#FFFFFF",
  },
  filledText: {
    color: "#FFFFFF",
  },
  outlineText: {
    color: "#2C201D",
  },
});
