"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { ProjectList } from "@/components/project-list"
import { DependencyDrawer } from "@/components/dependency-drawer"
import { TeamPrioritizationPanel } from "@/components/team-prioritization-panel"
import { TeamDependencyGraph } from "@/components/team-dependency-graph"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Edit, Trash2 } from "lucide-react"

interface TeamDashboardProps {
  teamId: string
}

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  const { teams, updateTeamCapacity, updateTeamName, deleteTeam } = useAppStore()
  const team = teams.find((t) => t.id === teamId)
  const [activeTab, setActiveTab] = useState("projects")

  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamCapacity, setEditTeamCapacity] = useState<number | string>(0)
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false)
  const [editTeamNameError, setEditTeamNameError] = useState("")
  const [editTeamCapacityError, setEditTeamCapacityError] = useState("")

  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false)

  useEffect(() => {
    if (team) {
      setEditTeamName(team.name)
      setEditTeamCapacity(team.capacity)
    }
  }, [team])

  if (!team) {
    return <div>Team not found</div>
  }

  const handleOpenEditTeamDialog = () => {
    setEditTeamName(team.name)
    setEditTeamCapacity(team.capacity)
    setEditTeamNameError("")
    setEditTeamCapacityError("")
    setEditTeamDialogOpen(true)
  }

  const handleEditTeam = () => {
    let hasError = false
    if (!editTeamName.trim()) {
      setEditTeamNameError("Team name cannot be empty")
      hasError = true
    }
    const capacityValue = Number(editTeamCapacity)
    if (isNaN(capacityValue) || capacityValue < 0) {
      setEditTeamCapacityError("Capacity must be a non-negative number")
      hasError = true
    }

    if (hasError) return

    if (team.name !== editTeamName.trim()) {
      updateTeamName(teamId, editTeamName.trim())
    }
    if (team.capacity !== capacityValue) {
      updateTeamCapacity(teamId, capacityValue)
    }
    setEditTeamDialogOpen(false)
  }

  const handleDeleteTeam = () => {
    deleteTeam(teamId)
    setDeleteTeamDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold">{team.name}</h2>
            <Button variant="ghost" size="icon" onClick={handleOpenEditTeamDialog} title="Edit team details">
              <Edit className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTeamDialogOpen(true)}
              title="Delete team"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
          <Badge variant="outline" className="mt-1 w-fit">
            Capacity: {team.capacity} person-days
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="prioritization">Team Prioritization</TabsTrigger>
          <TabsTrigger value="dependencies">Team Dependencies</TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="mt-4">
          <ProjectList teamId={teamId} />
        </TabsContent>
        <TabsContent value="prioritization" className="mt-4">
          <TeamPrioritizationPanel teamId={teamId} />
        </TabsContent>
        <TabsContent value="dependencies" className="mt-4">
          <TeamDependencyGraph teamId={teamId} />
        </TabsContent>
      </Tabs>

      <DependencyDrawer />

      {/* Edit Team Dialog */}
      <Dialog open={editTeamDialogOpen} onOpenChange={setEditTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Details</DialogTitle>
            <DialogDescription>Update the name and capacity of your team.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                placeholder="Team Name"
                value={editTeamName}
                onChange={(e) => {
                  setEditTeamName(e.target.value)
                  setEditTeamNameError("")
                }}
                className={editTeamNameError ? "border-red-500" : ""}
              />
              {editTeamNameError && <p className="text-red-500 text-sm mt-1">{editTeamNameError}</p>}
            </div>
            <div>
              <Label htmlFor="edit-team-capacity">Capacity (person-days)</Label>
              <Input
                id="edit-team-capacity"
                type="number"
                placeholder="0"
                value={editTeamCapacity}
                min="0"
                onChange={(e) => {
                  setEditTeamCapacity(e.target.value === "" ? "" : Number(e.target.value))
                  setEditTeamCapacityError("")
                }}
                className={editTeamCapacityError ? "border-red-500" : ""}
              />
              {editTeamCapacityError && <p className="text-red-500 text-sm mt-1">{editTeamCapacityError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTeam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Alert Dialog */}
      <AlertDialog open={deleteTeamDialogOpen} onOpenChange={setDeleteTeamDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting "{team?.name}" will remove all its projects and associated data.
              Linked copies of its projects in other teams will become standalone projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
