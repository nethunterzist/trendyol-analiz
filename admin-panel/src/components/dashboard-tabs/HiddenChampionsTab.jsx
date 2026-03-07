import { useState, useMemo } from 'react'
import { Trophy, Star, TrendingUp, Filter, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import KpiCard from '../ui/KpiCard'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG } from '../../config/api'

export default function HiddenChampionsTab({ reportId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Filters
  const [minRating, setMinRating] = useState(4.0)
  const [maxReview, setMaxReview] = useState(100)
  const [minOrders, setMinOrders] = useState(5)
  const [sortKey, setSortKey] = useState('performance_score')
  const [sortDir, setSortDir] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch data on first render
  useState(() => {
    if (!loaded && reportId) {
      setLoading(true)
      fetchWithTimeout(
        `${API_URL}/api/reports/${reportId}/hidden-champions`,
        {},
        TIMEOUT_CONFIG.DASHBOARD
      )
        .then(res => {
          if (!res.ok) throw new Error('Gizli şampiyonlar yüklenemedi')
          return res.json()
        })
        .then(result => {
          setData(result)
          setLoaded(true)
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  })

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    if (!data?.products) return []

    return data.products
      .filter(p => {
        const rating = p.rating || 0
        const reviewCount = p.review_count || p.reviewCount || 0
        const orders = p.orders || 0
        return rating >= minRating && reviewCount <= maxReview && orders >= minOrders
      })
      .sort((a, b) => {
        const aVal = a[sortKey] || 0
        const bVal = b[sortKey] || 0
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal
      })
  }, [data, minRating, maxReview, minOrders, sortKey, sortDir])

  // KPIs
  const kpis = useMemo(() => {
    if (!filteredProducts.length) return { count: 0, avgRating: 0, avgPrice: 0 }
    const count = filteredProducts.length
    const avgRating = (filteredProducts.reduce((s, p) => s + (p.rating || 0), 0) / count).toFixed(1)
    const avgPrice = Math.round(filteredProducts.reduce((s, p) => s + (p.price || 0), 0) / count)
    return { count, avgRating, avgPrice }
  }, [filteredProducts])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <ChevronDown size={14} className="text-slate-300" />
    return sortDir === 'desc'
      ? <ChevronDown size={14} className="text-orange-500" />
      : <ChevronUp size={14} className="text-orange-500" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Gizli şampiyonlar analiz ediliyor...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Gizli Şampiyon"
          value={kpis.count}
          icon={Trophy}
          color="amber"
        />
        <KpiCard
          title="Ortalama Rating"
          value={kpis.avgRating}
          icon={Star}
          color="emerald"
        />
        <KpiCard
          title="Ortalama Fiyat"
          value={`₺${kpis.avgPrice.toLocaleString('tr-TR')}`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Filtreler</span>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="px-6 pb-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={minRating}
                  onChange={e => setMinRating(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max Yorum Sayısı</label>
                <input
                  type="number"
                  min="0"
                  value={maxReview}
                  onChange={e => setMaxReview(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min Sipariş</label>
                <input
                  type="number"
                  min="0"
                  value={minOrders}
                  onChange={e => setMinOrders(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Gizli Şampiyonlar</h3>
          <p className="text-xs text-slate-400 mt-1">
            Yüksek rating, düşük yorum sayısı ancak iyi satış performansı gösteren ürünler
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-500">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Ürün</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Marka</th>
                <th
                  className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('rating')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Rating <SortIcon column="rating" />
                  </div>
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('review_count')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Yorum <SortIcon column="review_count" />
                  </div>
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Fiyat <SortIcon column="price" />
                  </div>
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('orders')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Sipariş <SortIcon column="orders" />
                  </div>
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('performance_score')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Skor <SortIcon column="performance_score" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Filtrelere uygun ürün bulunamadı
                  </td>
                </tr>
              ) : (
                filteredProducts.slice(0, 50).map((product, index) => (
                  <tr key={product.id || index} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 max-w-xs">
                        {product.image_url && (
                          <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-orange-500 hover:underline inline-flex items-center gap-0.5"
                            >
                              Görüntüle <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{product.brand || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {(product.rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {(product.review_count || product.reviewCount || 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      ₺{(product.price || 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {(product.orders || 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        (product.performance_score || 0) >= 70
                          ? 'bg-emerald-100 text-emerald-700'
                          : (product.performance_score || 0) >= 40
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(product.performance_score || 0).toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 50 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              {filteredProducts.length} üründen ilk 50 tanesi gösteriliyor
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
