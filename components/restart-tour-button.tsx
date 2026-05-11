"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export function RestartTourButton() {
  const handleRestart = () => {
    // This event is caught by the OnboardingTour component
    window.dispatchEvent(new Event("restart-tour"));
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleRestart}
      className="w-full rounded-xl flex items-center justify-start gap-2 h-12"
    >
      <HelpCircle size={18} /> Refazer Tutorial do App
    </Button>
  );
}
