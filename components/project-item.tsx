"use client"

import type React from "react"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import type { Project } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowDown, ArrowUp, Network, Trash, Lock } from "lucide-react"

interface ProjectItemProps {
  project: Project
}

export function ProjectItem({ project }: ProjectItemProps) {
  const {
    updateProject,
    deleteProject,
    selectProject,
    selectedProjectId,
    getProjectDependencies,
    getProjectDependents,
  } = useAppStore()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const dependencies = getProjectDependencies(project.id)
  const dependents = getProjectDependents(project.id)
  const hasDependencies = dependencies.length > 0
  const hasDependents = dependents.length > 0
  const needsInput = project.effort === 0 || project.value === 0
  const isReadonly = project.isLinkedCopy
  const canManageDependencies = project.effort > 0 && project.value > 0

  const handleEffortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadonly) return
    const value = Number.parseInt(e.target.value) || 0
    updateProject(project.id, { effort: Math.max(0, value) })
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadonly) return
    const value = Number.parseInt(e.target.value) || 0
    updateProject(project.id, { value: Math.max(0, value) })
  }

  const handleDelete = () => {
    deleteProject(project.id)
    setDeleteDialogOpen(false)
  }

  const isSelected = selectedProjectId === project.id

  return (
    <>
      <TableRow className={`${isSelected ? "bg-muted" : ""}`}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {project.title}
            {isReadonly && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Linked Copy
              </Badge>
            )}
            {needsInput && !isReadonly && (
              <Badge variant="outline" className="text-amber-500 border-amber-500">
                Needs input
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min="0"
            value={project.effort}
            onChange={handleEffortChange}
            onClick={(e) => e.stopPropagation()}
            className="w-20"
            disabled={false} // Effort can always be edited
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min="0"
            value={project.value}
            onChange={handleValueChange}
            onClick={(e) => e.stopPropagation()}
            className="w-20"
            disabled={isReadonly}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {hasDependencies && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ArrowUp className="h-4 w-4" />
                <span>{dependencies.length}</span>
              </div>
            )}
            {hasDependents && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ArrowDown className="h-4 w-4" />
                <span>{dependents.length}</span>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => selectProject(project.id)}
              disabled={!canManageDependencies}
            >
              <Network className="h-4 w-4" />
              <span className="sr-only">View dependencies</span>
            </Button>
            {!isReadonly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash className="h-4 w-4" />
                <span className="sr-only">Delete project</span>
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(hasDependencies || hasDependents) && (
            <div className="text-amber-500 text-sm">
              Warning: This project has dependencies that will also be removed.
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
