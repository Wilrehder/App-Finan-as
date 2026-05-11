"use client";

import { useEffect, useState } from "react";
import { Joyride, EventData, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { usePathname, useRouter } from "next/navigation";

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
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
        setStepIndex(0);
        setRun(true);
      }
    };

    window.addEventListener("restart-tour", handleRestart);

    // If we just redirected from settings to restart the tour
    if (pathname === "/chat" && localStorage.getItem("finchat_tour_pending") === "true") {
      localStorage.removeItem("finchat_tour_pending");
      localStorage.removeItem("finchat_tour_completed");
      setStepIndex(0);
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
      content: "No Painel, você tem acesso a gráficos dinâmicos, balanço do mês e todo o histórico das suas transações de forma visual. Vamos dar uma olhada lá agora!",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: "#tour-dashboard-overview",
      content: "Este é o seu balanço geral. Aqui você acompanha rapidamente o saldo do mês atual e vê o comparativo direto com o mês anterior.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: "#tour-dashboard-goals",
      content: "Aqui ficam suas Metas e Objetivos de vida (como viagens ou uma reserva de emergência).",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: "#tour-dashboard-insights",
      content: "Insights do Fin! Nossa inteligência artificial analisa seus padrões de gastos e te dá dicas diárias de onde você pode economizar mais dinheiro.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: "#tour-dashboard-transactions",
      content: "Este é o seu Extrato detalhado. Você também pode exportar relatórios em PDF do mês fechado clicando naquele botão.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: "#tour-settings-tab",
      content: "Por fim, nos Ajustes, você pode configurar lembretes, sua conta e gerenciar assinaturas. Aproveite o Finchat!",
      placement: "top",
      skipBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { action, index, status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      localStorage.setItem("finchat_tour_completed", "true");
      setStepIndex(0);
      setRun(false);
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Avança ou retrocede o passo
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Se clicou para avançar no passo do ícone do Painel (index 2)
      if (action === ACTIONS.NEXT && index === 2) {
        setRun(false); // Pausa temporariamente
        router.push("/dashboard");
        setTimeout(() => {
          setStepIndex(nextStepIndex);
          setRun(true);
        }, 800); // Aguarda página carregar
      } 
      // Se clicou em voltar estando no primeiro card do dashboard (index 3)
      else if (action === ACTIONS.PREV && index === 3) {
        setRun(false);
        router.push("/chat");
        setTimeout(() => {
          setStepIndex(nextStepIndex);
          setRun(true);
        }, 800);
      }
      else {
        setStepIndex(nextStepIndex);
      }
    }
  };

  // Only render on client to avoid hydration mismatch with localStorage
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Joyride
      stepIndex={stepIndex}
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
