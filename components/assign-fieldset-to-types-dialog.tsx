"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AssetType, FieldsetData } from "@/app/page"

function buildChildrenMap(types: AssetType[]): Map<string, AssetType[]> {
  const m = new Map<string, AssetType[]>()
  for (const t of types) {
    if (!t.parentId) continue
    const arr = m.get(t.parentId) ?? []
    arr.push(t)
    m.set(t.parentId, arr)
  }
  for (const [, arr] of m) {
    arr.sort((a, b) => a.name.localeCompare(b.name))
  }
  return m
}

function currentFieldsetLabel(
  a: AssetType,
  fieldsets: Record<string, FieldsetData>
): string {
  return fieldsets[a.fieldset]?.name?.trim() || a.fieldset || "—"
}

export interface AssignFieldsetToTypesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldsetDisplayName: string
  fieldsetKey: string
  assetTypes: AssetType[]
  fieldsets: Record<string, FieldsetData>
  selectedIds: Set<string>
  onSelectedIdsChange: (next: Set<string>) => void
  onAssign: () => void
  /** When bulk-selecting fieldsets with different keys, user picks one to apply. */
  fieldsetKeyChoices?: { fieldsetKey: string; displayName: string }[]
  activeFieldsetKey?: string
  onActiveFieldsetKeyChange?: (fieldsetKey: string) => void
}

export function AssignFieldsetToTypesDialog({
  open,
  onOpenChange,
  fieldsetDisplayName,
  fieldsetKey: _fieldsetKey,
  assetTypes,
  fieldsets,
  selectedIds,
  onSelectedIdsChange,
  onAssign,
  fieldsetKeyChoices,
  activeFieldsetKey,
  onActiveFieldsetKeyChange,
}: AssignFieldsetToTypesDialogProps) {
  const [filter, setFilter] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) {
      setFilter("")
      return
    }
    const parents = new Set<string>()
    const childrenMap = buildChildrenMap(assetTypes)
    for (const t of assetTypes) {
      if (childrenMap.has(t.id)) parents.add(t.id)
    }
    setExpanded(parents)
  }, [open, assetTypes])

  const childrenMap = useMemo(() => buildChildrenMap(assetTypes), [assetTypes])
  const byId = useMemo(() => new Map(assetTypes.map((t) => [t.id, t])), [assetTypes])

  const visibleIds = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return new Set(assetTypes.map((t) => t.id))

    function matches(t: AssetType): boolean {
      const fsName = currentFieldsetLabel(t, fieldsets)
      const hay =
        `${t.name} ${t.code} ${t.description ?? ""} ${t.fieldset} ${fsName}`.toLowerCase()
      return hay.includes(q)
    }

    const subtreeHas = new Map<string, boolean>()
    function visibleSubtree(id: string): boolean {
      if (subtreeHas.has(id)) return subtreeHas.get(id)!
      const t = byId.get(id)
      if (!t) return false
      const kids = childrenMap.get(id) ?? []
      const v = matches(t) || kids.some((c) => visibleSubtree(c.id))
      subtreeHas.set(id, v)
      return v
    }
    for (const t of assetTypes) visibleSubtree(t.id)

    const out = new Set<string>()
    for (const t of assetTypes) {
      if (subtreeHas.get(t.id)) out.add(t.id)
    }
    for (const id of [...out]) {
      let cur = byId.get(id)
      while (cur?.parentId) {
        out.add(cur.parentId)
        cur = byId.get(cur.parentId)
      }
    }
    return out
  }, [assetTypes, filter, byId, childrenMap, fieldsets])

  const topLevel = useMemo(() => {
    return assetTypes
      .filter((t) => !t.parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [assetTypes])

  const visibleCount = visibleIds.size
  const selectedVisibleCount = useMemo(() => {
    let n = 0
    for (const id of visibleIds) {
      if (selectedIds.has(id)) n += 1
    }
    return n
  }, [visibleIds, selectedIds])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectedIdsChange(next)
  }

  const renderRows = (nodes: AssetType[], depth: number): ReactNode[] => {
    const rows: ReactNode[] = []
    for (const t of nodes) {
      if (!visibleIds.has(t.id)) continue
      const kids = (childrenMap.get(t.id) ?? []).filter((c) => visibleIds.has(c.id))
      const hasKids = kids.length > 0
      const isExpanded = expanded.has(t.id)
      const pad = depth * 20

      rows.push(
        <TableRow key={t.id}>
          <TableCell className="w-10 align-middle">
            <Checkbox
              checked={selectedIds.has(t.id)}
              onCheckedChange={(c) => toggleOne(t.id, c === true)}
              aria-label={`Select ${t.name}`}
            />
          </TableCell>
          <TableCell className="align-middle">
            <div className="flex items-center gap-1" style={{ paddingLeft: pad }}>
              {hasKids ? (
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleExpand(t.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="inline-block w-5" />
              )}
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground text-sm">{t.code}</span>
            </div>
          </TableCell>
          <TableCell className="align-middle text-sm text-muted-foreground">
            {currentFieldsetLabel(t, fieldsets)}
          </TableCell>
        </TableRow>
      )

      if (hasKids && isExpanded) {
        rows.push(...renderRows(kids.sort((a, b) => a.name.localeCompare(b.name)), depth + 1))
      }
    }
    return rows
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Assign {fieldsetDisplayName} to Asset Types</DialogTitle>
          <p className="text-sm font-normal text-muted-foreground">
            {fieldsetKeyChoices && fieldsetKeyChoices.length > 1
              ? "You selected multiple fieldsets. Choose which one to assign, then pick asset types."
              : "Select the Asset Types or Subtypes you'd like to assign this fieldset."}
          </p>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
          {fieldsetKeyChoices && fieldsetKeyChoices.length > 1 && activeFieldsetKey && onActiveFieldsetKeyChange ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <Label className="text-sm font-medium">Fieldset to assign</Label>
              <RadioGroup
                value={activeFieldsetKey}
                onValueChange={onActiveFieldsetKeyChange}
                className="gap-2"
              >
                {fieldsetKeyChoices.map((c) => (
                  <div key={c.fieldsetKey} className="flex items-center gap-2">
                    <RadioGroupItem value={c.fieldsetKey} id={`fs-choice-${c.fieldsetKey}`} />
                    <Label htmlFor={`fs-choice-${c.fieldsetKey}`} className="cursor-pointer font-normal">
                      <span className="font-medium">{c.displayName}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{c.fieldsetKey}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ) : null}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            {selectedVisibleCount} of {visibleCount || 0} items selected
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead className="min-w-[140px]">Current Fieldset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No asset types match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  renderRows(
                    topLevel.filter((t) => visibleIds.has(t.id)),
                    0
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => onAssign()}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
