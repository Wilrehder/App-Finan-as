"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, MessageSquare, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Painel",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Chat",
      href: "/chat",
      icon: MessageSquare,
    },
    {
      name: "Ajustes",
      href: "/configuracoes",
      icon: Settings,
    },
  ]

  // Don't render on auth pages, landing page, or paywall
  const hiddenRoutes = ["/login", "/cadastro", "/assinatura"]
  if (pathname === "/" || hiddenRoutes.some(route => pathname.startsWith(route))) {
    return null
  }

  return (
    <div className="bottom-nav-container fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe bg-background/80 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              id={item.name === "Painel" ? "tour-dashboard-tab" : item.name === "Ajustes" ? "tour-settings-tab" : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 relative transition-all duration-300",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-primary/10 rounded-2xl scale-0 transition-transform duration-300",
                  isActive && "scale-100"
                )}
              />
              <item.icon className={cn("w-6 h-6 mb-1 relative z-10", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
