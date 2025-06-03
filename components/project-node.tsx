"use client"

import { memo } from "react"
import { Handle, Position } from "reactflow"
import type { Project, Team } from "@/lib/types"

interface ProjectNodeProps {
  data: {
    project: Project
    team?: Team
    isSelected?: boolean
    isPrerequisite?: boolean
    isDependent?: boolean
  }
}

export const ProjectNode = memo(({ data }: ProjectNodeProps) => {
  const { project, team, isSelected, isPrerequisite, isDependent } = data

  // Determine node color based on role
  let bgColor = "bg-gray-100 dark:bg-gray-800"
  let borderColor = "border-gray-300 dark:border-gray-600"

  if (isPrerequisite) {
    bgColor = "bg-blue-50 dark:bg-blue-950"
    borderColor = "border-blue-300 dark:border-blue-800"
  } else if (isDependent) {
    bgColor = "bg-green-50 dark:bg-green-950"
    borderColor = "border-green-300 dark:border-green-800"
  } else if (isSelected) {
    bgColor = "bg-gray-100 dark:bg-gray-800"
    borderColor = "border-gray-400 dark:border-gray-500 border-2"
  }

  return (
    <div className={`px-4 py-2 rounded-md shadow-sm border ${bgColor} ${borderColor}`}>
      {isPrerequisite && <Handle type="source" position={Position.Right} style={{ background: "#555" }} />}

      {isDependent && <Handle type="target" position={Position.Left} style={{ background: "#555" }} />}

      {!isPrerequisite && !isDependent && (
        <>
          <Handle type="target" position={Position.Left} style={{ background: "#555" }} />
          <Handle type="source" position={Position.Right} style={{ background: "#555" }} />
        </>
      )}

      <div className="font-medium text-sm">{project.title}</div>
      {team && <div className="text-xs text-muted-foreground mt-1">{team.name}</div>}
      <div className="flex gap-2 mt-1 text-xs">
        <span>Effort: {project.effort}</span>
        <span>Value: {project.value}</span>
      </div>
    </div>
  )
})

ProjectNode.displayName = "ProjectNode"
