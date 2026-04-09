import type { FieldsetData } from "@/app/page"
import type { TemplateAssetConfig } from "@/components/asset-template-detail"

const PROCORE_DEFAULT_FIELDSET: FieldsetData = {
  name: "Procore Default",
  sections: [
    {
      name: "General Information",
      fields: ["Asset Name", "Asset Code", "Description", "Location", "Status"],
    },
    {
      name: "Technical Details",
      fields: ["Manufacturer", "Model Number", "Serial Number", "Installation Date"],
    },
  ],
}

/** New templates and missing snapshots: no types; only baseline fieldset until import or edit. */
export function createEmptyTemplateConfig(): TemplateAssetConfig {
  return {
    assetTypes: [],
    fieldsets: {
      "Procore Default": JSON.parse(JSON.stringify(PROCORE_DEFAULT_FIELDSET)) as FieldsetData,
    },
  }
}

export function cloneTemplateConfig(config: TemplateAssetConfig): TemplateAssetConfig {
  return JSON.parse(JSON.stringify(config)) as TemplateAssetConfig
}
