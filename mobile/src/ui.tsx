import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { brandMark, productPhoto } from './assets';
import { Reveal } from './motion';
import type { Item, Me, PantryRequest } from './types';
import { units } from './basket';

export const colors = {
  green: '#003525', forest: '#174d3a', ink: '#17211d', muted: '#4d5e55', background: '#f1fcf5',
  white: '#ffffff', mint: '#e5f1ea', line: '#d7e3da', gold: '#ffd569', amber: '#614a00',
  amberBg: '#fff2c9', red: '#8c2520', blush: '#fce6e3',
};
export type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
export function Icon({ name, size = 20, color = colors.green }: { name: IconName; size?: number; color?: string }) {
  return <MaterialIcons name={name} size={size} color={color} accessible={false} importantForAccessibility="no" />;
}

export function Brand({ subtitle, onBack, onProfile, trailing, disabled = false }: {
  subtitle: string; onBack?: () => void; onProfile?: () => void; trailing?: React.ReactNode; disabled?: boolean;
}) {
  return <View style={s.header}>
    {onBack && <IconButton name="arrow-back" label="Go back" onPress={onBack} disabled={disabled} />}
    <Image source={brandMark} accessible={false} style={s.seal} />
    <View style={s.grow}><Text style={s.brand}>Campus Food Pantry</Text><Text style={s.small}>{subtitle}</Text></View>
    {onProfile && <IconButton solid name="person-outline" label="Open profile" onPress={onProfile} disabled={disabled} />}
    {trailing}
  </View>;
}

export function IconButton({ name, label, onPress, disabled = false, solid = false }: {
  name: IconName; label: string; onPress: () => void; disabled?: boolean; solid?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [s.iconButton, solid && s.solid, pressed && s.pressed, disabled && s.disabled]}>
    <Icon name={name} color={solid ? colors.white : colors.green} />
  </Pressable>;
}

export function Button({ title, onPress, secondary = false, disabled = false, busy = false, icon, danger = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean; icon?: IconName; danger?: boolean;
}) {
  const textColor = danger ? colors.red : secondary ? colors.green : colors.white;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, danger && { backgroundColor: colors.blush }, (disabled || busy) && s.disabled, pressed && s.pressed]}>
    {busy ? <ActivityIndicator color={textColor} /> : icon && <Icon name={icon} color={textColor} />}
    <Text style={[s.buttonText, { color: textColor }]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={s.tight}><Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
      style={[s.input, props.multiline && { minHeight: 88, textAlignVertical: 'top' }, props.style]} />
  </View>;
}
export function Heading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <View style={s.tight}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
    <Text accessibilityRole="header" style={s.title}>{title}</Text>{description && <Text style={s.body}>{description}</Text>}
  </View>;
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" accessibilityRole={error ? 'alert' : undefined} style={[s.notice, error && { backgroundColor: colors.blush }]}>
    <Icon name={error ? 'error-outline' : 'info-outline'} size={18} color={error ? colors.red : colors.forest} />
    <Text style={[s.body, s.grow, error && { color: colors.red }]}>{text}</Text>
  </View>;
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return <View style={s.card}><Text style={s.subtitle}>{title}</Text><Text style={s.body}>{detail}</Text></View>;
}

const badges = {
  IN_STOCK: ['check-circle-outline', 'In stock', colors.mint, colors.forest],
  LOW_STOCK: ['warning-amber', 'Low stock', colors.amberBg, colors.amber],
  OUT_OF_STOCK: ['remove-circle-outline', 'Out of stock', '#edf0ed', colors.muted],
  EXPIRED: ['event-busy', 'Expired', colors.blush, colors.red],
  PENDING: ['schedule', 'Pending', colors.amberBg, colors.amber],
  APPROVED: ['check-circle-outline', 'Approved', colors.mint, colors.forest],
  DECLINED: ['block', 'Declined', colors.blush, colors.red],
} as const;
export function Badge({ text, quantity }: { text: keyof typeof badges; quantity?: number }) {
  const [icon, label, backgroundColor, color] = badges[text];
  let caption: string = label;
  if (quantity !== undefined && text === 'IN_STOCK') caption += ` · ${quantity} available`;
  if (quantity !== undefined && text === 'LOW_STOCK') caption += ` · ${quantity} left`;
  return <View style={[s.badge, { backgroundColor }]}><Icon name={icon} color={color} size={14} />
    <Text style={[s.badgeText, { color }]}>{caption}</Text></View>;
}

