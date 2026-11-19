import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useMotionAllowed } from './motion';
import { colors } from './ui';

const markSize = 112;
const mark = Platform.OS === 'web' ? { uri: '/launch/pantry-mark.png' } : require('../public/launch/pantry-mark.png');
const cutout = Platform.OS === 'web' ? { uri: '/launch/pantry-cutout.png' } : require('../public/launch/pantry-cutout.png');

export function LaunchReveal({ ready, children }: React.PropsWithChildren<{ ready: boolean }>) {
  const { width, height } = useWindowDimensions();
  const allowed = useMotionAllowed();
  const [showCover, setShowCover] = useState(true);
  const [art, setArt] = useState<'pending' | 'loaded' | 'failed'>('pending');
  const [slowStart, setSlowStart] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const zoom = allowed && art === 'loaded';
  const canReveal = (ready && art !== 'pending') || slowStart;

  // A slow connection hands off to the screen's own loading and retry controls.
  useEffect(() => {
    if (!showCover) return;
    const timer = setTimeout(() => setSlowStart(true), 1800);
    return () => clearTimeout(timer);
  }, [showCover]);

  useEffect(() => {
    if (!showCover || !canReveal) return;
    const animation = Animated.timing(progress, {
      toValue: 1, duration: zoom ? 780 : 140, easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    animation.start(({ finished }) => { if (finished) setShowCover(false); });
    return () => animation.stop();
  }, [canReveal, progress, showCover, zoom]);

  // The zoom goes through solid basket weave between two slats. A 6-point
  // circle there is clear, so this final scale clears all four screen corners.
  const bleed = Math.ceil(Math.max(width, height) * 0.72);
  const coverScale = Math.max(20, (Math.hypot(width, height) / 2 + markSize) / 6);
  const frameSize = markSize + 2 * bleed;
  const opening = progress.interpolate({
    inputRange: [0, 0.15, 0.30, 0.49, 0.70, 0.94, 1],
    outputRange: [1, 0.82, 1.15, 4, 14, coverScale, coverScale],
  });
  const surface = showCover && zoom ? {
    opacity: progress.interpolate({ inputRange: [0, 0.19, 0.45, 1], outputRange: [0, 0, 1, 1] }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 0.22, 0.62, 1], outputRange: [1.075, 1.075, 1.025, 1] }) }],
  } : undefined;

  return <View style={styles.stage}>
    <StatusBar barStyle={showCover ? 'light-content' : 'dark-content'} />
    <Animated.View style={[styles.page, surface]} pointerEvents={showCover ? 'none' : 'auto'}
      aria-hidden={showCover} importantForAccessibility={showCover ? 'no-hide-descendants' : 'auto'}
      {...(Platform.OS === 'web' ? { inert: showCover } : {})}>
      {children}
    </Animated.View>
    {showCover && <Animated.View testID="launch-cover" accessibilityRole="progressbar" accessibilityLabel="Opening Campus Food Pantry"
      style={[StyleSheet.absoluteFill, styles.center, !zoom && { backgroundColor: colors.white,
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Animated.View testID="launch-aperture" style={{ width: frameSize, height: frameSize, flexShrink: 0,
        borderWidth: bleed, borderColor: colors.green, transformOrigin: [bleed + markSize * 220 / 544, bleed + markSize * 428 / 544, 0],
        transform: [{ scale: zoom ? opening : 1 }] }}>
        <Image source={cutout} resizeMode="stretch" fadeDuration={0} accessible={false} style={styles.mark}
          onLoad={() => setArt('loaded')} onError={() => setArt('failed')} />
      </Animated.View>
      {art !== 'loaded' && <View style={[StyleSheet.absoluteFill, styles.poster, styles.center]}>
        <Image source={mark} resizeMode="contain" fadeDuration={0} accessible={false} style={styles.mark} />
      </View>}
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', backgroundColor: colors.white },
  page: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  poster: { backgroundColor: colors.green },
  mark: { width: markSize, height: markSize },
});
