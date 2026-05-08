import { getGoals } from "./actions"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { GoalCreateButton, GoalCreateEmptyButton } from "@/components/goal-create-button"
import { GoalCard } from "@/components/goal-card"

export default async function ObjetivosPage() {
  const goals = await getGoals()

  return (
    <div className="flex flex-col min-h-screen p-4 pb-24 space-y-6 pt-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meus Objetivos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe suas metas</p>
          </div>
        </div>
        <GoalCreateButton />
      </div>

      {goals.length === 0 ? (
        <Card className="bg-secondary/50 border-none glass mt-10">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-5xl">🎯</div>
            <h3 className="text-lg font-semibold">Nenhum objetivo criado</h3>
            <p className="text-sm text-muted-foreground">Que tal começar a planejar aquela viagem ou criar sua reserva de emergência?</p>
            <GoalCreateEmptyButton />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