export function Quota({ me, selected = 0 }: { me: Me; selected?: number }) {
  const reset = new Date(`${me.resetsOn}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: me.timeZone });
  return <View style={s.card}>
    <View style={s.rowBetween}><View style={s.inline}><Icon name="event-repeat" /><Text style={s.subtitle}>Weekly member quota</Text></View><Text style={s.tag}>Mon – Sun</Text></View>
    <View style={s.segments}>{Array.from({ length: me.weeklyLimit }, (_, i) => <View key={i}
      style={[s.segment, i < me.approvedUnits && { backgroundColor: colors.forest }]} />)}</View>
    <Text style={s.small}><Text style={s.emphasis}>{me.approvedUnits} of {me.weeklyLimit} approved units used</Text>{' · '}Resets {reset} (Chicago)</Text>
    {selected > 0 && <Text style={s.small}>{units(selected)} in your basket · {units(me.remainingUnits)} available before approval</Text>}
  </View>;
}

export function Stepper({ value, max, min = 0, onChange, name }: {
  value: number; max: number; min?: number; onChange: (n: number) => void; name: string;
}) {
  return <View style={s.stepper}>
    <IconButton name="remove" label={`Remove one ${name}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
    <Reveal event={value} count><Text accessibilityLiveRegion="polite" accessibilityLabel={units(value)} style={s.stepValue}>{value}</Text></Reveal>
    <IconButton name="add" label={`Add one ${name}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
  </View>;
}

export function ProductTile({ item, large = false }: { item: Pick<Item, 'name' | 'category'>; large?: boolean }) {
  const source = productPhoto(item, large);
  return <View testID={large ? 'product-hero' : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.productTile, large ? s.hero : s.thumbnail]}>
    {source ? <Image accessible={false} source={source} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      : <Icon name={item.category === 'Hygiene' ? 'soap' : 'kitchen'} color="#698a76" size={large ? 68 : 30} />}
  </View>;
}

export function RequestCard({ request }: { request: PantryRequest }) {
  return <View style={s.card}>
    <View style={s.rowBetween}><Text style={s.subtitle}>Request #{request.id}</Text><Badge text={request.status} /></View>
    <Text style={s.small}>{new Date(request.submittedAt).toLocaleString()} · {units(request.totalUnits)}</Text>
    {request.lines.map(line => <View key={line.itemId} style={s.rowBetween}><Text style={[s.body, s.grow]}>{line.name} · Lot #{line.itemId}</Text><Text style={s.emphasis}>× {line.quantity}</Text></View>)}
    {request.decisionReason && <Notice text={request.decisionReason} error={request.status === 'DECLINED'} />}
  </View>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.line },
  seal: { width: 38, height: 38, borderRadius: 19 },
  brand: { color: colors.green, fontSize: 18, lineHeight: 24, fontFamily: 'ManropeBold', letterSpacing: -0.6 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: 'ManropeBold', letterSpacing: -0.65, color: colors.green },
  subtitle: { fontSize: 17, lineHeight: 23, fontFamily: 'ManropeBold', letterSpacing: -0.35, color: colors.ink, flexShrink: 1 },
  eyebrow: { color: colors.forest, fontSize: 12, fontFamily: 'ManropeSemiBold' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21, fontFamily: 'Manrope' },
  small: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope' },
  emphasis: { color: colors.ink, fontSize: 13, fontFamily: 'ManropeBold' },
  tag: { alignSelf: 'center', backgroundColor: colors.mint, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 4, color: colors.green, fontSize: 11, fontFamily: 'ManropeBold' },
  card: { backgroundColor: colors.white, borderRadius: 8, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line },
  shelf: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 6 },
  grow: { flex: 1, minWidth: 0 }, tight: { gap: 5 }, stack: { gap: 12 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  solid: { backgroundColor: colors.green },
  pressed: { opacity: 0.74 }, disabled: { opacity: 0.42 },
  button: { minHeight: 48, backgroundColor: colors.green, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { flexShrink: 1, textAlign: 'center', fontFamily: 'ManropeBold', fontSize: 15, lineHeight: 20 },
  secondary: { backgroundColor: colors.mint }, label: { color: colors.ink, fontSize: 14, fontFamily: 'ManropeSemiBold' },
  input: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#94a69a', borderRadius: 6, backgroundColor: colors.white, color: colors.ink, fontSize: 16, fontFamily: 'Manrope' },
  notice: { backgroundColor: colors.mint, padding: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  badge: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  badgeText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontFamily: 'ManropeSemiBold' },
  segments: { flexDirection: 'row', gap: 4 }, segment: { flex: 1, height: 8, borderRadius: 3, backgroundColor: colors.mint },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingVertical: 4 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 12, color: colors.muted, fontFamily: 'ManropeSemiBold' },
  tabIcon: { paddingVertical: 3, paddingHorizontal: 12, borderRadius: 15 },
  chip: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green }, chipText: { color: colors.green, fontSize: 13, fontFamily: 'ManropeSemiBold' },
  stepper: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, borderRadius: 6 },
  stepValue: { minWidth: 24, textAlign: 'center', fontSize: 17, color: colors.green, fontFamily: 'ManropeBold', fontVariant: ['tabular-nums'] },
  thumbnail: { width: 56, height: 60 },
  productTile: { backgroundColor: colors.mint, borderRadius: 5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hero: { width: '100%', aspectRatio: 1.65, borderRadius: 6 },
  dock: { paddingHorizontal: 16, paddingVertical: 9, gap: 6, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
});
