export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen p-4 pb-24 space-y-6 pt-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-muted rounded-lg" />
          <div className="h-3 w-28 bg-muted/60 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="h-10 w-10 rounded-full bg-muted" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-muted rounded-full" />
        <div className="h-8 w-24 bg-muted rounded-full" />
        <div className="h-8 w-24 bg-muted rounded-full" />
      </div>

      {/* Main card */}
      <div className="h-36 bg-muted rounded-3xl" />

      {/* Grid cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-muted/60 rounded-2xl" />
        <div className="h-20 bg-muted/60 rounded-2xl" />
      </div>

      {/* Chart */}
      <div className="h-48 bg-muted/60 rounded-2xl" />

      {/* Transactions */}
      <div className="space-y-3">
        <div className="h-4 w-20 bg-muted/60 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/40 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
