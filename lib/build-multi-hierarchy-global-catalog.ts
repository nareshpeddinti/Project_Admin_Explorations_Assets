import type { AssetType, FieldsetData } from "@/app/page"
import type { TemplateAssetConfig } from "@/components/asset-template-detail"
import { getTemplateSourceData } from "@/components/asset-template-detail"
import { buildMultiClientFieldsetDisplayName } from "@/lib/fieldset-display-names"

/** Data center hierarchy: cloud / hyperscale-style clients. */
export const DATACENTER_FIELDSET_CLIENTS = ["AWS", "Meta", "Oracle"] as const

/** Residential buildings vertical. */
export const RESIDENTIAL_FIELDSET_CLIENTS = ["Greystar", "Related", "AvalonBay"] as const

/** Hospitals & acute care vertical. */
export const HOSPITAL_FIELDSET_CLIENTS = ["CommonSpirit", "HCA", "Kaiser Permanente"] as const

/** Airports & airfields vertical. */
export const AIRPORT_FIELDSET_CLIENTS = ["DNATA", "Swissport", "Menzies Aviation"] as const

/** Every catalog client id (union of all hierarchies). */
export const ALL_CATALOG_FIELDSET_CLIENTS = [
  ...DATACENTER_FIELDSET_CLIENTS,
  ...RESIDENTIAL_FIELDSET_CLIENTS,
  ...HOSPITAL_FIELDSET_CLIENTS,
  ...AIRPORT_FIELDSET_CLIENTS,
] as const

/**
 * @deprecated Use ALL_CATALOG_FIELDSET_CLIENTS or hierarchy-specific lists (DATACENTER_FIELDSET_CLIENTS, etc.).
 */
export const COMPANY_FIELDSET_CLIENTS = ALL_CATALOG_FIELDSET_CLIENTS

export type CompanyFieldsetClientId = (typeof ALL_CATALOG_FIELDSET_CLIENTS)[number]

/** @deprecated Use ALL_CATALOG_FIELDSET_CLIENTS — kept for any string external refs */
export type HierarchyCatalogSeed = {
  templateId: string
  rootName: string
  rootCode: string
  prefix: string
  clientSuffix?: string
}

export const HIERARCHY_ROOT_IDS = {
  datacenter: "dc-catalog-root",
  residential: "vert-residential-root",
  hospital: "vert-hospital-root",
  airport: "vert-airport-root",
} as const

/** Walk parent chain to the root type id. */
export function getRootIdForAssetType(assetTypes: AssetType[], typeId: string): string | null {
  const byId = new Map(assetTypes.map((t) => [t.id, t]))
  let cur = byId.get(typeId)
  if (!cur) return null
  while (cur.parentId) {
    const p = byId.get(cur.parentId)
    if (!p) break
    cur = p
  }
  return cur.id
}

/** Which clients own fieldset definitions for types under this hierarchy root. */
export function getFieldsetClientsForRootId(rootId: string): readonly string[] {
  switch (rootId) {
    case HIERARCHY_ROOT_IDS.datacenter:
      return DATACENTER_FIELDSET_CLIENTS
    case HIERARCHY_ROOT_IDS.residential:
      return RESIDENTIAL_FIELDSET_CLIENTS
    case HIERARCHY_ROOT_IDS.hospital:
      return HOSPITAL_FIELDSET_CLIENTS
    case HIERARCHY_ROOT_IDS.airport:
      return AIRPORT_FIELDSET_CLIENTS
    default:
      return DATACENTER_FIELDSET_CLIENTS
  }
}

export function getFieldsetClientsForAssetType(
  assetTypes: AssetType[],
  typeId: string
): readonly string[] {
  const root = getRootIdForAssetType(assetTypes, typeId)
  return root ? getFieldsetClientsForRootId(root) : [...DATACENTER_FIELDSET_CLIENTS]
}

/**
 * Single flat map for templates / CSV: first definition wins per key in catalog client order,
 * so every logical key appears once (sparse keys only exist on their hierarchy’s clients).
 */
export function mergeFieldsetsMapsForFlatDisplay(
  byClient: Record<string, Record<string, FieldsetData>>
): Record<string, FieldsetData> {
  const flat: Record<string, FieldsetData> = {}
  for (const c of ALL_CATALOG_FIELDSET_CLIENTS) {
    const block = byClient[c]
    if (!block) continue
    for (const [k, v] of Object.entries(block)) {
      if (flat[k] === undefined) {
        flat[k] = JSON.parse(JSON.stringify(v)) as FieldsetData
      }
    }
  }
  return flat
}

/**
 * One shared data-center asset tree; fieldset object keys are identical for every DC client, only
 * `FieldsetData` (e.g. display name) differs per client.
 */
export function buildSharedDatacenterMultiClientCatalog(): TemplateAssetConfig {
  const raw = getTemplateSourceData("template-datacenter-aws")
  if (raw.assetTypes.length === 0) {
    return { assetTypes: [], fieldsets: {} }
  }

  const rootId = "dc-catalog-root"
  const root: AssetType = {
    id: rootId,
    name: "Data Centers",
    code: "DC",
    description:
      "Shared asset type hierarchy for data center clients (AWS, Meta, Oracle). Fieldset definitions use DC-specific display names per client.",
    fieldset: "Procore Default",
    statusGroup: "Procore Default",
    hasSubtypes: true,
  }

  const assetTypes: AssetType[] = [
    root,
    ...raw.assetTypes.map((t) => ({
      ...t,
      parentId: t.parentId ?? rootId,
      fieldset: "Procore Default",
    })),
  ]

  const logicalKeys = Object.keys(raw.fieldsets)
  const fieldsetsByClient: Record<string, Record<string, FieldsetData>> = {}

  for (const client of DATACENTER_FIELDSET_CLIENTS) {
    const map: Record<string, FieldsetData> = {}
    for (const k of logicalKeys) {
      const src = raw.fieldsets[k]
      const clone = JSON.parse(JSON.stringify(src)) as FieldsetData
      if (k === "Procore Default") {
        map[k] = clone
      } else {
        clone.name = buildMultiClientFieldsetDisplayName(k, client)
        map[k] = clone
      }
    }
    fieldsetsByClient[client] = map
  }

  const primaryClient = DATACENTER_FIELDSET_CLIENTS[0]
  const fieldsets = JSON.parse(JSON.stringify(fieldsetsByClient[primaryClient])) as Record<
    string,
    FieldsetData
  >

  return {
    assetTypes,
    fieldsets,
    fieldsetsByClient,
  }
}

/** @deprecated Use buildSharedDatacenterMultiClientCatalog */
export function buildMultiHierarchyGlobalCatalog(): TemplateAssetConfig {
  return buildSharedDatacenterMultiClientCatalog()
}

/** Keeps `fieldsets` as a merged view of all per-client maps (for tools that read `fieldsets` only). */
export function syncFlatFieldsetsFromPrimaryClient(config: TemplateAssetConfig): TemplateAssetConfig {
  if (!config.fieldsetsByClient) return config
  return {
    ...config,
    fieldsets: mergeFieldsetsMapsForFlatDisplay(config.fieldsetsByClient),
  }
}
