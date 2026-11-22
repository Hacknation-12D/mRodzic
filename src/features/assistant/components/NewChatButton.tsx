import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";

import { pl } from "@/shared/i18n/pl";
import { useThemeColors } from "@/shared/theme";
import { AppText } from "@/shared/ui";

const SIZE = 40;
const EXPANDED_WIDTH = 164;

/** Przycisk „+”: po najechaniu rozwija się w lewo, pokazując napis „Nowa rozmowa”, a „+” zostaje na końcu. */
export function NewChatButton({ onPress }: { onPress: () => void }) {
  const c = useThemeColors();
  const [width] = useState(() => new Animated.Value(SIZE));
  const [hover, setHover] = useState(false);
  const to = (toValue: number) =>
    Animated.timing(width, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animujemy szerokość
    }).start();
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => {
        setHover(true);
        to(EXPANDED_WIDTH);
      }}
      onHoverOut={() => {
        setHover(false);
        to(SIZE);
      }}
      accessibilityRole="button"
      accessibilityLabel={pl.assistant.newChat}
      hitSlop={8}
      className="active:opacity-70"
    >
      <Animated.View
        style={{ width, height: SIZE }}
        className={`flex-row items-center justify-end overflow-hidden rounded-full border bg-base-100 ${
          hover ? "border-primary bg-primary/10" : "border-base-300"
        }`}
      >
        <AppText
          variant="small"
          numberOfLines={1}
          className="font-medium text-primary"
          style={{ width: EXPANDED_WIDTH - SIZE, textAlign: "right", paddingRight: 4 }}
        >
          {pl.assistant.newChat}
        </AppText>
        <View style={{ width: SIZE }} className="items-center justify-center">
          <Ionicons name="add" size={24} color={c.primary} />
        </View>
      </Animated.View>
    </Pressable>
  );
}
