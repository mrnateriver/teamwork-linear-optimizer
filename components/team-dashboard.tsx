"use client"

import type React from "react"
import { useAppStore } from "@/lib/store"
import { ProjectList } from "@/components/project-list"
import { DependencyDrawer } from "@/components/dependency-drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

interface TeamDashboardProps {
  teamId: string
}

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  const { teams, updateTeamCapacity } = useAppStore()
  const team = teams.find((t) => t.id === teamId)

  if (!team) {
    return <div>Team not found</div>
  }

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || 0
    updateTeamCapacity(teamId, Math.max(0, value))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{team.name}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-48">
          <Label htmlFor="capacity" className="flex items-center gap-2">
            Team Capacity
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total available work capacity for this team measured in person-days per planning period</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="capacity"
            type="number"
            min="0"
            value={team.capacity}
            onChange={handleCapacityChange}
            className="mt-1"
          />
        </div>
      </div>

      <ProjectList teamId={teamId} />
      <DependencyDrawer />
    </div>
  )
}
