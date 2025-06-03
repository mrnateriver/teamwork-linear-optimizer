"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { prioritizeProjects } from "@/lib/prioritization"
import type { Project } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Network } from "lucide-react"
import { DependencyDrawer } from "@/components/dependency-drawer"

export function GlobalView() {
  const { teams, projects, selectProject } = useAppStore()

  // Calculate prioritized projects
  const { selectedProjects, unselectedProjects, teamSummaries } = useMemo(() => {
    return prioritizeProjects(Object.values(projects), teams)
  }, [projects, teams])

  const handleViewDependencies = (project: Project) => {
    selectProject(project.id)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-6">Global Prioritization</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Prioritized Projects</h3>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Effort</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No projects selected. Add projects and set team capacities.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedProjects.map((project) => {
                      const team = teams.find((t) => t.id === project.teamId)
                      const canManageDependencies = project.effort > 0 && project.value > 0
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell>{team?.name || "Unknown"}</TableCell>
                          <TableCell>{project.effort}</TableCell>
                          <TableCell>{project.value}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDependencies(project)}
                              disabled={!canManageDependencies}
                            >
                              <Network className="h-4 w-4" />
                              <span className="sr-only">View dependencies</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {selectedProjects.length > 0 && unselectedProjects.length > 0 && (
              <div className="relative my-8">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Badge variant="outline" className="bg-background px-2">
                    Capacity Limit Reached
                  </Badge>
                </div>
              </div>
            )}

            {unselectedProjects.length > 0 && (
              <div className="border rounded-md mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Effort</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-muted-foreground">
                    {unselectedProjects.map((project) => {
                      const team = teams.find((t) => t.id === project.teamId)
                      const canManageDependencies = project.effort > 0 && project.value > 0
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell>{team?.name || "Unknown"}</TableCell>
                          <TableCell>{project.effort}</TableCell>
                          <TableCell>{project.value}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDependencies(project)}
                              disabled={!canManageDependencies}
                            >
                              <Network className="h-4 w-4" />
                              <span className="sr-only">View dependencies</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Team Summary</h3>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No teams created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team) => {
                      const summary = teamSummaries[team.id] || {
                        allocated: 0,
                        value: 0,
                      }
                      const remaining = team.capacity - summary.allocated

                      return (
                        <TableRow key={team.id}>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell>{team.capacity}</TableCell>
                          <TableCell>{summary.allocated}</TableCell>
                          <TableCell>{remaining}</TableCell>
                          <TableCell>{summary.value}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <DependencyDrawer />
    </div>
  )
}
