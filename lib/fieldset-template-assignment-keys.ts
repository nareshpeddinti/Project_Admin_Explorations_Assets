import type { AssetType } from "@/app/page"
import { DEFAULT_COMPANY_TEMPLATE_ID } from "@/lib/default-company-template"
import { FIELDSET_DISPLAY_PRIMARY_CLIENT } from "@/lib/fieldset-display-names"

/**
 * Storage key for `fieldsetTemplateAssignments` — per client row when the catalog has
 * `fieldsetsByClient` (same object key can appear on AWS, Meta, Oracle, etc.).
 */
export function fieldsetTemplateAssignmentStorageKey(
  fieldsetKey: string,
  clientId: string | null
): string {
  if (clientId) return `${fieldsetKey}__${clientId}`
  return fieldsetKey
}

/** Reverse {@link fieldsetTemplateAssignmentStorageKey} using known client ids (longest match last). */
export function parseFieldsetTemplateAssignmentStorageKey(
  storageKey: string,
  clientIds: readonly string[]
): { fieldsetKey: string; clientId: string | null } {
  for (const c of clientIds) {
    const suf = `__${c}`
    if (storageKey.endsWith(suf)) {
      return { fieldsetKey: storageKey.slice(0, -suf.length), clientId: c }
    }
  }
  return { fieldsetKey: storageKey, clientId: null }
}

/**
 * Template ids assigned to this fieldset **row** (client-specific when multi-client).
 * Legacy data may use `fieldsetKey` only; that is shown only on the primary client row
 * so one shared list is not applied to all clients.
 */
export function getFieldsetTemplateAssignmentList(
  assignments: Record<string, string[]> | undefined,
  fieldsetKey: string,
  clientId: string | null,
  catalogHasFieldsetsByClient: boolean
): string[] {
  let raw: string[]
  if (!catalogHasFieldsetsByClient || clientId === null) {
    raw = assignments?.[fieldsetKey] ?? []
  } else {
    const composite = fieldsetTemplateAssignmentStorageKey(fieldsetKey, clientId)
    const own = assignments?.[composite]
    if (own !== undefined) {
      raw = own
    } else {
      const legacy = assignments?.[fieldsetKey]
      if (legacy && legacy.length > 0 && clientId === FIELDSET_DISPLAY_PRIMARY_CLIENT) {
        raw = legacy
      } else {
        raw = []
      }
    }
  }
  return raw.length > 0 ? raw : [DEFAULT_COMPANY_TEMPLATE_ID]
}

/**
 * Union template ids onto `fieldsetTemplateAssignments` for every storage key that represents each
 * logical fieldset (single-key catalog vs one composite key per client row in multi-client catalogs).
 * Used when assigning templates to asset types while keeping fieldset rows in sync.
 */
export function mergeTemplateIdsIntoFieldsetAssignmentStorage(
  prevFieldsetAssignments: Record<string, string[]> | undefined,
  logicalFieldsetKeys: Iterable<string>,
  templateIds: readonly string[],
  catalog: {
    fieldsets: Record<string, unknown>
    fieldsetsByClient?: Record<string, Record<string, unknown>>
  },
  clientIds: readonly string[]
): Record<string, string[]> {
  const next = { ...(prevFieldsetAssignments ?? {}) }
  const hasMulti = !!catalog.fieldsetsByClient
  const keysToTouch = new Set<string>()
  for (const L of logicalFieldsetKeys) {
    if (!Object.prototype.hasOwnProperty.call(catalog.fieldsets, L)) continue
    if (!hasMulti) {
      keysToTouch.add(L)
      continue
    }
    if (L === "Procore Default") {
      keysToTouch.add("Procore Default")
    }
    for (const c of clientIds) {
      const m = catalog.fieldsetsByClient![c]
      if (m && Object.prototype.hasOwnProperty.call(m, L)) {
        keysToTouch.add(fieldsetTemplateAssignmentStorageKey(L, c))
      }
    }
  }
  for (const key of keysToTouch) {
    const parsed = parseFieldsetTemplateAssignmentStorageKey(key, clientIds)
    const cur = next[key]
    const base =
      cur && cur.length > 0
        ? cur
        : getFieldsetTemplateAssignmentList(
            prevFieldsetAssignments,
            parsed.fieldsetKey,
            parsed.clientId,
            hasMulti
          )
    next[key] = [...new Set([...base, ...templateIds])]
  }
  return next
}

/** Distinct active fieldset keys for the given asset type ids (current `fieldset` on each type). */
export function uniqueFieldsetKeysForAssetTypeIds(
  typeIds: readonly string[],
  assetTypes: AssetType[]
): string[] {
  const byId = new Map(assetTypes.map((a) => [a.id, a]))
  const keys = new Set<string>()
  for (const tid of typeIds) {
    const t = byId.get(tid)
    if (t?.fieldset) keys.add(t.fieldset)
  }
  return [...keys]
}
