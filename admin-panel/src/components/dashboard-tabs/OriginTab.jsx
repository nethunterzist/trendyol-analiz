import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter } from 'recharts'

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
        <p className="text-gray-500">Menşei analizi yükleniyor...</p>
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
        {/* Card 1: Toplam Ülke Sayısı */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Toplam Ülke Sayısı</p>
              <p className="text-3xl font-bold mt-2">{countries?.length || 0}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Yerli Ürün Payı */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Yerli Ürün Payı</p>
              <p className="text-3xl font-bold mt-2">{kpis?.domesticPercentage || 0}%</p>
              <p className="text-green-100 text-xs mt-1">{(domesticData?.count || 0).toLocaleString('tr-TR')} ürün</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: İthal Ürün Payı */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">İthal Ürün Payı</p>
              <p className="text-3xl font-bold mt-2">{kpis?.importPercentage || 0}%</p>
              <p className="text-purple-100 text-xs mt-1">{(importData?.count || 0).toLocaleString('tr-TR')} ürün</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Toplam Satış */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Toplam Satış</p>
              <p className="text-3xl font-bold mt-2">{(totalOrders || 0).toLocaleString('tr-TR')}</p>
              <p className="text-orange-100 text-xs mt-1">Tüm ülkeler</p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Kategori-Ülke Isı Haritası (Top 10x10) - Full Width */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Kategori-Ülke Isı Haritası (Top 10x10)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 p-2 text-left font-semibold text-gray-700 sticky left-0 z-10">Kategori</th>
                {topCountriesForHeatmap.map(country => (
                  <th key={country} className="border border-gray-200 bg-gray-50 p-2 text-center font-semibold text-gray-700 min-w-[100px]">
                    {country}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCategories.map(category => (
                <tr key={category}>
                  <td className="border border-gray-200 p-2 font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">{category}</td>
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
                      <td key={country} className={`border border-gray-200 p-2 text-center ${bgColor}`}>
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          En Çok Satan Ülkeler (Top 20)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column: Countries 1-10 */}
          <div className="space-y-2">
            {(topByOrders || []).slice(0, 10).map((item, index) => (
              <div key={item.country} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg hover:from-blue-100 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-gray-800">{item.country}</span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">Satış:</span> {item.totalOrders.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">Ciro:</span> ₺{item.totalRevenue.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Countries 11-20 */}
          <div className="space-y-2">
            {(topByOrders || []).slice(10, 20).map((item, index) => (
              <div key={item.country} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-lg hover:from-purple-100 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold text-sm">
                    {index + 11}
                  </span>
                  <span className="font-semibold text-gray-800">{item.country}</span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">Satış:</span> {item.totalOrders.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-900">
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
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
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value) => value.toLocaleString('tr-TR')}
              />
              <Bar dataKey="totalOrders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Ortalama Fiyat / Ciro İlişkisi (Scatter Chart) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
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
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="font-semibold text-gray-900 mb-2 text-sm">{data.name}</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          Ciro: ₺{data.totalRevenue.toLocaleString('tr-TR')}
                        </p>
                        <p className="font-semibold text-gray-900 text-sm">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detaylı Ülke Karşılaştırma</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-2 border-gray-200 bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('country')}
                >
                  Ülke{renderSortIndicator('country')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('count')}
                >
                  Ürün{renderSortIndicator('count')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('totalOrders')}
                >
                  Satış{renderSortIndicator('totalOrders')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('totalRevenue')}
                >
                  Ciro{renderSortIndicator('totalRevenue')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pay %</th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('avgPrice')}
                >
                  Ort. Fiyat{renderSortIndicator('avgPrice')}
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('categoryCount')}
                >
                  Kategori{renderSortIndicator('categoryCount')}
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('brandCount')}
                >
                  Marka{renderSortIndicator('brandCount')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {getSortedData().map((item) => (
                <tr key={item.country} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {item.country}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {item.count.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {item.totalOrders.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    ₺{item.totalRevenue.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                      {((item.totalOrders / totalOrders) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    ₺{item.avgPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">{item.categoryCount || 0}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">{item.brandCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
