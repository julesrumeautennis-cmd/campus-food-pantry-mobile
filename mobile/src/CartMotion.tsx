import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useMotionAllowed } from './motion';
import type { Item } from './types';
import { colors, Icon, ProductTile, s } from './ui';

const useNativeDriver = Platform.OS !== 'web';
const tileRadius = 27;
type Point = { x: number; y: number };
export type Flight = { id: number; item: Item; from: Point; to: Point };

export function CartFlight({ flight, onFinish }: { flight: Flight; onFinish: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 540, easing: Easing.inOut(Easing.cubic), useNativeDriver, isInteraction: false,
    });
    animation.start(({ finished }) => { if (finished) onFinish(flight.id); });
    return () => animation.stop();
  }, [flight.id, onFinish, progress]);
  const { from, to } = flight;
  return <Animated.View testID="cart-flight" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.flight, { left: from.x - tileRadius, top: from.y - tileRadius,
      opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
      transform: [
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, to.x - from.x] }) },
        { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (to.y - from.y) / 2 - 32, to.y - from.y] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0.26] }) },
      ],
    }]}><ProductTile item={flight.item} /></Animated.View>;
}

export function PantryLoading() {
  const allowed = useMotionAllowed();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!allowed) { progress.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [allowed, progress]);
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading pantry" style={styles.loading}>
    <Animated.View style={[styles.halo, { opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.9, 0.35] }),
      transform: [{ scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.95, 1.1, 0.95] }) }] }]} />
    <Animated.View style={[styles.loadingIcon, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -10, 0] }) }] }]}>
      <Icon name="shopping-basket" size={45} color={colors.white} />
    </Animated.View>
    <Text style={s.subtitle}>Loading pantry…</Text>
  </View>;
}

const styles = StyleSheet.create({
  flight: { position: 'absolute', width: 54, height: 54, zIndex: 10 },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 172, height: 172, borderRadius: 86, backgroundColor: colors.mint, marginTop: -38 },
  loadingIcon: { width: 94, height: 94, borderRadius: 29, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});
