"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { ChevronDown, Plus } from "lucide-react"

export function AppHeader() {
  const { teams, addTeam, selectedTeamId, selectTeam, showGlobalView, setShowGlobalView } = useAppStore()

  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamCapacity, setNewTeamCapacity] = useState<number | string>(0)
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)
  const [createTeamNameError, setCreateTeamNameError] = useState("")
  const [createTeamCapacityError, setCreateTeamCapacityError] = useState("")

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

  const handleAddTeam = () => {
    let hasError = false
    if (!newTeamName.trim()) {
      setCreateTeamNameError("Team name cannot be empty")
      hasError = true
    }
    const capacityValue = Number(newTeamCapacity)
    if (isNaN(capacityValue) || capacityValue < 0) {
      setCreateTeamCapacityError("Capacity must be a non-negative number")
      hasError = true
    }

    if (hasError) return

    addTeam(newTeamName.trim(), capacityValue)
    setNewTeamName("")
    setNewTeamCapacity(0)
    setCreateTeamDialogOpen(false)
    setCreateTeamNameError("")
    setCreateTeamCapacityError("")
  }

  return (
    <header className="border-b">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Team Prioritization</h1>
        </div>

        <div className="flex items-center gap-4">
          {teams.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {showGlobalView ? "Global View" : selectedTeam ? selectedTeam.name : "Select Team"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => {
                        selectTeam(team.id)
                        setShowGlobalView(false)
                      }}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                  {teams.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => setShowGlobalView(true)}>Global View</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" /> New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>Add a new team to manage projects and capacity.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <Label htmlFor="new-team-name">Team Name</Label>
                  <Input
                    id="new-team-name"
                    placeholder="Team Name"
                    value={newTeamName}
                    onChange={(e) => {
                      setNewTeamName(e.target.value)
                      setCreateTeamNameError("")
                    }}
                    className={createTeamNameError ? "border-red-500" : ""}
                  />
                  {createTeamNameError && <p className="text-red-500 text-sm mt-1">{createTeamNameError}</p>}
                </div>
                <div>
                  <Label htmlFor="new-team-capacity">Initial Capacity (person-days)</Label>
                  <Input
                    id="new-team-capacity"
                    type="number"
                    placeholder="0"
                    value={newTeamCapacity}
                    min="0"
                    onChange={(e) => {
                      setNewTeamCapacity(e.target.value === "" ? "" : Number(e.target.value))
                      setCreateTeamCapacityError("")
                    }}
                    className={createTeamCapacityError ? "border-red-500" : ""}
                  />
                  {createTeamCapacityError && <p className="text-red-500 text-sm mt-1">{createTeamCapacityError}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateTeamDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTeam}>Create Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
