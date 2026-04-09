/**
 * Human-readable fieldset labels aligned with data center pattern:
 * "{Semantic} Fieldset {AWS|Meta|Oracle}" for multi-client catalogs.
 */

/** Primary client when a single flat `fieldsets` map uses multi-client-style labels (matches company catalog order). */
export const FIELDSET_DISPLAY_PRIMARY_CLIENT = "AWS"

/** Strip RES_/HOSP_/APT_ prefix from merged company-catalog keys before semantic lookup. */
export function stripVerticalNamespaceFromKey(key: string): string {
  return key.replace(/^(RES|HOSP|APT)_/, "")
}

/**
 * Short system label for a fieldset object key (logical key, e.g. "23-HVA_Fieldset" or "AP_PAV_Fieldset").
 * Most-specific patterns first.
 */
export function semanticShortForFieldsetKey(fieldsetKey: string): string {
  const verticalNs = fieldsetKey.match(/^(RES|HOSP|APT)_/)?.[1]
  const raw = stripVerticalNamespaceFromKey(fieldsetKey)
  const k = raw.toLowerCase().replace(/_fieldset$/i, "").replace(/-/g, "_")

  // Airports (AP_*)
  if (k.includes("ap_nav")) return "NAVAIDS & Weather"
  if (k.includes("ap_pav")) return "Airfield Pavement"
  if (k.includes("ap_afl")) return "Airfield Lighting"
  if (k.includes("ap_bhs")) return "Baggage Handling"
  if (k.includes("ap_trm")) return "Terminal Building"
  if (k.includes("ap_gse")) return "Ground Support & Fuel"
  if (k.includes("ap_sec")) return "Security & Perimeter"

  // Highways
  if (k.includes("hw_pav")) return "Highway Pavement"
  if (k.includes("hw_brg")) return "Bridges & Structures"
  if (k.includes("hw_dr")) return "Drainage & Stormwater"
  if (k.includes("hw_its")) return "ITS & Traffic"
  if (k.includes("hw_el")) return "Highway Lighting & Power"
  if (k.includes("hw_sa")) return "Safety & Barriers"

  // Wind
  if (k.includes("wf_turb")) return "Wind Turbine"
  if (k.includes("wf_nac")) return "Nacelle & Drivetrain"
  if (k.includes("wf_rot")) return "Rotor & Blades"
  if (k.includes("wf_twr")) return "Tower & Foundation"
  if (k.includes("wf_pwr")) return "Turbine Power Conversion"
  if (k.includes("wf_col")) return "MV Collection"
  if (k.includes("wf_sub")) return "Substation & Grid"
  if (k.includes("wf_bop")) return "Balance of Plant"
  if (k.includes("wf_civ")) return "Site & Civil"

  // Division 11 — disambiguate healthcare vs industrial keys
  if (k.includes("11_img")) return "Medical Imaging"
  if (k.includes("11_prd")) return "Production Equipment"
  if (verticalNs === "HOSP" && (k.includes("11_") || k === "11")) return "Medical Equipment"
  if (k.includes("11_") || k === "11") return "Equipment & Specialty Systems"

  // Healthcare-specific
  if (k.includes("28_nrs")) return "Nurse Call"
  if (k.includes("22_gas")) return "Medical Gas"
  if (k.includes("23_ahu")) return "Air Handling (Healthcare)"
  if (k.includes("26_crt")) return "Critical Power"

  // Life safety / fire (building)
  if (k.includes("28_fir")) return "Fire Protection"
  if (k.includes("28")) return "Life Safety"
  if (k.includes("21_spr") || k.includes("21")) return "Fire Suppression"

  // Vertical transportation
  if (k.includes("14_elv") || k.includes("14")) return "Vertical Transportation"

  // Plumbing / fluids
  if (k.includes("22_dom")) return "Domestic Water"
  if (k.includes("22_prc")) return "Process Water"
  if (k.includes("22")) return "Plumbing"

  // Data center & general HVAC / mechanical (match existing DC behavior)
  if (k.includes("23_hva")) return "HVAC"
  if (k.includes("23_air") || k.includes("crc") || k.includes("crah") || k.includes("irc")) return "Cooling"
  if (k.includes("23_gen") || k.includes("chl")) return "Chillers"
  if (k.includes("23_pmp")) return "Pumps"
  if (k.includes("23_chl")) return "Central Plant"
  if (k.includes("23_vnt")) return "Industrial Ventilation"
  if (k === "23") return "HVAC"

  // Electrical
  if (k.includes("26_pwr") || k.includes("pdu")) return "PDU"
  if (k.includes("26_ups")) return "UPS"
  if (k.includes("26_gen") && (k.includes("dsl") || k.includes("ats"))) return "Genset"
  if (k.includes("26_gen")) return "Emergency Power"
  if (k.includes("26_mcc")) return "Motor Control"
  if (k.includes("26")) return "Electrical"

  // Controls
  if (k.includes("40_plc") || k.includes("40")) return "Controls & Integration"

  // Site / parking
  if (k.includes("01_prk")) return "Parking Systems"
  if (k.includes("01")) return "Site & Infrastructure"

  // Fallback: readable from segments
  const parts = k.split("_").filter(Boolean)
  if (parts.length === 0) return "System"
  return parts
    .map((p) => p.replace(/^[a-z]/, (c) => c.toUpperCase()))
    .join(" ")
}

export function buildMultiClientFieldsetDisplayName(fieldsetKey: string, client: string): string {
  if (fieldsetKey === "Procore Default") return "Procore Default"
  const short = semanticShortForFieldsetKey(fieldsetKey)
  return `${short} Fieldset ${client}`.trim()
}

/** Single flat `fieldsets` map (no per-client maps): primary-style label without repeating client. */
export function buildFlatFieldsetDisplayName(fieldsetKey: string): string {
  if (fieldsetKey === "Procore Default") return "Procore Default"
  const short = semanticShortForFieldsetKey(fieldsetKey)
  return `${short} Fieldset`.trim()
}
