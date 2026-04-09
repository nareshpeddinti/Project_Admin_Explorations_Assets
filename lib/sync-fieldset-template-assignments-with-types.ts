import type { AssetType } from "@/app/page"
import { getEffectiveAssetTypeTemplateIds } from "@/lib/default-company-template"
import { parseFieldsetTemplateAssignmentStorageKey } from "@/lib/fieldset-template-assignment-keys"

const SEP = "\u0000"

/**
 * Keep template T on fieldset row K only if some asset type uses logical fieldset L (K → L) and is assigned to T.
 * Drops orphan template ids on rows with no matching types.
 */
export function reconcileFieldsetTemplateAssignmentsToAssetTypes(
  fs: Record<string, string[]>,
  types: AssetType[],
  assetTypeTemplateAssignments: Record<string, string[]> | undefined,
  clientIds: readonly string[]
): Record<string, string[]> {
  const supported = new Set<string>()
  for (const t of types) {
    for (const tid of getEffectiveAssetTypeTemplateIds(assetTypeTemplateAssignments, t.id)) {
      supported.add(`${tid}${SEP}${t.fieldset}`)
    }
  }
  const out: Record<string, string[]> = { ...fs }
  for (const k of Object.keys(out)) {
    const { fieldsetKey: L } = parseFieldsetTemplateAssignmentStorageKey(k, clientIds)
    const arr = out[k]
    if (!arr?.length) {
      delete out[k]
      continue
    }
    const next = arr.filter((tid) => supported.has(`${tid}${SEP}${L}`))
    if (next.length === 0) delete out[k]
    else out[k] = next
  }
  return out
}

/**
 * For each (logical fieldset key, template id), at most one storage key may list that template.
 * Prefers keys listed in preferRetainStorageKeys (e.g. rows the user just saved).
 */
export function pruneFieldsetTemplateAssignmentsOneRowPerLogicalKeyAndTemplate(
  assignments: Record<string, string[]>,
  clientIds: readonly string[],
  preferRetainStorageKeys?: readonly string[]
): Record<string, string[]> {
  const next: Record<string, string[]> = { ...assignments }
  const allTemplates = new Set<string>()
  for (const ids of Object.values(next)) {
    for (const t of ids) allTemplates.add(t)
  }

  for (const templateId of allTemplates) {
    const byLogical = new Map<string, string[]>()
    for (const k of Object.keys(next)) {
      if (!next[k]?.includes(templateId)) continue
      const { fieldsetKey } = parseFieldsetTemplateAssignmentStorageKey(k, clientIds)
      const list = byLogical.get(fieldsetKey) ?? []
      list.push(k)
      byLogical.set(fieldsetKey, list)
    }
    for (const keys of byLogical.values()) {
      if (keys.length <= 1) continue
      let keep = keys[0]!
      if (preferRetainStorageKeys?.length) {
        for (const p of preferRetainStorageKeys) {
          if (keys.includes(p)) {
            keep = p
            break
          }
        }
      } else {
        const sorted = [...keys].sort()
        keep = sorted[0]!
      }
      for (const k of keys) {
        if (k === keep) continue
        const f = next[k].filter((id) => id !== templateId)
        if (f.length === 0) delete next[k]
        else next[k] = f
      }
    }
  }
  return next
}

/** Reconcile rows to types, then enforce one storage key per (logical fieldset, template). */
export function syncFieldsetTemplateAssignmentsWithAssetTypes(
  fieldsetTemplateAssignments: Record<string, string[]>,
  assetTypes: AssetType[],
  assetTypeTemplateAssignments: Record<string, string[]> | undefined,
  clientIds: readonly string[],
  preferRetainStorageKeys?: readonly string[]
): Record<string, string[]> | undefined {
  let fs = reconcileFieldsetTemplateAssignmentsToAssetTypes(
    fieldsetTemplateAssignments,
    assetTypes,
    assetTypeTemplateAssignments,
    clientIds
  )
  fs = pruneFieldsetTemplateAssignmentsOneRowPerLogicalKeyAndTemplate(
    fs,
    clientIds,
    preferRetainStorageKeys
  )
  const nk = Object.keys(fs)
  return nk.length > 0 ? fs : undefined
}
