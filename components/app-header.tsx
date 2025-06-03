"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react" // Removed useCallback
import { useAppStore } from "@/lib/store"
import type { ImportedJsonFile } from "@/lib/types"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup, // Added SelectGroup for potential future use or structure
} from "@/components/ui/select" // Replaced DropdownMenu imports
import { ModeToggle } from "@/components/mode-toggle"
import { Plus, Upload } from "lucide-react" // Removed ChevronDown, ChevronUp
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

export function AppHeader() {
  const { teams, addTeam, importData, initialized, initializeStore } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()

  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamCapacity, setNewTeamCapacity] = useState<number | string>(0)
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)
  const [createTeamNameError, setCreateTeamNameError] = useState("")
  const [createTeamCapacityError, setCreateTeamCapacityError] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Removed DropdownMenu specific state and refs for scroll indicators
  // const dropdownContentRef = useRef<HTMLDivElement>(null)
  // const [showTopIndicator, setShowTopIndicator] = useState(false)
  // const [showBottomIndicator, setShowBottomIndicator] = useState(false)
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    if (!initialized) {
      initializeStore()
    }
  }, [initialized, initializeStore])

  // Removed checkScrollIndicators and its related useEffect

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

    const newTeamId = addTeam(newTeamName.trim(), capacityValue)
    setNewTeamName("")
    setNewTeamCapacity(0)
    setCreateTeamDialogOpen(false)
    setCreateTeamNameError("")
    setCreateTeamCapacityError("")
    router.push(`/team/${newTeamId}`)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result
        if (typeof text !== "string") {
          alert("Error reading file content.")
          return
        }
        const jsonData = JSON.parse(text) as ImportedJsonFile
        if (
          !jsonData ||
          !Array.isArray(jsonData.teams) ||
          typeof jsonData.projects !== "object" ||
          !Array.isArray(jsonData.dependencies)
        ) {
          alert("Invalid JSON file structure. Please ensure it matches the required format.")
          return
        }
        importData(jsonData)
        alert("Data imported successfully!")
        if (jsonData.teams.length > 0) {
          router.push(`/team/${jsonData.teams[0].id}`)
        } else {
          router.push("/global")
        }
      } catch (error) {
        console.error("Error importing JSON:", error)
        alert("Failed to import JSON. Please check the file format and content.")
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
    reader.onerror = () => {
      alert("Error reading file.")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const getCurrentSelectedValue = () => {
    if (pathname === "/global") {
      return "global"
    }
    const teamPathMatch = pathname.match(/^\/team\/([a-zA-Z0-9-]+)/)
    if (teamPathMatch) {
      return teamPathMatch[1] // teamId
    }
    // Attempt to select the first team if no specific path matches and teams exist
    // This helps if landing on "/" which redirects to a team page or global
    if (teams.length > 0 && pathname === "/") {
      // Or a more specific condition for initial load
      return teams[0].id
    }
    return undefined // Let SelectValue show placeholder if no match
  }

  const handleViewSelectionChange = (value: string) => {
    if (value === "global") {
      router.push("/global")
    } else if (value) {
      // Assumes value is a teamId
      router.push(`/team/${value}`)
    }
  }

  if (!initialized) {
    return (
      <header className="border-b">
        <div className="container mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Team Prioritization</h1>
          <div className="flex items-center gap-4">
            <div className="h-8 w-[180px] bg-muted rounded animate-pulse"></div> {/* Placeholder for select */}
            <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
            <ModeToggle />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold">
            Team Prioritization
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {teams.length > 0 || pathname === "/global" ? ( // Show select if teams exist or if on global view (to switch away)
            <Select value={getCurrentSelectedValue()} onValueChange={handleViewSelectionChange}>
              <SelectTrigger className="w-[180px] sm:w-[200px] md:w-[240px] min-w-0">
                {" "}
                {/* Added min-w-0 for better flex shrink */}
                <SelectValue placeholder="Select view..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {/* <SelectLabel>Teams</SelectLabel> // Optional label */}
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {teams.length > 0 && ( // Separator equivalent for Select, often just a new group or visual spacing
                  <SelectGroup className="border-t -mx-1 mt-1 pt-1">
                    {/* Basic visual separator, adjust styling as needed */}
                  </SelectGroup>
                )}
                <SelectGroup>
                  {/* <SelectLabel>Other</SelectLabel> // Optional label */}
                  <SelectItem value="global">Global View</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            // If no teams and not on global view (e.g. initial state before any team created)
            // We might show a disabled placeholder or nothing, depending on desired UX
            // For now, let's ensure "New Team" is always an option.
            // The Select component might not render if teams array is empty and not on global.
            // This logic ensures it appears if there's something to select or switch from.
            // If teams.length is 0 and not on global, it means we are on "/" before redirection.
            // In this case, the Select might not be useful until a team exists or user navigates to global.
            // The placeholder in SelectValue handles the "Select view..." text.
            // If teams.length === 0, the select will only show "Global View"
            <Select value={getCurrentSelectedValue()} onValueChange={handleViewSelectionChange}>
              <SelectTrigger className="w-[180px] sm:w-[200px] md:w-[240px] min-w-0">
                <SelectValue placeholder="Select view..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global View</SelectItem>
              </SelectContent>
            </Select>
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

          <Button variant="outline" size="sm" onClick={handleImportClick} className="flex items-center gap-1">
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
          <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileChange} className="hidden" />

          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
