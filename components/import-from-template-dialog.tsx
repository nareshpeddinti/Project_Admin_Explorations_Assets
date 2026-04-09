"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AssetTemplate } from "@/components/asset-templates-table"
import type { AssetType, FieldsetData } from "@/app/page"
import { ChevronDown, ChevronRight, Info, FolderInput } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type ImportFromApplyPayload = {
  sourceTemplateId: string
  mode: "replace" | "merge"
  /** Selected hierarchy nodes (subtrees include descendants; ancestors added on import). */
  selectedAssetTypeIds: string[]
  /**
   * Only when the source has no asset types: which fieldset definitions to import.
   * When the source has types, fieldsets are derived automatically from the selection.
   */
  selectedFieldsetKeys?: string[]
}

/** @deprecated use ImportFromApplyPayload */
export type CopyFromApplyPayload = ImportFromApplyPayload

interface ImportFromTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: AssetTemplate[]
  currentTemplateId: string
  getAssetTypesForTemplate: (templateId: string) => AssetType[]
  getFieldsetsForTemplate: (templateId: string) => Record<string, FieldsetData>
  onApply: (payload: ImportFromApplyPayload) => void
  catalogSources?: { id: string; label: string }[]
}

/** Group children by parent id (only when parent exists in the same template). */
function buildChildrenByParent(types: AssetType[]): Map<string, AssetType[]> {
  const ids = new Set(types.map((t) => t.id))
  const m = new Map<string, AssetType[]>()
  for (const t of types) {
    const p = t.parentId
    if (p && ids.has(p)) {
      if (!m.has(p)) m.set(p, [])
      m.get(p)!.push(t)
    }
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name))
  }
  return m
}

