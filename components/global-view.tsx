"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { prioritizeProjects } from "@/lib/prioritization"
import type { Project } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Network, Circle } from "lucide-react"
import { DependencyDrawer } from "@/components/dependency-drawer"

export function GlobalView() {
  const { teams, projects, selectProject } = useAppStore()

  // Calculate prioritized projects
  const { selectedProjects, unselectedProjects, teamSummaries } = useMemo(() => {
    return prioritizeProjects(Object.values(projects), teams)
  }, [projects, teams])

  // Calculate overall capacity utilization
  const overallUtilization = useMemo(() => {
    const totalCapacity = teams.reduce((sum, team) => sum + team.capacity, 0)
    const totalAllocated = teams.reduce((sum, team) => {
      const summary = teamSummaries[team.id] || { allocated: 0, value: 0 }
      return sum + summary.allocated
    }, 0)

    return totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0
  }, [teams, teamSummaries])

  const handleViewDependencies = (project: Project) => {
    selectProject(project.id)
  }

  // Function to get utilization color
  const getUtilizationColor = (allocated: number, capacity: number) => {
    if (capacity === 0) return "text-gray-400"
    const utilization = (allocated / capacity) * 100
    if (utilization < 50) return "text-green-500"
    if (utilization < 80) return "text-yellow-500"
    return "text-red-500"
  }

  // Function to export prioritized projects to CSV
  const exportToCSV = () => {
    if (selectedProjects.length === 0) return

    // Create CSV headers
    const headers = ["Project", "Team", "Effort", "Value", "Value/Effort Ratio"]

    // Create CSV rows
    const rows = selectedProjects.map((project) => {
      const team = teams.find((t) => t.id === project.teamId)?.name || "Unknown"
      const effort = project.effort !== null ? project.effort : 0
      const value = project.value !== null ? project.value : 0
      const ratio = effort > 0 ? (value / effort).toFixed(2) : "∞"

      return [
        `"${project.title}"`, // Quote the title to handle commas in titles
        `"${team}"`,
        effort,
        value,
        ratio,
      ].join(",")
    })

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n")

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Create a download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "prioritized-projects.csv")
    link.style.display = "none"

    // Add to document, trigger download, and clean up
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-6">Global Prioritization</h2>

        <div className="space-y-8">
          {/* Team Summary Section */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-xl font-semibold">Team Summary</h3>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Overall Utilization:</span>
                <Progress value={overallUtilization} className="flex-1" />
                <span className="text-sm font-medium min-w-[3rem]">{overallUtilization.toFixed(0)}%</span>
              </div>
            </div>

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
                      const utilizationColor = getUtilizationColor(summary.allocated, team.capacity)

                      return (
                        <TableRow key={team.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Circle className={`h-3 w-3 fill-current ${utilizationColor}`} />
                              {team.name}
                            </div>
                          </TableCell>
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

          {/* Prioritized Projects Section */}
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
                      const canManageDependencies =
                        project.effort !== null && project.value !== null && project.effort > 0 && project.value > 0
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell>{team?.name || "Unknown"}</TableCell>
                          <TableCell>{project.effort !== null ? project.effort : "--"}</TableCell>
                          <TableCell>{project.value !== null ? project.value : "--"}</TableCell>
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

            {selectedProjects.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            )}

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

            {/* Postponed Projects Section */}
            {unselectedProjects.length > 0 && (
              <>
                <h3 className="text-xl font-semibold mt-8 mb-4">Postponed Projects</h3>
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
                    <TableBody className="text-muted-foreground">
                      {unselectedProjects.map((project) => {
                        const team = teams.find((t) => t.id === project.teamId)
                        const canManageDependencies =
                          project.effort !== null && project.value !== null && project.effort > 0 && project.value > 0
                        return (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">{project.title}</TableCell>
                            <TableCell>{team?.name || "Unknown"}</TableCell>
                            <TableCell>{project.effort !== null ? project.effort : "--"}</TableCell>
                            <TableCell>{project.value !== null ? project.value : "--"}</TableCell>
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
              </>
            )}
          </div>
        </div>
      </div>

      <DependencyDrawer />
    </div>
  )
}
