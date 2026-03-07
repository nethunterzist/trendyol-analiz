// Reusable KPI card component - flat white design with colored icon

export default function KpiCard({ title, value, subtitle, icon: Icon, color = 'orange' }) {
  const colorMap = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-500', border: 'border-violet-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-500', border: 'border-cyan-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' },
  }

  const c = colorMap[color] || colorMap.orange

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center`}>
            <Icon size={20} className={c.text} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}
