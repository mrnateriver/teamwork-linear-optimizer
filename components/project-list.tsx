"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { ProjectItem } from "@/components/project-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Plus } from "lucide-react"

interface ProjectListProps {
  teamId: string
}

export function ProjectList({ teamId }: ProjectListProps) {
  const { projects, addProject } = useAppStore()
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [titleError, setTitleError] = useState("")

  const teamProjects = Object.values(projects).filter((project) => project.teamId === teamId)

  const handleAddProject = () => {
    if (!newProjectTitle.trim()) {
      setTitleError("Project title cannot be empty")
      return
    }

    addProject(teamId, newProjectTitle.trim())
    setNewProjectTitle("")
    setTitleError("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Projects</h3>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Project Title</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Effort
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated work required measured in person-days</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Value
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Business value score - higher numbers indicate greater business impact</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead>Dependencies</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No projects yet. Add your first project below.
                </TableCell>
              </TableRow>
            ) : (
              teamProjects.map((project) => <ProjectItem key={project.id} project={project} />)
            )}
            <TableRow>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New project title"
                      value={newProjectTitle}
                      onChange={(e) => {
                        setNewProjectTitle(e.target.value)
                        setTitleError("")
                      }}
                      className={titleError ? "border-red-500" : ""}
                    />
                  </div>
                  {titleError && <div className="text-red-500 text-sm">{titleError}</div>}
                </div>
              </TableCell>
              <TableCell colSpan={3}></TableCell>
              <TableCell>
                <Button onClick={handleAddProject} className="w-full flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
