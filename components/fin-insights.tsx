"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { getDailyInsights } from "@/app/dashboard/insights-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Insight {
  emoji: string
  text: string
}

export function FinInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInsights() {
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const cacheKey = `fin_insights_${todayStr}`
        
        // Tenta pegar do cache local do navegador
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          setInsights(JSON.parse(cached))
          setLoading(false)
          return
        }

        // Se não tem cache, busca do servidor
        const data = await getDailyInsights()
        if (data && data.length > 0) {
          setInsights(data)
          localStorage.setItem(cacheKey, JSON.stringify(data))
        }
      } catch (error) {
        console.error("Failed to load insights:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInsights()
  }, [])

  if (loading) {
    return (
      <Card className="border-none shadow-sm bg-gradient-to-br from-[#1E293B] to-[#0F172A] mb-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-lg font-medium flex items-center gap-2 text-white/90">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            Insights do Fin
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
              <div className="h-8 rounded-md bg-white/10 w-full"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) return null;

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] mb-8 overflow-hidden relative transform transition-all duration-500 hover:scale-[1.01]">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
      
      {/* Decoração de fundo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl"></div>

      <CardHeader className="pb-4 relative z-10">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white tracking-wide">
          <Sparkles className="w-5 h-5 text-amber-300" />
          Insights do Fin
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex flex-col gap-4">
          {insights.map((insight, idx) => (
            <div key={idx} className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm shadow-sm transition-all hover:bg-white/10">
              <div className="text-2xl shrink-0 leading-none drop-shadow-sm">{insight.emoji}</div>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
