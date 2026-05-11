"use client";

import { useEffect, useState } from "react";
import { Joyride, EventData, STATUS, Step } from "react-joyride";
import { usePathname, useRouter } from "next/navigation";

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only run on the main /chat page to ensure elements exist
    if (pathname === "/chat") {
      const hasCompleted = localStorage.getItem("finchat_tour_completed");
      if (!hasCompleted) {
        // Small delay to let the page render completely
        setTimeout(() => setRun(true), 1000);
      }
    }

    const handleRestart = () => {
      if (pathname !== "/chat") {
        router.push("/chat");
        // Save a temporary flag to start when we reach chat
        localStorage.setItem("finchat_tour_pending", "true");
      } else {
        localStorage.removeItem("finchat_tour_completed");
        setRun(true);
      }
    };

    window.addEventListener("restart-tour", handleRestart);

    // If we just redirected from settings to restart the tour
    if (pathname === "/chat" && localStorage.getItem("finchat_tour_pending") === "true") {
      localStorage.removeItem("finchat_tour_pending");
      localStorage.removeItem("finchat_tour_completed");
      setTimeout(() => setRun(true), 1000);
    }

    return () => {
      window.removeEventListener("restart-tour", handleRestart);
    };
  }, [pathname, router]);

  const steps: Step[] = [
    {
      target: "body",
      content: "Bem-vindo ao Finchat! Vamos fazer um tour rápido de 1 minuto para você aprender a organizar suas finanças com Inteligência Artificial.",
      placement: "center",
      skipBeacon: true,
    },
    {
      target: "#tour-chat-input",
      content: "Aqui é onde a mágica acontece. Você pode enviar áudios ou textos como 'gastei 50 no mercado' e a IA anota tudo automaticamente para você.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: "#tour-dashboard-tab",
      content: "No Painel, você tem acesso a gráficos dinâmicos, balanço do mês e todo o histórico das suas transações de forma visual.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: "#tour-settings-tab",
      content: "Nos Ajustes, você pode configurar lembretes, metas e gerenciar seu perfil. Aproveite o Finchat!",
      placement: "top",
      skipBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      localStorage.setItem("finchat_tour_completed", "true");
      setRun(false);
    }
  };

  // Only render on client to avoid hydration mismatch with localStorage
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      options={{
        zIndex: 100000,
        primaryColor: "#0ea5e9", // Tailwind sky-500
        backgroundColor: "#18181b", // Tailwind zinc-900
        textColor: "#f4f4f5", // Tailwind zinc-100
        arrowColor: "#18181b",
        showProgress: true,
        buttons: ["back", "primary", "skip"],
      }}
      styles={{
        buttonClose: {
          display: "none",
        },
        buttonSkip: {
          color: "#a1a1aa", // Tailwind zinc-400
        },
        buttonBack: {
          color: "#f4f4f5",
          marginRight: 10,
        },
        tooltip: {
          borderRadius: 16,
          padding: 20,
        },
        tooltipContainer: {
          textAlign: "left",
        }
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
