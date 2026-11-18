import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type ViewStyle } from 'react-native';

const MotionAllowed = createContext(false);
export const useMotionAllowed = () => useContext(MotionAllowed);

export function MotionPreference({ children }: React.PropsWithChildren) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setAllowed(!query.matches);
      update();
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduce => setAllowed(!reduce));
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => { if (active) setAllowed(!reduce); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionAllowed.Provider value={allowed}>{children}</MotionAllowed.Provider>;
}

// Animate user-driven view changes and count updates. Reading order and layout stay stable.
export function Reveal({ children, event, count = false, style, testID }: React.PropsWithChildren<{
  event: string | number; count?: boolean; style?: ViewStyle; testID?: string;
}>) {
  const allowed = useContext(MotionAllowed);
  const progress = useRef(new Animated.Value(allowed && !count ? 0 : 1)).current;
  useEffect(() => {
    if (!allowed) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: count ? 150 : 225, easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [allowed, count, event, progress]);
  const transform = count
    ? [{ scale: progress.interpolate({ inputRange: [0, 0.42, 1], outputRange: [1, 1.12, 1] }) }]
    : [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }];
  return <Animated.View testID={testID} style={[style, { opacity: count ? 1 : progress, transform }]}>{children}</Animated.View>;
}
