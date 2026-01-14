import { useState, useMemo, useEffect } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, BarChart, Bar } from 'recharts'

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
        <p className="text-gray-500">Brand analizi yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Toplam Marka</p>
              <p className="text-3xl font-bold mt-2">
                {brandAnalytics.kpis.totalBrands.toLocaleString('tr-TR')}
              </p>
              <p className="text-blue-100 text-xs mt-1">Benzersiz marka sayısı</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Lider Marka Payı</p>
              <p className="text-3xl font-bold mt-2">
                %{brandAnalytics.kpis.leaderShare}
              </p>
              <p className="text-green-100 text-xs mt-1">{brandAnalytics.topByOrders[0]?.name}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Ort. Marka Başına Ürün</p>
              <p className="text-3xl font-bold mt-2">
                {brandAnalytics.kpis.avgProductsPerBrand}
              </p>
              <p className="text-purple-100 text-xs mt-1">Ürün çeşitliliği</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pazar Yoğunlaşması</p>
              <p className="text-3xl font-bold mt-2">
                {brandAnalytics.kpis.hhi}
              </p>
              <p className="text-orange-100 text-xs mt-1">{brandAnalytics.kpis.marketConcentration} (HHI)</p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

  {/* Row 2: Top 20 Brands Full-Width Two-Column Table */}
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Satan Markalar (Top 20)</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Brands 1-10 */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Marka</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Satış</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Ciro</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Pay %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {brandAnalytics.topByOrders.slice(0, 10).map((brand, index) => {
              const marketShare = ((brand.totalOrders / brandAnalytics.totalOrders) * 100).toFixed(1)
              return (
                <tr key={brand.name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">{index + 1}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {brand.name}
                    </a>
                    <p className="text-xs text-gray-500">{brand.productCount} ürün</p>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900">
                    {brand.totalOrders.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900">
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
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Marka</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Satış</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Ciro</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Pay %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {brandAnalytics.topByOrders.slice(10, 20).map((brand, index) => {
              const marketShare = ((brand.totalOrders / brandAnalytics.totalOrders) * 100).toFixed(1)
              return (
                <tr key={brand.name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">{index + 11}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {brand.name}
                    </a>
                    <p className="text-xs text-gray-500">{brand.productCount} ürün</p>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900">
                    {brand.totalOrders.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900">
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pazar Payı Dağılımı</h3>
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
            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'].map((color, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString('tr-TR')} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-gray-700">
          Top 3 marka pazarın <span className="font-bold text-blue-600">%{brandAnalytics.kpis.top3Share}</span>'ini kontrol ediyor
        </p>
      </div>
    </div>

    {/* Price/Quality Scatter Plot */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fiyat/Performans Matrisi</h3>
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
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
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
            fill="#3b82f6"
            opacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Kabarcık boyutu: Sosyal kanıt skoru (görüntülenme + satış + ürün çeşitliliği)
      </p>
    </div>
  </div>

  {/* Row 4: Detailed Brand Comparison Table */}
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detaylı Marka Karşılaştırması</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th
              onClick={() => handleBrandSort('name')}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Marka
                {brandSortConfig.key === 'name' && (
                  <span className="text-gray-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('totalOrders')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Satış
                {brandSortConfig.key === 'totalOrders' && (
                  <span className="text-gray-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('totalRevenue')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ciro
                {brandSortConfig.key === 'totalRevenue' && (
                  <span className="text-gray-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('productCount')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ürün Sayısı
                {brandSortConfig.key === 'productCount' && (
                  <span className="text-gray-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('categoryCount')}
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-center gap-1">
                Kategori Çeşitliliği
                {brandSortConfig.key === 'categoryCount' && (
                  <span className="text-gray-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleBrandSort('avgPrice')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ort. Fiyat
                {brandSortConfig.key === 'avgPrice' && (
                  <span className="text-gray-400">
                    {brandSortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Fiyat Aralığı</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Segment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedBrands.map(brand => (
            <tr key={brand.name} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <a
                  href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {brand.name}
                </a>
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {brand.totalOrders.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                ₺{brand.totalRevenue.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">
                {brand.productCount}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full">
                  <span className="text-sm font-semibold text-indigo-700">{brand.categoryCount}</span>
                  <span className="text-xs text-indigo-600">kategori</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">
                ₺{brand.avgPrice.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-xs text-gray-600">
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
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Sayfa {currentPage} / {totalPages} (Toplam {sortedBrands.length.toLocaleString('tr-TR')} marka)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Row 5: Market Insights */}
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Pazar İçgörüleri
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Lider Marka Dominansı</p>
        <p className="text-lg font-bold text-blue-600 mt-1">
          {brandAnalytics.topByOrders[0]?.name} pazarın %{brandAnalytics.kpis.leaderShare}'ini kontrol ediyor
        </p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Segment Analizi</p>
        <p className="text-lg font-bold text-purple-600 mt-1">
          {Object.entries(brandAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][0]}
          {' '}segment en kalabalık ({Object.entries(brandAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][1].length} marka)
        </p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Pazar Yapısı</p>
        <p className="text-lg font-bold text-green-600 mt-1">
          {brandAnalytics.kpis.marketConcentration} - HHI: {brandAnalytics.kpis.hhi}
        </p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Rekabet Yoğunluğu</p>
        <p className="text-lg font-bold text-orange-600 mt-1">
          Top 3 marka toplam satışın %{brandAnalytics.kpis.top3Share}'i
        </p>
      </div>
    </div>
  </div>
    </div>
  )
}
