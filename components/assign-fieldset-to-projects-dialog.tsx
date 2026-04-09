"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
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
import type { FieldsetData } from "@/app/page"
import type { TemplateAssetConfig } from "@/components/asset-template-detail"
import { effectiveProjectFieldsetKey } from "@/lib/project-fieldset-keys"

export type CompanyProject = { id: string; name: string }

export interface AssignFieldsetToProjectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldsetDisplayName: string
  fieldsetKey: string
  projects: CompanyProject[]
  catalog: TemplateAssetConfig
  fieldsets: Record<string, FieldsetData>
  selectedProjectIds: Set<string>
  onSelectedProjectIdsChange: (next: Set<string>) => void
  onAssign: () => void
  fieldsetKeyChoices?: { fieldsetKey: string; displayName: string }[]
  activeFieldsetKey?: string
  onActiveFieldsetKeyChange?: (fieldsetKey: string) => void
}

export function AssignFieldsetToProjectsDialog({
  open,
  onOpenChange,
  fieldsetDisplayName,
  fieldsetKey: _fieldsetKey,
  projects,
  catalog,
  fieldsets,
  selectedProjectIds,
  onSelectedProjectIdsChange,
  onAssign,
  fieldsetKeyChoices,
  activeFieldsetKey,
  onActiveFieldsetKeyChange,
}: AssignFieldsetToProjectsDialogProps) {
  const [filter, setFilter] = useState("")

  useEffect(() => {
    if (!open) setFilter("")
  }, [open])

  const labelForProject = (projectId: string) => {
    const k = effectiveProjectFieldsetKey(catalog, projectId)
    return fieldsets[k]?.name?.trim() || k
  }

  const visibleProjects = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return sorted
    return sorted.filter((p) => {
      const k = effectiveProjectFieldsetKey(catalog, p.id)
      const lbl = fieldsets[k]?.name?.trim() || k
      const hay = `${p.name} ${p.id} ${lbl}`.toLowerCase()
      return hay.includes(q)
    })
  }, [projects, filter, catalog, fieldsets])

  const visibleCount = visibleProjects.length
  const selectedVisibleCount = useMemo(() => {
    let n = 0
    for (const p of visibleProjects) {
      if (selectedProjectIds.has(p.id)) n += 1
    }
    return n
  }, [visibleProjects, selectedProjectIds])

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedProjectIds)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectedProjectIdsChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Assign {fieldsetDisplayName} to Projects</DialogTitle>
          <p className="text-sm font-normal text-muted-foreground">
            {fieldsetKeyChoices && fieldsetKeyChoices.length > 1
              ? "You selected multiple fieldsets. Choose which one to assign, then pick projects."
              : "Select company projects that should use this fieldset. Unassigned projects use Procore Default."}
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
                    <RadioGroupItem value={c.fieldsetKey} id={`fs-proj-${c.fieldsetKey}`} />
                    <Label htmlFor={`fs-proj-${c.fieldsetKey}`} className="cursor-pointer font-normal">
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
              placeholder="Search projects"
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            {selectedVisibleCount} of {visibleCount || 0} projects selected
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead className="w-10" />
                  <TableHead>Project</TableHead>
                  <TableHead className="min-w-[160px]">Current Fieldset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No projects match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleProjects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="w-10 align-middle">
                        <Checkbox
                          checked={selectedProjectIds.has(p.id)}
                          onCheckedChange={(c) => toggleOne(p.id, c === true)}
                          aria-label={`Select ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{p.id}</span>
                      </TableCell>
                      <TableCell className="align-middle text-sm text-muted-foreground">
                        {labelForProject(p.id)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="bg-orange-500 hover:bg-orange-600" onClick={() => onAssign()}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
