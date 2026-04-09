import type { TemplateAssetConfig } from "@/components/asset-template-detail"
import { ALL_CATALOG_FIELDSET_CLIENTS } from "@/lib/build-multi-hierarchy-global-catalog"

function fieldsetKeyExistsInCatalog(config: TemplateAssetConfig, key: string): boolean {
  if (key in config.fieldsets) return true
  if (!config.fieldsetsByClient) return false
  for (const c of ALL_CATALOG_FIELDSET_CLIENTS) {
    if (config.fieldsetsByClient[c]?.[key]) return true
  }
  return false
}

/** Fieldset key stored for a project, or default when unset / invalid. */
export function effectiveProjectFieldsetKey(
  config: TemplateAssetConfig,
  projectId: string
): string {
  const raw = config.projectFieldsetKeys?.[projectId]
  if (!raw || !fieldsetKeyExistsInCatalog(config, raw)) return "Procore Default"
  return raw
}

export function countProjectsUsingFieldsetKey(
  config: TemplateAssetConfig,
  fieldsetKey: string,
  projectIds: string[]
): number {
  let n = 0
  for (const id of projectIds) {
    if (effectiveProjectFieldsetKey(config, id) === fieldsetKey) n++
  }
  return n
}
