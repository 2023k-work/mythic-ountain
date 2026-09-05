export type WingVariantId = string;

export const wingVariantIds: readonly WingVariantId[] = Array.from(
  { length: 57 },
  (_, index) => String(index + 1).padStart(2, '0'),
);

export function wingVariantUrl(id: WingVariantId): string {
  return `${import.meta.env.BASE_URL}assets/wings-${id}.png`;
}

export function randomWingVariantId(): WingVariantId {
  return wingVariantIds[Math.floor(Math.random() * wingVariantIds.length)];
}
