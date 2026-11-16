export type Item = { itemId: number; name: string; category: 'Food' | 'Hygiene'; quantity: number; expirationDate: string | null; availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED' };
export type Me = { userId: string; displayName: string; role: 'ADMIN' | 'MEMBER'; weeklyLimit: number; approvedUnits: number; remainingUnits: number; weekStart: string; resetsOn: string; timeZone: string };
export type RequestLine = { itemId: number; name: string; quantity: number; category: string; expirationDate: string | null };
export type PantryRequest = { id: number; userId: string; displayName: string; status: 'PENDING' | 'APPROVED' | 'DECLINED'; totalUnits: number; submittedAt: string; decidedAt: string | null; decisionReason: string | null; lines: RequestLine[] };
export type Cart = Record<number, number>;
export type Inspection = { id: number; display_name: string; hygiene: string; damaged_products: string; cleanliness: string; notes: string; created_at: string };
export type Movement = { id: number; name: string; delta: number; reason: string; created_at: string };
export type Report = { asOf: string; totalLots: number; totalUnits: number; lowStock: Item[]; outOfStock: Item[]; expired: Item[]; items: Item[] };
