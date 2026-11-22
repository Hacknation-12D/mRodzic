import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/** Płynne pojawienie się (fade + lekkie uniesienie) przy montowaniu. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 450, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
      ]}>
      {children}
    </Animated.View>
  );
}

type FxProps = Omit<PressableProps, 'style'> & { className?: string; hoverClassName?: string; hoverScale?: number; children: ReactNode; style?: StyleProp<ViewStyle> };

/** Pressable z lekką animacją: powiększenie przy najechaniu, ściśnięcie przy dotyku + podświetlenie (hoverClassName). */
export function HoverPressable({ children, className, hoverClassName, hoverScale = 1.06, onHoverIn, onHoverOut, onPressIn, onPressOut, style, ...rest }: FxProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const [hover, setHover] = useState(false);
  const to = (toValue: number) => Animated.spring(scale, { toValue, friction: 7, tension: 160, useNativeDriver: true }).start();
  const hovered = useRef(false);
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        className={[className, hover ? hoverClassName : ''].filter(Boolean).join(' ')}
        onHoverIn={(e) => {
          hovered.current = true;
          setHover(true);
          to(hoverScale);
          onHoverIn?.(e);
        }}
        onHoverOut={(e) => {
          hovered.current = false;
          setHover(false);
          to(1);
          onHoverOut?.(e);
        }}
        onPressIn={(e) => {
          to(0.94);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          to(hovered.current ? hoverScale : 1);
          onPressOut?.(e);
        }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
