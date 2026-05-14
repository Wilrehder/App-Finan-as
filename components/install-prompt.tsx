"use client"

import { useState, useEffect } from "react"
import { X, Download } from "lucide-react"

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Android install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    const isStand = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(isStand)

    // Escuta o sinal de "onboarding-step-install" para mostrar
    const handleShow = () => {
      // Se já foi dispensado antes OU já está em standalone, pula direto
      if (localStorage.getItem('pwaPromptDismissed') || isStand) {
        window.dispatchEvent(new Event('onboarding-step-notifications'))
        return
      }
      setShowPrompt(true)
    }

    window.addEventListener('onboarding-step-install', handleShow)

    return () => {
      window.removeEventListener('onboarding-step-install', handleShow)
    }
  }, [])

  if (!showPrompt || isStandalone) return null

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        dismiss()
      }
      setDeferredPrompt(null)
    }
  }

  const dismiss = () => {
    localStorage.setItem('pwaPromptDismissed', 'true')
    setShowPrompt(false)
    // Avança para o próximo passo: notificações
    window.dispatchEvent(new Event('onboarding-step-notifications'))
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-xl flex flex-col gap-3 relative border border-white/10">
        <button onClick={dismiss} className="absolute top-2 right-2 p-2 opacity-70 hover:opacity-100 cursor-pointer">
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl flex-shrink-0">
            <Download size={24} />
          </div>
          <div className="pr-6">
            <h3 className="font-bold text-sm">Instalar Finchat</h3>
            <p className="text-xs opacity-90 mt-0.5">Use o app offline e sem distrações.</p>
          </div>
        </div>
        
        {isIOS ? (
          <div className="text-xs bg-black/20 p-3 rounded-xl">
            Toque no ícone de <span className="font-bold border border-white/30 px-1 py-0.5 rounded text-[10px] mx-1">Compartilhar</span> no menu e selecione <span className="font-bold">Adicionar à Tela de Início</span>.
          </div>
        ) : deferredPrompt ? (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-white text-primary font-bold text-sm py-2 rounded-xl mt-1 active:scale-95 transition-transform"
          >
            Instalar Agora
          </button>
        ) : (
          <div className="text-xs bg-black/20 p-3 rounded-xl mt-1">
            Selecione "Adicionar à Tela Inicial" no menu do seu navegador.
          </div>
        )}
      </div>
    </div>
  )
}
