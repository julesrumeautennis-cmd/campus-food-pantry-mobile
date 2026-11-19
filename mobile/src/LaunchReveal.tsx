import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useMotionAllowed } from './motion';
import { colors } from './ui';

const web = Platform.OS === 'web';
const markSize = 112;
const apertureStops = [0, 0.15, 0.30, 0.49, 0.70, 0.94, 1];
const pageStops = [0, 0.19, 0.45, 0.70, 1];
const pageOpacity = [0, 0, 1, 1, 1];
const pageScale = [1.1, 1.1, 1.055, 1.018, 1];
const mark = web ? { uri: '/launch/pantry-mark.png' } : require('../public/launch/pantry-mark.png');
const cutout = web ? { uri: '/launch/pantry-cutout.png' } : require('../public/launch/pantry-cutout.png');

function apertureScale(cover: number) { return [1, 0.8, 1.15, 4, 14, cover, cover]; }

export function LaunchReveal({ ready, children }: React.PropsWithChildren<{ ready: boolean }>) {
  const { width, height } = useWindowDimensions();
  const allowed = useMotionAllowed();
  const [showCover, setShowCover] = useState(true);
  const [art, setArt] = useState<'pending' | 'loaded' | 'failed'>('pending');
  const [slowStart, setSlowStart] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const pageRef = useRef<React.ComponentRef<typeof View>>(null);
  const frameRef = useRef<React.ComponentRef<typeof View>>(null);
  const coverRef = useRef<React.ComponentRef<typeof View>>(null);
  const zoom = allowed && art === 'loaded';
  const canReveal = (ready && art !== 'pending') || slowStart;
  // A 6-point clear circle in the basket weave must grow past every screen corner.
  const coverScale = Math.max(20, (Math.hypot(width, height) / 2 + markSize) / 6);

  // A slow connection hands off to the screen's own loading and retry controls.
  useEffect(() => {
    if (!showCover) return;
    const timer = setTimeout(() => setSlowStart(true), 1800);
    return () => clearTimeout(timer);
  }, [showCover]);

  useEffect(() => {
    if (!showCover || !canReveal) return;
    const duration = zoom ? 780 : 140;
    if (web) {
      // Let Safari's compositor run the reveal independently of React's first render.
      const page = pageRef.current as unknown as HTMLElement;
      const frame = frameRef.current as unknown as HTMLElement;
      const cover = coverRef.current as unknown as HTMLElement;
      if (!cover?.animate || !page || !frame) { setShowCover(false); return; }
      const timing: KeyframeAnimationOptions = { duration, easing: 'linear', fill: 'both' };
      const scale = apertureScale(coverScale);
      const animations = zoom ? [
        frame.animate(apertureStops.map((offset, i) => ({ offset, transform: `scale(${scale[i]})` })), timing),
        page.animate(pageStops.map((offset, i) => ({ offset, opacity: pageOpacity[i], transform: `scale(${pageScale[i]})` })), timing),
      ] : [cover.animate([{ opacity: 1 }, { opacity: 0 }], timing)];
      let mounted = true;
      const finish = () => { if (mounted) setShowCover(false); };
      Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
      return () => { mounted = false; animations.forEach(animation => animation.cancel()); };
    }
    const animation = Animated.timing(progress, {
      toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    });
    animation.start(({ finished }) => { if (finished) setShowCover(false); });
    return () => animation.stop();
  }, [canReveal, coverScale, progress, showCover, zoom]);

  const bleed = Math.ceil(Math.max(width, height) * 0.72);
  const frameSize = markSize + 2 * bleed;
  const opening = !web && showCover && zoom
    ? progress.interpolate({ inputRange: apertureStops, outputRange: apertureScale(coverScale) }) : 1;
  const surface = showCover && zoom && (web ? { opacity: 0 } : {
    opacity: progress.interpolate({ inputRange: pageStops, outputRange: pageOpacity }),
    transform: [{ scale: progress.interpolate({ inputRange: pageStops, outputRange: pageScale }) }],
  });

  return <View style={styles.stage}>
    <StatusBar barStyle={showCover ? 'light-content' : 'dark-content'} />
    <Animated.View ref={pageRef} style={[styles.page, surface]} pointerEvents={showCover ? 'none' : 'auto'}
      aria-hidden={showCover} importantForAccessibility={showCover ? 'no-hide-descendants' : 'auto'}
      {...(web ? { inert: showCover } : {})}>
      {children}
    </Animated.View>
    {showCover && <Animated.View ref={coverRef} testID="launch-cover" accessibilityRole="progressbar" accessibilityLabel="Opening Campus Food Pantry"
      style={[StyleSheet.absoluteFill, styles.center, !zoom && { backgroundColor: colors.white,
        opacity: web ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Animated.View ref={frameRef} testID="launch-aperture" style={{ width: frameSize, height: frameSize, flexShrink: 0,
        borderWidth: bleed, borderColor: colors.green, transformOrigin: [bleed + markSize * 220 / 544, bleed + markSize * 428 / 544, 0],
        transform: [{ scale: opening }] }}>
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
