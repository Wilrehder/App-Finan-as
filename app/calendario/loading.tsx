export default function CalendarioLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 animate-pulse">
      {/* Header */}
      <div className="pt-12 px-5 pb-2">
        <div className="h-10 w-20 bg-muted rounded-xl" />
      </div>

      {/* Year grid skeleton */}
      <div className="px-5 grid grid-cols-3 gap-x-4 gap-y-8 mt-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="space-y-1 mt-2">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-2 bg-muted/40 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
