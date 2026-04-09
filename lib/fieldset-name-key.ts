/**
 * Build a stable fieldset object key from a human-readable name
 * (e.g. "Residential HVAC Fieldset" → "residential_hvac_fieldset").
 */
export function fieldsetKeyFromDisplayName(name: string, taken: Set<string>): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  let base = raw.length > 0 ? raw : "custom_fieldset"
  if (!/_fieldset$/.test(base)) {
    base = `${base.replace(/_+$/, "")}_fieldset`
  }
  let key = base
  let n = 1
  while (taken.has(key)) {
    key = `${base}_${n++}`
  }
  return key
}
