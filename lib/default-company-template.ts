/** Company-level template assignment id when no explicit list is stored. */
export const DEFAULT_COMPANY_TEMPLATE_ID = "template-default" as const

export function getEffectiveAssetTypeTemplateIds(
  assignments: Record<string, string[]> | undefined,
  typeId: string
): string[] {
  const raw = assignments?.[typeId]
  return raw && raw.length > 0 ? raw : [DEFAULT_COMPANY_TEMPLATE_ID]
}
