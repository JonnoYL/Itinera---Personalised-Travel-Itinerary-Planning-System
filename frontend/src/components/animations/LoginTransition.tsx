import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

type Props = {
  onComplete?: () => void;
  holdMs?: number; // time to hold logo visible before completing
};

// A short animated transition used when moving from Login → Home.
// It fades out the underlying login form (consumer should hide it) and
// presents a quick brand reveal, then calls onComplete.
export default function LoginTransition({ onComplete, holdMs = 400 }: Props) {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(holdMs),
    ]).start(() => {
      onComplete?.();
    });
  }, [bgOpacity, logoOpacity, logoScale, onComplete, holdMs]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: bgOpacity }]}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
      >
        <Text style={styles.logo} allowFontScaling={false}>
          Itinera
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C201D",
    letterSpacing: 0.5,
  },
});
