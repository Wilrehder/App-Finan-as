"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { CreateGoalModal } from "./create-goal-modal"

export function GoalCreateButton() {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <button onClick={() => setOpen(true)} className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg">
        <Plus size={20} />
      </button>
      {open && <CreateGoalModal onClose={() => setOpen(false)} />}
    </>
  )
}

export function GoalCreateEmptyButton() {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
        Criar Objetivo
      </button>
      {open && <CreateGoalModal onClose={() => setOpen(false)} />}
    </>
  )
}