function getRoots(types: AssetType[]): AssetType[] {
  const ids = new Set(types.map((t) => t.id))
  return types
    .filter((t) => !t.parentId || !ids.has(t.parentId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function getAncestorIds(id: string, types: AssetType[]): string[] {
  const byId = new Map(types.map((t) => [t.id, t]))
  const out: string[] = []
  let cur = byId.get(id)?.parentId
  while (cur && byId.has(cur)) {
    out.push(cur)
    cur = byId.get(cur)!.parentId
  }
  return out
}

function getDescendantIds(id: string, childrenByParent: Map<string, AssetType[]>): string[] {
  const out: string[] = []
  const walk = (pid: string) => {
    for (const c of childrenByParent.get(pid) ?? []) {
      out.push(c.id)
      walk(c.id)
    }
  }
  walk(id)
  return out
}

type TreeCheckboxState = "checked" | "unchecked" | "indeterminate"

function subtreeIds(
  id: string,
  childrenByParent: Map<string, AssetType[]>
): string[] {
  return [id, ...getDescendantIds(id, childrenByParent)]
}

function subtreeSelectionState(
  id: string,
  childrenByParent: Map<string, AssetType[]>,
  selected: Set<string>
): TreeCheckboxState {
  const ids = subtreeIds(id, childrenByParent)
  const count = ids.filter((i) => selected.has(i)).length
  if (count === 0) return "unchecked"
  if (count === ids.length) return "checked"
  return "indeterminate"
}

function AssetTypeTreeBranch({
  nodes,
  depth,
  childrenByParent,
  selectedTypeIds,
  expandedIds,
  onToggleExpand,
  onToggleSelect,
}: {
  nodes: AssetType[]
  depth: number
  childrenByParent: Map<string, AssetType[]>
  selectedTypeIds: Set<string>
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onToggleSelect: (id: string, checked: boolean) => void
}) {
  return (
    <>
      {nodes.map((node) => {
        const kids = childrenByParent.get(node.id) ?? []
        const hasChildren = kids.length > 0
        const expanded = hasChildren && expandedIds.has(node.id)
        const state = subtreeSelectionState(node.id, childrenByParent, selectedTypeIds)
        const checkState: boolean | "indeterminate" =
          state === "checked"
            ? true
            : state === "indeterminate"
              ? "indeterminate"
              : false

        return (
          <div key={node.id} className="select-none">
            <div
              className={cn(
                "flex items-start gap-1 rounded px-1 py-0.5 hover:bg-muted/80",
                state !== "unchecked" && "bg-muted/25"
              )}
              style={{ paddingLeft: depth * 14 }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => onToggleExpand(node.id)}
                  aria-expanded={expanded}
                  aria-label={expanded ? "Collapse branch" : "Expand branch"}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="inline-flex h-7 w-7 shrink-0" aria-hidden />
              )}
              <Checkbox
                checked={checkState}
                onCheckedChange={(v) => {
                  if (v === "indeterminate") return
                  onToggleSelect(node.id, v === true)
                }}
                className="mt-1.5"
              />
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer rounded py-0.5 text-left text-sm leading-tight hover:underline"
                onClick={() => onToggleSelect(node.id, state !== "checked")}
              >
                <span className="font-mono text-xs text-orange-600 mr-1">{node.code}</span>
                {node.name}
              </button>
            </div>
            {hasChildren && expanded && (
              <AssetTypeTreeBranch
                nodes={kids}
                depth={depth + 1}
                childrenByParent={childrenByParent}
                selectedTypeIds={selectedTypeIds}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onToggleSelect={onToggleSelect}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

export function ImportFromTemplateDialog({
  open,
  onOpenChange,
  templates,
  currentTemplateId,
  getAssetTypesForTemplate,
  getFieldsetsForTemplate,
  onApply,
  catalogSources,
}: ImportFromTemplateDialogProps) {
  const [sourceId, setSourceId] = useState("")
  const [mode, setMode] = useState<"replace" | "merge">("merge")
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<string>>(new Set())
  const [selectedFieldsetKeys, setSelectedFieldsetKeys] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const sourceTypes = useMemo(
    () => (sourceId ? getAssetTypesForTemplate(sourceId) : []),
    [sourceId, getAssetTypesForTemplate]
  )

  const sourceFieldsets = useMemo(
    () => (sourceId ? getFieldsetsForTemplate(sourceId) : {}),
    [sourceId, getFieldsetsForTemplate]
  )

  const fieldsetEntries = useMemo(() => {
    return Object.keys(sourceFieldsets)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ key, data: sourceFieldsets[key]! }))
  }, [sourceFieldsets])

  const childrenByParent = useMemo(() => buildChildrenByParent(sourceTypes), [sourceTypes])

  const roots = useMemo(() => getRoots(sourceTypes), [sourceTypes])

  const hasTypeHierarchy = sourceTypes.length > 0

  useEffect(() => {
    if (!open) return
    const catalogIds = new Set((catalogSources ?? []).map((s) => s.id))
    const validPrev = (id: string) =>
      catalogIds.has(id) || templates.some((t) => t.id === id)
    setSourceId((prev) => {
      if (prev && validPrev(prev)) return prev
      const firstCatalog = catalogSources?.[0]?.id
      if (firstCatalog) return firstCatalog
      const preferred = templates.find((t) => t.id !== currentTemplateId) ?? templates[0]
      return preferred?.id ?? ""
    })
  }, [open, templates, currentTemplateId, catalogSources])

  useEffect(() => {
    if (!sourceId) return
    const types = getAssetTypesForTemplate(sourceId)
    setSelectedTypeIds(new Set(types.map((t) => t.id)))
  }, [sourceId, getAssetTypesForTemplate, open])

  useEffect(() => {
    if (!open || !sourceId || hasTypeHierarchy) return
    setSelectedFieldsetKeys(new Set(Object.keys(getFieldsetsForTemplate(sourceId))))
  }, [open, sourceId, hasTypeHierarchy, getFieldsetsForTemplate])

  useEffect(() => {
    if (!sourceId || sourceTypes.length === 0) {
      setExpandedIds(new Set())
      return
    }
    const expand = new Set<string>()
    for (const [pid, kids] of childrenByParent) {
      if (kids.length > 0) expand.add(pid)
    }
    setExpandedIds(expand)
  }, [sourceId, sourceTypes.length, childrenByParent])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllNodes = () => {
    const s = new Set<string>()
    for (const [pid, kids] of childrenByParent) {
      if (kids.length > 0) s.add(pid)
    }
    setExpandedIds(s)
  }

  const collapseAllNodes = () => setExpandedIds(new Set())

  const toggleType = (id: string, checked: boolean) => {
    setSelectedTypeIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
        for (const d of getDescendantIds(id, childrenByParent)) next.add(d)
        for (const a of getAncestorIds(id, sourceTypes)) next.add(a)
      } else {
        next.delete(id)
        for (const d of getDescendantIds(id, childrenByParent)) next.delete(d)
      }
      return next
    })
  }

  const selectAllTypes = () => {
    setSelectedTypeIds(new Set(sourceTypes.map((t) => t.id)))
  }

  const clearTypes = () => {
    setSelectedTypeIds(new Set())
  }

  const selectAllFieldsets = () => {
    setSelectedFieldsetKeys(new Set(Object.keys(sourceFieldsets)))
  }

  const clearFieldsets = () => {
    setSelectedFieldsetKeys(new Set())
  }

  const toggleFieldsetKey = (key: string, checked: boolean) => {
    setSelectedFieldsetKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const canApply = !!sourceId && (hasTypeHierarchy ? selectedTypeIds.size > 0 : selectedFieldsetKeys.size > 0)

  const handleApply = () => {
    if (!canApply) return
    onApply({
      sourceTemplateId: sourceId,
      mode,
      selectedAssetTypeIds: hasTypeHierarchy ? Array.from(selectedTypeIds) : [],
      ...(!hasTypeHierarchy ? { selectedFieldsetKeys: Array.from(selectedFieldsetKeys) } : {}),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderInput className="h-5 w-5 shrink-0" />
            Import from asset settings or template
          </DialogTitle>
          <DialogDescription className="text-sm">
            Choose a source and select asset type branches to import. Every fieldset those types use is copied with them,
            including per-project fieldset assignments from the source when they match imported keys. Use Replace or Merge
            to control how this template combines with imports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1 overflow-y-auto min-h-0 flex-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose source" />
              </SelectTrigger>
              <SelectContent>
                {(catalogSources ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.id === currentTemplateId ? " · current" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/15 p-3">
            {sourceTypes.length > 0 && (
              <div className="space-y-2 border-l-2 border-orange-500/40 pl-3 ml-0.5">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-foreground">1. Select asset types</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="How selection works"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[260px]">
                        Expand or collapse branches with the arrows. Checkboxes include the subtree; missing parents are
                        added when you import.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex flex-wrap gap-0.5 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={expandAllNodes}
                    >
                      Expand
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={collapseAllNodes}
                    >
                      Collapse
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={selectAllTypes}
                    >
                      All
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearTypes}>
                      None
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[min(220px,38vh)] rounded-md border bg-background/80">
                  <div className="p-2">
                    <AssetTypeTreeBranch
                      nodes={roots}
                      depth={0}
                      childrenByParent={childrenByParent}
                      selectedTypeIds={selectedTypeIds}
                      expandedIds={expandedIds}
                      onToggleExpand={toggleExpand}
                      onToggleSelect={toggleType}
                    />
                  </div>
                </ScrollArea>
                {selectedTypeIds.size === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Select at least one branch. Fieldsets and project assignments for those types are imported
                    automatically.
                  </p>
                )}
              </div>
            )}

            {sourceTypes.length === 0 && (
              <>
                <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3 ml-0.5">
                  This source has no asset types. Choose fieldset definitions to import (and any matching project
                  assignments from the source).
                </p>
                <div className="space-y-2 border-l-2 border-orange-500/40 pl-3 ml-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="text-xs font-semibold text-foreground">Select fieldsets</span>
                    <div className="flex flex-wrap gap-0.5 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={selectAllFieldsets}
                        disabled={fieldsetEntries.length === 0}
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={clearFieldsets}
                        disabled={fieldsetEntries.length === 0}
                      >
                        None
                      </Button>
                    </div>
                  </div>
                  {fieldsetEntries.length === 0 ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200 border border-amber-500/30 rounded-md px-2 py-1.5">
                      This source has no fieldsets. Pick another template or asset settings.
                    </p>
                  ) : (
                    <ScrollArea className="h-[min(240px,40vh)] rounded-md border bg-background/80">
                      <ul className="divide-y divide-border p-0">
                        {fieldsetEntries.map(({ key, data }) => {
                          const checked = selectedFieldsetKeys.has(key)
                          return (
                            <li key={key}>
                              <label className="flex cursor-pointer items-start gap-2 px-2 py-2 hover:bg-muted/50">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleFieldsetKey(key, v === true)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-mono text-xs text-orange-600">{key}</span>
                                  <span className="text-sm text-foreground">{data.name || key}</span>
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </ScrollArea>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Apply</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "replace" | "merge")}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor="mode-replace"
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  mode === "replace"
                    ? "border-orange-500/60 bg-orange-500/5"
                    : "border-transparent bg-muted/40 hover:bg-muted/60"
                )}
              >
                <RadioGroupItem value="replace" id="mode-replace" className="shrink-0" />
                <span className="font-medium leading-tight">Replace</span>
              </label>
              <label
                htmlFor="mode-merge"
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  mode === "merge"
                    ? "border-orange-500/60 bg-orange-500/5"
                    : "border-transparent bg-muted/40 hover:bg-muted/60"
                )}
              >
                <RadioGroupItem value="merge" id="mode-merge" className="shrink-0" />
                <span className="font-medium leading-tight">Merge</span>
              </label>
            </RadioGroup>
            <p className="text-[11px] text-muted-foreground px-0.5">
              {mode === "replace"
                ? "Replace: matching types (and subtypes) are removed before adding imports; each imported fieldset key overwrites your template’s key. Project→fieldset rows from the source for those keys are applied on top of yours."
                : "Merge: new types are added when code+name don’t match; fieldsets merge by key with section fields unioned. Project→fieldset assignments from the source for imported keys are merged in (same project id overwrites)."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={!canApply}
            onClick={handleApply}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** @deprecated use ImportFromTemplateDialog */
export const CopyFromTemplateDialog = ImportFromTemplateDialog
