// Reusable skeleton loading components

function SkeletonBox({ className = '' }) {
  return <div className={`skeleton bg-slate-200 ${className}`} />
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-10 w-10 rounded-lg" />
          </div>
          <SkeletonBox className="h-8 w-20 mb-2" />
          <SkeletonBox className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-slate-100">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 p-4 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonBox key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <SkeletonBox className="h-5 w-40 mb-6" />
      <div className="flex items-end gap-2 h-48">
        {[60, 80, 45, 90, 70, 55, 85, 65].map((h, i) => (
          <SkeletonBox key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 border border-slate-200">
          <SkeletonBox className="h-5 w-3/4 mb-3" />
          <SkeletonBox className="h-4 w-1/2 mb-4" />
          <SkeletonBox className="h-3 w-full mb-2" />
          <SkeletonBox className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <KpiSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton />
    </div>
  )
}
