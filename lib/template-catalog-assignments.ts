import type { TemplateAssetConfig } from "@/components/asset-template-detail"

/** Remove a template id from all company-level fieldset / asset-type assignment maps. */
export function stripTemplateIdFromCatalogAssignments(
  prev: TemplateAssetConfig,
  templateId: string
): TemplateAssetConfig {
  const fs = prev.fieldsetTemplateAssignments
  const at = prev.assetTypeTemplateAssignments
  if (!fs && !at) return prev

  const prune = (m: Record<string, string[]>) => {
    const out: Record<string, string[]> = {}
    for (const [k, ids] of Object.entries(m)) {
      const next = ids.filter((id) => id !== templateId)
      if (next.length > 0) out[k] = next
    }
    return Object.keys(out).length > 0 ? out : undefined
  }

  return {
    ...prev,
    ...(fs ? { fieldsetTemplateAssignments: prune(fs) } : {}),
    ...(at ? { assetTypeTemplateAssignments: prune(at) } : {}),
  }
}
