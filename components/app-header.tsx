"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nameError, setNameError] = useState("")

  const handleAddTeam = () => {
    if (!newTeamName.trim()) {
      setNameError("Team name cannot be empty")
      return
    }

    addTeam(newTeamName.trim())
    setNewTeamName("")
    setDialogOpen(false)
    setNameError("")
  }

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowGlobalView(true)}>Global View</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" /> New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>Add a new team to manage projects and capacity</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Team Name"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value)
                    setNameError("")
                  }}
                  className={nameError ? "border-red-500" : ""}
                />
                {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
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
