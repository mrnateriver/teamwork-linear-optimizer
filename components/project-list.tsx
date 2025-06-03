"use client"

import { useState, useMemo } from "react" // Added useMemo
import { useAppStore } from "@/lib/store"
import { ProjectItem } from "@/components/project-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Plus, Search } from "lucide-react" // Added Search icon

interface ProjectListProps {
  teamId: string
}

export function ProjectList({ teamId }: ProjectListProps) {
  const { projects, addProject } = useAppStore()
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [titleError, setTitleError] = useState("")
  const [searchQuery, setSearchQuery] = useState("") // State for search query

  const teamProjects = useMemo(() => {
    return Object.values(projects).filter((project) => project.teamId === teamId)
  }, [projects, teamId])

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return teamProjects
    }
    return teamProjects.filter((project) => project.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [teamProjects, searchQuery])

  const hasLinkedCopies = useMemo(() => {
    return teamProjects.some((project) => project.isLinkedCopy) // Check on original teamProjects
  }, [teamProjects])

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
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {hasLinkedCopies && <TableHead className="w-[140px]">From Team</TableHead>}
              <TableHead>Project Title</TableHead>
              <TableHead className="w-[100px]">
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
              <TableHead className="w-[100px]">
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
              <TableHead className="w-[120px]">Dependencies</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasLinkedCopies ? 6 : 5} className="text-center py-6 text-muted-foreground">
                  {searchQuery ? "No projects match your search." : "No projects yet. Add your first project below."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <ProjectItem key={project.id} project={project} showFromTeam={hasLinkedCopies} />
              ))
            )}
            <TableRow>
              {hasLinkedCopies && <TableCell></TableCell>}
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
