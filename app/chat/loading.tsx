// Skeleton para a página de Chat (é "use client", então o loading.tsx age como fallback de Suspense)
export default function ChatLoading() {
  return (
    <div className="fixed inset-0 bottom-[80px] max-w-md mx-auto flex flex-col animate-pulse">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="w-16 h-4 bg-muted rounded-lg" />
        </div>
        <div className="w-10 h-10 rounded-full bg-muted" />
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-hidden px-4 pt-4 space-y-4">
        {/* Bot */}
        <div className="flex justify-start">
          <div className="w-56 h-16 bg-muted/60 rounded-2xl rounded-bl-none" />
        </div>
        {/* Botões */}
        <div className="flex gap-2 pl-1">
          <div className="w-20 h-8 bg-muted/40 rounded-full" />
          <div className="w-20 h-8 bg-muted/40 rounded-full" />
          <div className="w-20 h-8 bg-muted/40 rounded-full" />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="h-14 bg-muted/60 rounded-full" />
      </div>
    </div>
  )
}
