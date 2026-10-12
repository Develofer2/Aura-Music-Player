/** Bounded normalization for user and embedded track metadata. */
import { cleanText } from "./security"

export const METADATA_ITEM_LIMIT = 80
export const METADATA_LIST_LIMIT = 24

export function normalizeMetadataList(
  value: readonly string[] | string | undefined,
): string[] {
  const items = typeof value === "string" ? value.split(",") : value || []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const raw of items) {
    const item = cleanText(String(raw), METADATA_ITEM_LIMIT)
      .replace(/\s+/g, " ")
      .trim()
    const key = item.toLocaleLowerCase()
    if (!item || seen.has(key)) continue
    seen.add(key)
    normalized.push(item)
    if (normalized.length === METADATA_LIST_LIMIT) break
  }
  return normalized
}
