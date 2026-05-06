export default function ConfiguracoesLoading() {
  return (
    <div className="flex flex-col min-h-screen p-4 pb-24 space-y-6 pt-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-24 bg-muted rounded-lg" />
        <div className="h-3 w-48 bg-muted/60 rounded-lg" />
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-28 bg-muted rounded-lg" />
          <div className="h-3 w-40 bg-muted/60 rounded-lg" />
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {/* Preferencias */}
        <div className="bg-muted/20 rounded-3xl p-4 space-y-4">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-muted/60 rounded" />
              <div className="w-10 h-6 bg-muted rounded-full" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3 w-32 bg-muted/60 rounded" />
              <div className="w-10 h-6 bg-muted/60 rounded-full" />
            </div>
          </div>
        </div>

        {/* Contas fixas */}
        <div className="bg-muted/20 rounded-3xl p-4 space-y-3">
          <div className="h-4 w-40 bg-muted rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-xl" />
          ))}
        </div>

        {/* Conta */}
        <div className="bg-muted/20 rounded-3xl p-4">
          <div className="h-10 bg-red-500/20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
