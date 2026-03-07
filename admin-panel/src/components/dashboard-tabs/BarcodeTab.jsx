import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter } from 'recharts'
import KpiCard from '../ui/KpiCard'
import { Barcode, Globe, Flag, Award } from 'lucide-react'
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../../constants/chartColors'

export default function BarcodeTab({ barcodeAnalytics }) {
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
    if (!sortConfig.key || !sortConfig.direction) {
      return barcodeAnalytics.topByOrders
    }

    const sortedData = [...barcodeAnalytics.topByOrders]
    sortedData.sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      // Handle string comparison for name
      if (sortConfig.key === 'name') {
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

  if (!barcodeAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Barkod analizi yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products with Barcode */}
        <KpiCard
          title="Barkodlu Ürün"
          value={barcodeAnalytics.kpis.totalWithBarcode.toLocaleString('tr-TR')}
          icon={Barcode}
          color="blue"
        />

        {/* Total Countries */}
        <KpiCard
          title="Tespit Edilen Ülke"
          value={barcodeAnalytics.kpis.totalCountries}
          subtitle={barcodeAnalytics.kpis.undetectedProducts > 0 ? `${barcodeAnalytics.kpis.undetectedProducts.toLocaleString('tr-TR')} tespit edilemedi` : undefined}
          icon={Globe}
          color="emerald"
        />

        {/* Domestic Share */}
        <KpiCard
          title="Yerli Ürün Payı"
          value={`${barcodeAnalytics.kpis.domesticShare}%`}
          subtitle="Türkiye menşeili"
          icon={Flag}
          color="violet"
        />

        {/* Top Country */}
        <KpiCard
          title="En Çok Ürün"
          value={barcodeAnalytics.kpis.topCountry}
          subtitle={`${barcodeAnalytics.kpis.topCountryShare.toFixed(1)}% pay`}
          icon={Award}
          color="orange"
        />
      </div>

      {/* Row 2: Category-Country Heatmap - FULL WIDTH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Kategori-Ülke Isı Haritası (Top 10x10)</h3>
        <p className="text-xs text-slate-400 mb-4">Hangi ülkelerin hangi kategorilerde güçlü olduğunu gösterir. Koyu renkler daha yüksek satış hacmini temsil eder.</p>

        {barcodeAnalytics.categoryCountryMatrix && barcodeAnalytics.categoryCountryMatrix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-200 px-2 py-2 bg-slate-50 text-xs font-medium text-slate-700 sticky left-0 z-10">
                    Kategori / Ülke
                  </th>
                  {barcodeAnalytics.topCountriesForHeatmap.map((country) => (
                    <th
                      key={country.name}
                      className="border border-slate-200 px-2 py-2 bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
                      style={{ minWidth: '80px' }}
                    >
                      {country.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {barcodeAnalytics.topCategories.map((category) => (
                  <tr key={category}>
                    <td className="border border-slate-200 px-2 py-2 text-xs font-medium text-slate-900 bg-slate-50 sticky left-0 z-10 whitespace-nowrap">
                      {category}
                    </td>
                    {barcodeAnalytics.topCountriesForHeatmap.map((country) => {
                      const cell = barcodeAnalytics.categoryCountryMatrix.find(
                        (c) => c.category === category && c.country === country.name
                      )

                      if (!cell) {
                        return (
                          <td key={country.name} className="border border-slate-200 px-2 py-2 bg-slate-50">
                            <div className="text-center text-xs text-slate-400">-</div>
                          </td>
                        )
                      }

                      const maxOrders = Math.max(...barcodeAnalytics.categoryCountryMatrix.map(c => c.orders))
                      const intensity = cell.orders / maxOrders

                      const getColor = (intensity) => {
                        if (intensity > 0.7) return 'bg-blue-600 text-white'
                        if (intensity > 0.5) return 'bg-blue-500 text-white'
                        if (intensity > 0.3) return 'bg-blue-400 text-white'
                        if (intensity > 0.15) return 'bg-blue-300 text-slate-900'
                        return 'bg-blue-100 text-slate-900'
                      }

                      return (
                        <td key={country.name} className="border border-slate-200 p-0">
                          <div
                            className={`px-2 py-2 ${getColor(intensity)} text-center cursor-help transition-all hover:scale-105`}
                            title={`${category} - ${country.name}\nSatış: ${cell.orders.toLocaleString('tr-TR')}\nCiro: ₺${cell.revenue.toLocaleString('tr-TR')}\nÜrün: ${cell.productCount}\nOrt: ${cell.avgOrdersPerProduct} satış/ürün`}
                          >
                            <div className="text-xs font-semibold">Satış: {cell.orders.toLocaleString('tr-TR')}</div>
                            <div className="text-[10px] opacity-80">Ürün: {cell.productCount}</div>
                            <div className="text-[10px] opacity-80">Ciro: ₺{(cell.revenue / 1000).toFixed(0)}K</div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-end gap-2 text-xs">
              <span className="text-slate-500">Düşük</span>
              <div className="flex gap-1">
                <div className="w-6 h-4 bg-blue-100 border border-slate-300"></div>
                <div className="w-6 h-4 bg-blue-300 border border-slate-300"></div>
                <div className="w-6 h-4 bg-blue-400 border border-slate-300"></div>
                <div className="w-6 h-4 bg-blue-500 border border-slate-300"></div>
                <div className="w-6 h-4 bg-blue-600 border border-slate-300"></div>
              </div>
              <span className="text-slate-500">Yüksek</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <p className="text-slate-400 text-sm">Veri yükleniyor...</p>
          </div>
        )}
      </div>

      {/* Row 3: Top 20 Countries - FULL WIDTH with 10x10 Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          En Çok Satan Ülkeler (Top 20)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column: Countries 1-10 */}
          <div className="space-y-2">
            {barcodeAnalytics.topByOrders.slice(0, 10).map((country, index) => (
              <div key={country.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-orange-50/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{country.name}</span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Satış:</span> {country.totalOrders.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Ciro:</span> ₺{country.totalRevenue.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Countries 11-20 */}
          <div className="space-y-2">
            {barcodeAnalytics.topByOrders.slice(10, 20).map((country, index) => (
              <div key={country.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-orange-50/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold text-sm">
                    {index + 11}
                  </span>
                  <span className="font-semibold text-slate-800">{country.name}</span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Satış:</span> {country.totalOrders.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Ciro:</span> ₺{country.totalRevenue.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Charts - 50/50 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Sales Bar Chart (Top 15) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Ülke Bazlı Satış (Top 15)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barcodeAnalytics.topByOrders.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => value.toLocaleString('tr-TR')}
                {...CHART_TOOLTIP_STYLE}
              />
              <Bar dataKey="totalOrders" fill={CHART_COLORS[0]} name="Satış Adedi" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price vs Revenue Scatter Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Ortalama Fiyat / Ciro İlişkisi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="avgPrice"
                name="Ort. Fiyat"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₺${value}`}
              />
              <YAxis
                type="number"
                dataKey="totalRevenue"
                name="Ciro"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₺${(value / 1000000).toFixed(1)}M`}
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
                data={barcodeAnalytics.countries.filter(c => c.totalRevenue > 0)}
                fill={CHART_COLORS[3]}
                name="Ülkeler"
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Her nokta bir ülkeyi temsil eder (Ortalama fiyat vs Toplam ciro)
          </p>
        </div>
      </div>

      {/* Row 5: Detailed Country Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Detaylı Ülke Karşılaştırması</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-2 border-slate-200 bg-slate-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Ülke{renderSortIndicator('name')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('productCount')}
                >
                  Ürün{renderSortIndicator('productCount')}
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
                <th
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => handleSort('marketShare')}
                >
                  Pay %{renderSortIndicator('marketShare')}
                </th>
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
              {getSortedData().map((country) => (
                <tr key={country.name} className="hover:bg-orange-50/30">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{country.name}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">{country.productCount}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{country.totalOrders.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">₺{country.totalRevenue.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                      {country.marketShare.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">₺{country.avgPrice.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">{country.categoryCount}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">{country.brandCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
