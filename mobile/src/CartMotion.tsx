import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import type { Item } from './types';
import { ProductTile } from './ui';

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

const styles = StyleSheet.create({
  flight: { position: 'absolute', width: 54, height: 54, zIndex: 10 },
});
