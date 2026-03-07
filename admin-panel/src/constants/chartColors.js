// Trendyol Analytics - Chart Color Palette
// Consistent 8-color palette for all chart visualizations

export const CHART_COLORS = [
  '#f97316', // orange-500 (primary)
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f43f5e', // rose-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
]

// Extended palette for larger datasets
export const CHART_COLORS_EXTENDED = [
  ...CHART_COLORS,
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
]

// Semantic colors for specific use cases
export const STATUS_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
}

// Styled tooltip for Recharts
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1e293b', // slate-800
    border: 'none',
    borderRadius: '0.75rem',
    padding: '12px 16px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  labelStyle: {
    color: '#f8fafc', // slate-50
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: '#e2e8f0', // slate-200
    fontSize: '13px',
  },
}
