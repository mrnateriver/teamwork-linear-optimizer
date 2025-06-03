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
  showFromTeam?: boolean
}

export function ProjectItem({ project, showFromTeam = false }: ProjectItemProps) {
  const {
    updateProject,
    deleteProject,
    selectProject,
    selectedProjectId,
    getProjectDependencies,
    getProjectDependents,
    projects,
    teams,
  } = useAppStore()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const dependencies = getProjectDependencies(project.id)
  const dependents = getProjectDependents(project.id)
  const hasDependencies = dependencies.length > 0
  const hasDependents = dependents.length > 0
  const isLinkedCopy = project.isLinkedCopy

  // Get origin team name for linked copies
  let originTeamName = ""
  if (isLinkedCopy && project.sourceProjectId) {
    const sourceProject = projects[project.sourceProjectId]
    if (sourceProject) {
      const originTeam = teams.find((team) => team.id === sourceProject.teamId)
      originTeamName = originTeam?.name || "Unknown team"
    }
  }

  // Check if project needs input
  const needsInput = project.effort === null || project.value === null
  const linkedCopyNeedsInput = isLinkedCopy && project.effort === null

  // Project can manage dependencies if effort and value are set and greater than 0
  const canManageDependencies = project.effort !== null && project.value !== null

  const handleEffortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle empty input
    const inputValue = e.target.value
    if (inputValue === "") {
      updateProject(project.id, { effort: null })
      return
    }

    // Handle numeric input
    const value = Number.parseInt(inputValue) || 0
    updateProject(project.id, { effort: Math.max(0, value) })
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Value is readonly for linked copies
    if (isLinkedCopy) return

    // Handle empty input
    const inputValue = e.target.value
    if (inputValue === "") {
      updateProject(project.id, { value: null })
      return
    }

    // Handle numeric input
    const value = Number.parseInt(inputValue) || 0
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
        {showFromTeam && (
          <TableCell>
            {isLinkedCopy && originTeamName ? (
              <span className="text-sm text-muted-foreground">{originTeamName}</span>
            ) : null}
          </TableCell>
        )}

        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {project.title}
            {isLinkedCopy && (
              <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
                <Lock className="h-3 w-3" />
                Linked Copy
              </Badge>
            )}
            {needsInput && !isLinkedCopy && (
              <Badge variant="outline" className="text-amber-500 border-amber-500 whitespace-nowrap">
                Needs input
              </Badge>
            )}
            {linkedCopyNeedsInput && (
              <Badge variant="outline" className="text-amber-500 border-amber-500 whitespace-nowrap">
                Requires input
              </Badge>
            )}
          </div>
        </TableCell>

        <TableCell>
          <Input
            type="number"
            min="0"
            value={project.effort !== null ? project.effort : ""}
            onChange={handleEffortChange}
            onClick={(e) => e.stopPropagation()}
            className="w-20"
            disabled={false} // Effort can always be edited
            placeholder="--"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min="0"
            value={project.value !== null ? project.value : ""}
            onChange={handleValueChange}
            onClick={(e) => e.stopPropagation()}
            className="w-20"
            disabled={isLinkedCopy} // Value is readonly for linked copies
            placeholder="--"
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-center gap-2">
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
            {!hasDependencies && !hasDependents && <span className="text-sm text-muted-foreground">-</span>}
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
            {!isLinkedCopy && (
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
