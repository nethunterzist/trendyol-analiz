import { useState, useMemo, useEffect } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import KpiCard from '../ui/KpiCard'
import { Tag, Trophy, Package, PieChart as PieChartIcon } from 'lucide-react'
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../../constants/chartColors'

export default function BrandTab({ brandAnalytics, sortedBrands, handleBrandSort, brandSortConfig }) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Paginated brands
  const paginatedBrands = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedBrands.slice(startIndex, endIndex)
  }, [sortedBrands, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedBrands.length / itemsPerPage)

  // Reset to first page when sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [brandSortConfig])

  if (!brandAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Brand analizi yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Toplam Marka"
          value={brandAnalytics.kpis.totalBrands.toLocaleString('tr-TR')}
          subtitle="Benzersiz marka sayısı"
          icon={Tag}
          color="blue"
        />
        <KpiCard
          title="Lider Marka Payı"
          value={`%${brandAnalytics.kpis.leaderShare}`}
          subtitle={brandAnalytics.topByOrders[0]?.name}
          icon={Trophy}
          color="emerald"
        />
        <KpiCard
          title="Ort. Marka Başına Ürün"
          value={brandAnalytics.kpis.avgProductsPerBrand}
          subtitle="Ürün çeşitliliği"
          icon={Package}
          color="violet"
        />
        <KpiCard
          title="Pazar Yoğunlaşması"
          value={brandAnalytics.kpis.hhi}
          subtitle={`${brandAnalytics.kpis.marketConcentration} (HHI)`}
          icon={PieChartIcon}
          color="orange"
        />
      </div>

  {/* Row 2: Top 20 Brands Full-Width Two-Column Table */}
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">En Çok Satan Markalar (Top 20)</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Brands 1-10 */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Marka</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Satış</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Ciro</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Pay %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {brandAnalytics.topByOrders.slice(0, 10).map((brand, index) => {
              const marketShare = ((brand.totalOrders / brandAnalytics.totalOrders) * 100).toFixed(1)
              return (
                <tr key={brand.name} className="hover:bg-orange-50/30 even:bg-slate-50/50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{index + 1}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-orange-500 hover:text-orange-600 hover:underline"
                    >
                      {brand.name}
                    </a>
                    <p className="text-xs text-slate-400">{brand.productCount} ürün</p>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-slate-900">
                    {brand.totalOrders.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-slate-900">
                    ₺{Math.round(brand.totalRevenue).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-green-600">
                    {marketShare}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Right Column - Brands 11-20 */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Marka</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Satış</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Ciro</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Pay %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {brandAnalytics.topByOrders.slice(10, 20).map((brand, index) => {
              const marketShare = ((brand.totalOrders / brandAnalytics.totalOrders) * 100).toFixed(1)
              return (
                <tr key={brand.name} className="hover:bg-orange-50/30 even:bg-slate-50/50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{index + 11}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-orange-500 hover:text-orange-600 hover:underline"
                    >
                      {brand.name}
                    </a>
                    <p className="text-xs text-slate-400">{brand.productCount} ürün</p>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-slate-900">
                    {brand.totalOrders.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-slate-900">
                    ₺{Math.round(brand.totalRevenue).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-green-600">
                    {marketShare}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  {/* Row 3: Market Share Chart & Price/Performance Matrix */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Market Share Pie Chart */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Pazar Payı Dağılımı</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={brandAnalytics.topByOrders.slice(0, 5).map(brand => ({
              name: brand.name,
              value: brand.totalOrders
            })).concat([{
              name: 'Diğerleri',
              value: brandAnalytics.totalOrders - brandAnalytics.topByOrders.slice(0, 5).reduce((sum, b) => sum + b.totalOrders, 0)
            }])}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {CHART_COLORS.slice(0, 6).map((color, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString('tr-TR')} {...CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-700">
          Top 3 marka pazarın <span className="font-bold text-orange-500">%{brandAnalytics.kpis.top3Share}</span>'ini kontrol ediyor
        </p>
      </div>
    </div>

    {/* Price/Quality Scatter Plot */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Fiyat/Performans Matrisi</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="avgPrice"
            name="Ortalama Fiyat"
            label={{ value: 'Ortalama Fiyat (₺)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="totalOrders"
            name="Toplam Satış"
            label={{ value: 'Toplam Satış', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis type="number" dataKey="socialScore" range={[50, 400]} name="Sosyal Skor" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">Fiyat: ₺{data.avgPrice.toLocaleString('tr-TR')}</p>
                    <p className="text-sm">Satış: {data.totalOrders.toLocaleString('tr-TR')}</p>
                    <p className="text-sm">Sosyal Skor: {data.socialScore}/100</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter
            data={brandAnalytics.topByOrders.slice(0, 15)}
            fill={CHART_COLORS[0]}
            opacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Kabarcık boyutu: Sosyal kanıt skoru (görüntülenme + satış + ürün çeşitliliği)
      </p>
    </div>
  </div>

  {/* Row 4: Detailed Brand Comparison Table */}
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Detaylı Marka Karşılaştırması</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-slate-50">
          <tr>
            <th
              onClick={() => handleBrandSort('name')}
              className="px-4 py-3 text-left text-xs font-medium text-slate-400 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center gap-1">
                Marka
                {brandSortConfig.key === 'name' && (
                  <span className="text-slate-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('totalOrders')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Satış
                {brandSortConfig.key === 'totalOrders' && (
                  <span className="text-slate-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('totalRevenue')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ciro
                {brandSortConfig.key === 'totalRevenue' && (
                  <span className="text-slate-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('productCount')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ürün Sayısı
                {brandSortConfig.key === 'productCount' && (
                  <span className="text-slate-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('categoryCount')}
              className="px-4 py-3 text-center text-xs font-medium text-slate-400 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center justify-center gap-1">
                Kategori Çeşitliliği
                {brandSortConfig.key === 'categoryCount' && (
                  <span className="text-slate-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('avgPrice')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ort. Fiyat
                {brandSortConfig.key === 'avgPrice' && (
                  <span className="text-slate-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Fiyat Aralığı</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Segment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {paginatedBrands.map(brand => (
            <tr key={brand.name} className="hover:bg-orange-50/30 even:bg-slate-50/50">
              <td className="px-4 py-3">
                <a
                  href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-500 hover:text-orange-600 hover:underline"
                >
                  {brand.name}
                </a>
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                {brand.totalOrders.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                ₺{brand.totalRevenue.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-900">
                {brand.productCount}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full">
                  <span className="text-sm font-semibold text-indigo-700">{brand.categoryCount}</span>
                  <span className="text-xs text-indigo-600">kategori</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-900">
                ₺{brand.avgPrice.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-xs text-slate-500">
                {brand.minPrice !== brand.maxPrice
                  ? `₺${brand.minPrice.toLocaleString('tr-TR')} - ₺${brand.maxPrice.toLocaleString('tr-TR')}`
                  : `₺${brand.minPrice.toLocaleString('tr-TR')}`
                }
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  brand.priceSegment === 'Premium'
                    ? 'bg-purple-100 text-purple-800'
                    : brand.priceSegment === 'Orta Segment'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {brand.priceSegment}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Sayfa {currentPage} / {totalPages} (Toplam {sortedBrands.length.toLocaleString('tr-TR')} marka)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Önceki
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-sm border rounded-xl transition-colors ${
                      currentPage === pageNum
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-slate-300 hover:bg-orange-50/30'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Row 5: Market Insights */}
  <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">
      Pazar İçgörüleri
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Lider Marka Dominansı</p>
        <p className="text-lg font-bold text-orange-500 mt-1">
          {brandAnalytics.topByOrders[0]?.name} pazarın %{brandAnalytics.kpis.leaderShare}'ini kontrol ediyor
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Segment Analizi</p>
        <p className="text-lg font-bold text-purple-600 mt-1">
          {Object.entries(brandAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][0]}
          {' '}segment en kalabalık ({Object.entries(brandAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][1].length} marka)
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Pazar Yapısı</p>
        <p className="text-lg font-bold text-green-600 mt-1">
          {brandAnalytics.kpis.marketConcentration} - HHI: {brandAnalytics.kpis.hhi}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Rekabet Yoğunluğu</p>
        <p className="text-lg font-bold text-orange-600 mt-1">
          Top 3 marka toplam satışın %{brandAnalytics.kpis.top3Share}'i
        </p>
      </div>
    </div>
  </div>
    </div>
  )
}
