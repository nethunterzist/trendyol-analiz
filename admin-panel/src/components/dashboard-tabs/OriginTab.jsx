import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter } from 'recharts'
import KpiCard from '../ui/KpiCard'
import { Globe, Flag, Ship, ShoppingBag } from 'lucide-react'
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../../constants/chartColors'

export default function OriginTab({ originAnalytics }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null })

  // Handle column sorting
  const handleSort = (columnKey) => {
    let direction = 'asc'
    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }
    setSortConfig({ key: columnKey, direction })
  }

  // Get sorted data
  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction || !countries) {
      return countries || []
    }

    const sortedData = [...countries]
    sortedData.sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      // Handle string comparison for country
      if (sortConfig.key === 'country') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
        if (sortConfig.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      }

      // Handle numeric comparison
      if (sortConfig.direction === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
    return sortedData
  }

  // Render sort indicator
  const renderSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return null
    }
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
  }

  // 🔍 DEBUG: Log incoming props
  console.log('📥 [ORIGINTAB] Received originAnalytics:', originAnalytics)
  console.log('🔍 [ORIGINTAB] originAnalytics is null/undefined?', !originAnalytics)

  if (!originAnalytics) {
    console.warn('⚠️ [ORIGINTAB] No originAnalytics data - showing loading state')
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Menşei analizi yükleniyor...</p>
      </div>
    )
  }

  const {
    countries = [],
    topByOrders = [],
    topByRevenue = [],
    domesticData = { count: 0, productCount: 0, totalOrders: 0, totalRevenue: 0, avgPrice: 0 },
    importData = { count: 0, productCount: 0, totalOrders: 0, totalRevenue: 0, avgPrice: 0 },
    kpis = { domesticPercentage: 0, importPercentage: 0 },
    totalOrders = 0,
    categoryCountryMatrix = {},
    topCategories = [],
    topCountriesForHeatmap = []
  } = originAnalytics || {}

  // 🔍 DEBUG: Log destructured data
  console.log('📊 [ORIGINTAB] Destructured data:', {
    'countries.length': countries?.length,
    'topByOrders.length': topByOrders?.length,
    'topByRevenue.length': topByRevenue?.length,
    'totalOrders': totalOrders,
    'kpis': kpis
  })
  console.log('🔍 [ORIGINTAB] First country object:', countries[0])
  console.log('🔍 [ORIGINTAB] Field check on countries[0]:', {
    'has country': countries[0] ? 'country' in countries[0] : 'N/A',
    'has name': countries[0] ? 'name' in countries[0] : 'N/A',
    'has count': countries[0] ? 'count' in countries[0] : 'N/A',
    'has productCount': countries[0] ? 'productCount' in countries[0] : 'N/A',
    'country value': countries[0]?.country,
    'name value': countries[0]?.name,
    'count value': countries[0]?.count,
    'productCount value': countries[0]?.productCount
  })

  // 🚨 CRITICAL DEBUG: Check totalOrders calculation
  console.log('🚨 [ORIGINTAB] TOTAL ORDERS DEBUG:', {
    'totalOrders from prop': totalOrders,
    'totalOrders type': typeof totalOrders,
    'countries.length': countries?.length,
    'First country totalOrders': countries?.[0]?.totalOrders,
    'Sum check': countries?.reduce((sum, c) => sum + (c.totalOrders || 0), 0)
  })

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards - 4 cards in a grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Toplam Ülke Sayısı"
          value={countries?.length || 0}
          icon={Globe}
          color="blue"
        />
        <KpiCard
          title="Yerli Ürün Payı"
          value={`${kpis?.domesticPercentage || 0}%`}
          subtitle={`${(domesticData?.count || 0).toLocaleString('tr-TR')} ürün`}
          icon={Flag}
          color="emerald"
        />
        <KpiCard
          title="İthal Ürün Payı"
          value={`${kpis?.importPercentage || 0}%`}
          subtitle={`${(importData?.count || 0).toLocaleString('tr-TR')} ürün`}
          icon={Ship}
          color="violet"
        />
        <KpiCard
          title="Toplam Satış"
          value={(totalOrders || 0).toLocaleString('tr-TR')}
          subtitle="Tüm ülkeler"
          icon={ShoppingBag}
          color="orange"
        />
      </div>

      {/* Row 2: Kategori-Ülke Isı Haritası (Top 10x10) - Full Width */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Kategori-Ülke Isı Haritası (Top 10x10)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-50 p-2 text-left font-semibold text-slate-700 sticky left-0 z-10">Kategori</th>
                {topCountriesForHeatmap.map(country => (
                  <th key={country} className="border border-slate-200 bg-slate-50 p-2 text-center font-semibold text-slate-700 min-w-[100px]">
                    {country}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCategories.map(category => (
                <tr key={category}>
                  <td className="border border-slate-200 p-2 font-medium text-slate-700 bg-slate-50 sticky left-0 z-10">{category}</td>
                  {topCountriesForHeatmap.map(country => {
                    const cellData = categoryCountryMatrix[category]?.[country]
                    const count = cellData?.count || 0
                    const revenue = cellData?.revenue || 0
                    const orders = cellData?.orders || 0
                    const maxCount = Math.max(...Object.values(categoryCountryMatrix).flatMap(c => Object.values(c).map(v => v.count)))
                    const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0

                    let bgColor = 'bg-white'
                    if (intensity > 75) bgColor = 'bg-blue-600 text-white'
                    else if (intensity > 50) bgColor = 'bg-blue-500 text-white'
                    else if (intensity > 25) bgColor = 'bg-blue-300'
                    else if (intensity > 10) bgColor = 'bg-blue-100'
                    else if (count > 0) bgColor = 'bg-blue-50'

                    return (
                      <td key={country} className={`border border-slate-200 p-2 text-center ${bgColor}`}>
                        {count > 0 ? (
                          <div>
                            <div className="text-xs font-semibold">Satış: {orders.toLocaleString('tr-TR')}</div>
                            <div className="text-[10px] opacity-80">Ürün: {count}</div>
                            <div className="text-[10px] opacity-80">Ciro: ₺{revenue >= 1000 ? `${(revenue / 1000).toFixed(0)}K` : revenue.toFixed(0)}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: En Çok Satan Ülkeler (Top 20) - Full Width, 10x10 Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          En Çok Satan Ülkeler (Top 20)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column: Countries 1-10 */}
          <div className="space-y-2">
            {(topByOrders || []).slice(0, 10).map((item, index) => (
              <div key={item.country} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-orange-50/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{item.country}</span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Satış:</span> {item.totalOrders.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Ciro:</span> ₺{item.totalRevenue.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Countries 11-20 */}
          <div className="space-y-2">
            {(topByOrders || []).slice(10, 20).map((item, index) => (
              <div key={item.country} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-xl hover:from-purple-100 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold text-sm">
                    {index + 11}
                  </span>
                  <span className="font-semibold text-slate-800">{item.country}</span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Satış:</span> {item.totalOrders.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Ciro:</span> ₺{item.totalRevenue.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Two Charts Side by Side (50%-50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Ülke Bazlı Satış (Bar Chart) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Ülke Bazlı Satış (Top 15)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={(topByOrders || []).slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="country"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value) => value.toLocaleString('tr-TR')}
              />
              <Bar dataKey="totalOrders" fill={CHART_COLORS[0]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Ortalama Fiyat / Ciro İlişkisi (Scatter Chart) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Ciro / Satış İlişkisi (Top 15)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="totalRevenue"
                name="Toplam Ciro"
                tick={{ fontSize: 11 }}
                label={{ value: 'Toplam Ciro (₺)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}K`}
              />
              <YAxis
                type="number"
                dataKey="totalOrders"
                name="Satış"
                tick={{ fontSize: 11 }}
                label={{ value: 'Satış Adedi', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-slate-800 border-none rounded-xl shadow-lg p-3">
                        <p className="font-semibold text-slate-50 mb-2 text-sm">{data.name}</p>
                        <p className="font-semibold text-slate-200 text-sm">
                          Ciro: ₺{data.totalRevenue.toLocaleString('tr-TR')}
                        </p>
                        <p className="font-semibold text-slate-200 text-sm">
                          Satış: {data.totalOrders.toLocaleString('tr-TR')}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter
                data={(topByRevenue || []).slice(0, 15).map(item => ({
                  ...item,
                  name: item.country
                }))}
                fill="#8b5cf6"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5: Detaylı Ülke Karşılaştırma Tablosu */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Detaylı Ülke Karşılaştırma</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-2 border-slate-200 bg-slate-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('country')}
                >
                  Ülke{renderSortIndicator('country')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('count')}
                >
                  Ürün{renderSortIndicator('count')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('totalOrders')}
                >
                  Satış{renderSortIndicator('totalOrders')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('totalRevenue')}
                >
                  Ciro{renderSortIndicator('totalRevenue')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Pay %</th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('avgPrice')}
                >
                  Ort. Fiyat{renderSortIndicator('avgPrice')}
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('categoryCount')}
                >
                  Kategori{renderSortIndicator('categoryCount')}
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('brandCount')}
                >
                  Marka{renderSortIndicator('brandCount')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {getSortedData().map((item) => (
                <tr key={item.country} className="hover:bg-orange-50/30">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {item.country}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900">
                    {item.count.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    {item.totalOrders.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    ₺{item.totalRevenue.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                      {((item.totalOrders / totalOrders) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    ₺{item.avgPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">{item.categoryCount || 0}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">{item.brandCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
