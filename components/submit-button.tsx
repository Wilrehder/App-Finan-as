"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

interface SubmitButtonProps {
  pendingText?: string;
  defaultText?: string;
}

export function SubmitButton({ pendingText = "Carregando...", defaultText = "Enviar" }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button className="w-full mt-4 rounded-2xl" type="submit" disabled={pending}>
      {pending ? pendingText : defaultText}
    </Button>
  )
}
