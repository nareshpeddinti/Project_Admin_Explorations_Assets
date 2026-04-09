import type { AssetType } from "@/app/page"
import type { TemplateAssetConfig } from "@/components/asset-template-detail"
import { COMPANY_FIELDSET_CLIENTS } from "@/lib/build-multi-hierarchy-global-catalog"
import {
  DEFAULT_COMPANY_TEMPLATE_ID,
  getEffectiveAssetTypeTemplateIds,
} from "@/lib/default-company-template"
import { getFieldsetTemplateAssignmentList } from "@/lib/fieldset-template-assignment-keys"

/** Asset type ids whose effective company assignments include this template (unset → Procore Default). */
export function getTemplateDirectAssignedTypeIds(
  catalog: TemplateAssetConfig,
  templateId: string
): Set<string> {
  const m = catalog.assetTypeTemplateAssignments ?? {}
  const s = new Set<string>()
  for (const t of catalog.assetTypes) {
    if (getEffectiveAssetTypeTemplateIds(m, t.id).includes(templateId)) s.add(t.id)
  }
  return s
}

export function expandAssetTypeIdsWithAncestors(
  allTypes: AssetType[],
  seedIds: Set<string>
): Set<string> {
  const byId = new Map(allTypes.map((t) => [t.id, t]))
  const out = new Set<string>(seedIds)
  for (const id of seedIds) {
    let cur = byId.get(id)
    while (cur?.parentId) {
      out.add(cur.parentId)
      cur = byId.get(cur.parentId)
    }
  }
  return out
}

/**
 * Types visible for a template: every type assigned to the template, plus ancestors
 * so hierarchies remain intact.
 */
export function getAssetTypesVisibleForTemplate(
  catalog: TemplateAssetConfig,
  templateId: string
): AssetType[] {
  const direct = getTemplateDirectAssignedTypeIds(catalog, templateId)
  if (direct.size === 0) return []
  const all = catalog.assetTypes
  const include = expandAssetTypeIdsWithAncestors(all, direct)
  return all.filter((t) => include.has(t.id))
}

/** True if this catalog row (fieldset + optional client) lists the template. */
export function isFieldsetRowAssignedToTemplate(
  catalog: TemplateAssetConfig,
  templateId: string,
  row: { fieldsetKey: string; clientId: string | null }
): boolean {
  return getFieldsetTemplateAssignmentList(
    catalog.fieldsetTemplateAssignments,
    row.fieldsetKey,
    row.clientId,
    !!catalog.fieldsetsByClient
  ).includes(templateId)
}

/** Whether any fieldset row’s effective assignments include this template (for empty-state copy). */
export function catalogHasAnyFieldsetAssignmentForTemplate(
  catalog: TemplateAssetConfig,
  templateId: string
): boolean {
  if (templateId === DEFAULT_COMPANY_TEMPLATE_ID) return true

  const assignments = catalog.fieldsetTemplateAssignments
  const primary = catalog.fieldsets ?? {}
  const fieldsetsByClient = catalog.fieldsetsByClient

  if (!fieldsetsByClient) {
    for (const fieldsetKey of Object.keys(primary)) {
      if (
        getFieldsetTemplateAssignmentList(assignments, fieldsetKey, null, false).includes(
          templateId
        )
      )
        return true
    }
    return false
  }

  for (const fieldsetKey of Object.keys(primary)) {
    if (fieldsetKey === "Procore Default") {
      if (
        getFieldsetTemplateAssignmentList(assignments, fieldsetKey, null, true).includes(
          templateId
        )
      )
        return true
      continue
    }

    for (const c of COMPANY_FIELDSET_CLIENTS) {
      if (!fieldsetsByClient[c]?.[fieldsetKey]) continue
      if (
        getFieldsetTemplateAssignmentList(assignments, fieldsetKey, c, true).includes(templateId)
      )
        return true
    }
  }
  return false
}
