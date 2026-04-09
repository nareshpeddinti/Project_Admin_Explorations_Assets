import type { TemplateAssetConfig } from "@/components/asset-template-detail"
import { cloneTemplateConfig } from "@/lib/clone-template-asset-config"
import { buildMultiVerticalCompanyCatalog } from "@/lib/multi-vertical-company-catalog"

/**
 * Baseline company level asset settings data. Seeds the editable global catalog and new template snapshots.
 * Includes data centers (multi-client fieldsets) plus residential, hospital, and airport vertical trees.
 */
export function getSeedGlobalCatalog(): TemplateAssetConfig {
  return cloneTemplateConfig(buildMultiVerticalCompanyCatalog())
}
