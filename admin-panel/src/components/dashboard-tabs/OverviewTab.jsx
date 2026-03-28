import { useState, useEffect, useMemo } from 'react'
import { Package, ShoppingCart, Eye, DollarSign, Tag, TrendingUp, Swords } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import KpiCard from '../ui/KpiCard'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG } from '../../config/api'

// Competition Score gauge component
function CompetitionGauge({ score }) {
  const radius = 60
  const circumference = Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 67 ? '#ef4444' : score >= 34 ? '#f59e0b' : '#22c55e'
  const label = score >= 67 ? 'Yoğun Rekabet' : score >= 34 ? 'Orta Rekabet' : 'Düşük Rekabet (Fırsat)'
  const bgColor = score >= 67 ? 'bg-red-50 text-red-700' : score >= 34 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="65" textAnchor="middle" className="text-2xl font-bold" fill="#1e293b">
          {Math.round(score)}
        </text>
      </svg>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${bgColor}`}>
        {label}
      </span>
    </div>
  )
}

export default function OverviewTab({
  overviewKPIs,
  topSellingProducts,
  topSellingBrands,
  topSellingCategories,
  mostViewedCategories,
  reportId,
  allProducts
}) {
  // Sales Funnel state
  const [salesData, setSalesData] = useState(null)
  const [salesLoading, setSalesLoading] = useState(false)

  // Fetch sales analytics
  useEffect(() => {
    if (!reportId) return
    setSalesLoading(true)
    fetchWithTimeout(
      `${API_URL}/api/reports/${reportId}/sales-analytics`,
      {},
      TIMEOUT_CONFIG.DASHBOARD
    )
      .then(res => {
        if (!res.ok) throw new Error('Sales data failed')
        return res.json()
      })
      .then(data => setSalesData(data))
      .catch(() => {}) // silently fail - optional feature
      .finally(() => setSalesLoading(false))
  }, [reportId])

  // Price Distribution histogram
  const priceDistribution = useMemo(() => {
    if (!allProducts?.length) return null

    const prices = allProducts.map(p => p.price || 0).filter(p => p > 0)
    if (prices.length === 0) return null

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const mean = prices.reduce((s, p) => s + p, 0) / prices.length
    const sortedPrices = [...prices].sort((a, b) => a - b)
    const median = sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)]

    // Use predefined price ranges for meaningful distribution
    const ranges = [
      [0, 50], [50, 100], [100, 200], [200, 500],
      [500, 1000], [1000, 2000], [2000, 5000], [5000, 10000], [10000, Infinity]
    ]

    // Filter out empty ranges and build buckets
    const buckets = ranges
      .map(([lo, hi]) => ({
        range: hi === Infinity ? `₺${lo.toLocaleString('tr-TR')}+` : `₺${lo.toLocaleString('tr-TR')}-${hi.toLocaleString('tr-TR')}`,
        min: lo,
        max: hi,
        count: prices.filter(p => p >= lo && (hi === Infinity ? true : p < hi)).length
      }))
      .filter(b => b.count > 0)

    return { buckets, mean: Math.round(mean), median: Math.round(median) }
  }, [allProducts])

  // Competition Score
  const competitionScore = useMemo(() => {
    if (!allProducts?.length) return null

    const products = allProducts
    const totalProducts = products.length
    const uniqueBrands = new Set(products.map(p => p.brand).filter(Boolean)).size

    // Brand diversity: unique_brands / total_products * 30
    const brandDiversity = Math.min(30, (uniqueBrands / totalProducts) * 30)

    // Price variance: std_dev / mean * 20
    const prices = products.map(p => p.price || 0).filter(p => p > 0)
    const meanPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0
    const variance = prices.length > 0
      ? prices.reduce((s, p) => s + Math.pow(p - meanPrice, 2), 0) / prices.length
      : 0
    const stdDev = Math.sqrt(variance)
    const priceVariance = meanPrice > 0 ? Math.min(20, (stdDev / meanPrice) * 20) : 0

    // Product density: log(total_products) * 10
    const productDensity = Math.min(10, Math.log10(Math.max(1, totalProducts)) * 10)

    // HHI inverse: (1 - HHI/10000) * 40
    const brandOrders = {}
    const totalOrders = products.reduce((s, p) => {
      const b = p.brand || 'Unknown'
      brandOrders[b] = (brandOrders[b] || 0) + (p.orders || 0)
      return s + (p.orders || 0)
    }, 0)

    let hhi = 0
    if (totalOrders > 0) {
      Object.values(brandOrders).forEach(orders => {
        const share = (orders / totalOrders) * 100
        hhi += share * share
      })
    }
    const hhiInverse = Math.max(0, (1 - hhi / 10000) * 40)

    const score = Math.min(100, Math.max(0, brandDiversity + priceVariance + productDensity + hhiInverse))

    return { score, brandDiversity, priceVariance, productDensity, hhiInverse, hhi: Math.round(hhi) }
  }, [allProducts])

  if (!overviewKPIs) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Genel bakış verileri yükleniyor...</p>
      </div>
    )
  }

  // Sales funnel data
  const funnelData = salesData ? [
    { name: 'Görüntüleme', value: salesData.total_views || salesData.totalViews || 0, color: '#6366f1' },
    { name: 'Sepet', value: salesData.total_baskets || salesData.totalBaskets || 0, color: '#f59e0b' },
    { name: 'Sipariş', value: salesData.total_orders || salesData.totalOrders || 0, color: '#22c55e' },
  ] : null

  const conversionRates = salesData ? {
    viewToBasket: salesData.view_to_basket_rate || salesData.viewToBasketRate || 0,
    basketToOrder: salesData.basket_to_order_rate || salesData.basketToOrderRate || 0,
    viewToOrder: salesData.view_to_order_rate || salesData.viewToOrderRate || 0,
  } : null

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Toplam Ürün"
          value={overviewKPIs.totalProducts.toLocaleString('tr-TR')}
          icon={Package}
          color="blue"
        />
        <KpiCard
          title={overviewKPIs.ordersLabel === 'baskets' ? 'Toplam Sepete Ekleme' : 'Toplam Satın Alma'}
          value={overviewKPIs.totalOrders.toLocaleString('tr-TR')}
          icon={ShoppingCart}
          color="emerald"
        />
        <KpiCard
          title="Toplam Görüntülenme"
          value={overviewKPIs.totalViews.toLocaleString('tr-TR')}
          icon={Eye}
          color="violet"
        />
        <KpiCard
          title={overviewKPIs.ordersLabel === 'baskets' ? 'Tahmini Ciro (Sepet)' : 'Toplam Ciro'}
          value={`₺${(overviewKPIs.totalRevenue || 0).toLocaleString('tr-TR')}`}
          icon={DollarSign}
          color="orange"
        />
        <KpiCard
          title="Ortalama Fiyat"
          value={`₺${overviewKPIs.avgPrice.toLocaleString('tr-TR')}`}
          icon={Tag}
          color="rose"
        />
      </div>

      {/* Competition Score */}
      {competitionScore && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Rekabet Skoru</h3>
            <CompetitionGauge score={competitionScore.score} />
            <p className="text-xs text-slate-400 mt-3 text-center">
              HHI: {competitionScore.hhi.toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Rekabet Bileşenleri</h3>
            <div className="space-y-3">
              {[
                { label: 'Marka Çeşitliliği', value: competitionScore.brandDiversity, max: 30, color: 'bg-blue-500' },
                { label: 'Fiyat Varyansı', value: competitionScore.priceVariance, max: 20, color: 'bg-amber-500' },
                { label: 'Ürün Yoğunluğu', value: competitionScore.productDensity, max: 10, color: 'bg-violet-500' },
                { label: 'HHI Ters (Dağılım)', value: competitionScore.hhiInverse, max: 40, color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">{item.label}</span>
                    <span className="text-xs font-medium text-slate-900">{item.value.toFixed(1)} / {item.max}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sales Funnel */}
      {funnelData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Satış Hunisi</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Bar Chart */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 12 }} width={90} />
                  <Tooltip
                    formatter={(value) => [value.toLocaleString('tr-TR'), '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Conversion Rates */}
            {conversionRates && (
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-sm text-slate-600 flex-1">Görüntüleme → Sepet</span>
                  <span className="text-sm font-bold text-indigo-600">
                    %{typeof conversionRates.viewToBasket === 'number' ? conversionRates.viewToBasket.toFixed(2) : conversionRates.viewToBasket}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-600 flex-1">Sepet → Sipariş</span>
                  <span className="text-sm font-bold text-amber-600">
                    %{typeof conversionRates.basketToOrder === 'number' ? conversionRates.basketToOrder.toFixed(2) : conversionRates.basketToOrder}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-600 flex-1">Görüntüleme → Sipariş</span>
                  <span className="text-sm font-bold text-emerald-600">
                    %{typeof conversionRates.viewToOrder === 'number' ? conversionRates.viewToOrder.toFixed(2) : conversionRates.viewToOrder}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Top Conversion Products */}
          {salesData?.top_conversion_products?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-medium text-slate-700 mb-3">En Yüksek Dönüşüm Oranı</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {salesData.top_conversion_products.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                    <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="truncate flex-1 text-slate-700">{p.name}</span>
                    <span className="font-medium text-emerald-600 shrink-0">%{(p.conversion_rate || 0).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Performance Products */}
          {salesData?.top_performance_products?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-medium text-slate-700 mb-3">En Yüksek Performans Skoru</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {salesData.top_performance_products.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                    <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="truncate flex-1 text-slate-700">{p.name}</span>
                    <span className="font-medium text-orange-600 shrink-0">{(p.performance_score || 0).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price Distribution */}
      {priceDistribution && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Fiyat Dağılımı</h3>
          <p className="text-xs text-slate-400 mb-4">
            Ort: ₺{priceDistribution.mean.toLocaleString('tr-TR')} · Medyan: ₺{priceDistribution.median.toLocaleString('tr-TR')}
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDistribution.buckets} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="range"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value} ürün`, 'Sayı']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <ReferenceLine
                  x={(priceDistribution.buckets.find(b => b.min <= priceDistribution.mean && (b.max === Infinity || b.max > priceDistribution.mean)) || {}).range}
                  stroke="#f97316"
                  strokeDasharray="5 5"
                  label={{ value: `Ort: ₺${priceDistribution.mean.toLocaleString('tr-TR')}`, fill: '#f97316', fontSize: 11, position: 'top' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#64748b', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Row 2: Top Products & Top Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Satış Yapan Ürünler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">En Çok Satış Yapan Ürünler</h3>
          <div className="space-y-3">
            {topSellingProducts.map((product, index) => (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-orange-50/30 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500">₺{product.price?.toLocaleString('tr-TR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{product.orders?.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-slate-500">satış</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* En Çok Satış Yapan Marka */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">En Çok Satış Yapan Marka</h3>
          <div className="space-y-3">
            {topSellingBrands.map((brand, index) => (
              <a
                key={index}
                href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-orange-50/30 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{brand.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{brand.totalOrders.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-slate-500">toplam satış</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Top Categories by Revenue & Most Viewed Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Satış Yapan Kategoriler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">En Çok Satış Yapan Kategoriler</h3>
          <div className="space-y-3">
            {topSellingCategories.map((category, index) => (
              <a
                key={index}
                href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-orange-50/30 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{category.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₺{category.revenue.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-slate-500">toplam ciro</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* En Çok Görüntülenme Alan Kategoriler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">En Çok Görüntülenme Alan Kategoriler</h3>
          <div className="space-y-3">
            {mostViewedCategories.map((category, index) => (
              <a
                key={index}
                href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-orange-50/30 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{category.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{category.views.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-slate-500">görüntülenme</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
