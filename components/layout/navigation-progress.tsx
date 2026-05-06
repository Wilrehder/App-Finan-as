"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Barra de progresso fina no topo da tela que aparece durante transições de rota.
 * Funciona interceptando cliques em links e monitorando mudanças de pathname.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const prevPathname = useRef(pathname)

  // Detecta cliques em links e inicia a barra
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return

      const href = target.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return

      // Só dispara se for uma rota interna diferente da atual
      if (href === pathname) return

      setVisible(true)
      setWidth(15)

      // Simula progresso rápido até 85%
      let current = 15
      timerRef.current = setInterval(() => {
        current += Math.random() * 15
        if (current >= 85) {
          current = 85
          if (timerRef.current) clearInterval(timerRef.current)
        }
        setWidth(current)
      }, 200)
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [pathname])

  // Quando a rota muda, completa a barra e some
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      if (timerRef.current) clearInterval(timerRef.current)
      setWidth(100)
      const hide = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 300)
      return () => clearTimeout(hide)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-primary rounded-r-full pointer-events-none"
      style={{
        width: `${width}%`,
        transition: width === 100 ? "width 200ms ease-out" : "width 200ms ease-in",
      }}
    />
  )
}
