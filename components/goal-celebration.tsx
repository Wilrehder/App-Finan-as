"use client"

import { useEffect, useState } from "react"

export function GoalCelebration() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Esconde a animação principal depois de 3.5s
    const timer = setTimeout(() => setShow(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-xl">
      <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
      <div className="absolute top-0 left-0 w-full h-full flex items-start justify-center pt-2 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="text-2xl animate-bounce drop-shadow-md opacity-80"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '1s'
            }}
          >
            🎉
          </div>
        ))}
      </div>
    </div>
  )
}
