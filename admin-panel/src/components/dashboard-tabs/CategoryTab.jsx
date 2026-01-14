import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'

export default function CategoryTab({ categoryAnalytics, sortedCategories, handleCategorySort, categorySortConfig }) {
  if (!categoryAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Category analizi yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Toplam Kategori</p>
              <p className="text-3xl font-bold mt-2">{categoryAnalytics.kpis.totalCategories}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Lider Kategori Payı</p>
              <p className="text-3xl font-bold mt-2">%{categoryAnalytics.kpis.leaderShare}</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Ort. Ürün/Kategori</p>
              <p className="text-3xl font-bold mt-2">{categoryAnalytics.kpis.avgProductsPerCategory}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pazar Yoğunlaşması</p>
              <p className="text-2xl font-bold mt-2">{categoryAnalytics.kpis.marketConcentration}</p>
              <p className="text-orange-100 text-xs mt-1">HHI: {categoryAnalytics.kpis.hhi}</p>
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

  {/* Row 2: Top Categories Table + Price Positioning */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* En Çok Satan Kategoriler */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Satan Kategoriler (Top 20)</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Kategori</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Satış</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ciro</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Pay %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categoryAnalytics.topByOrders.slice(0, 20).map((category, index) => (
              <tr key={category.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{index + 1}</td>
                <td className="px-4 py-3">
                  <a
                    href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {category.name}
                  </a>
                  <div className="text-xs text-gray-600 mt-1">{category.productCount} ürün</div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{category.totalOrders.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">₺{category.totalRevenue.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">{category.marketShare.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Fiyat Pozisyonlaması */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fiyat Pozisyonlaması</h3>
      <div className="space-y-4">
        {Object.entries(categoryAnalytics.priceSegments).map(([segment, categories]) => (
          <div key={segment} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  segment === 'Premium'
                    ? 'bg-purple-100 text-purple-800'
                    : segment === 'Orta Segment'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {segment}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {categories.length} kategori
                </span>
              </div>
              <span className="text-sm text-gray-600">
                %{Math.round((categories.length / categoryAnalytics.categories.length) * 100)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  segment === 'Premium'
                    ? 'bg-purple-600'
                    : segment === 'Orta Segment'
                    ? 'bg-blue-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${(categories.length / categoryAnalytics.categories.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Toplam satış: {categories.reduce((sum, c) => sum + c.totalOrders, 0).toLocaleString('tr-TR')}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* Row 3: Market Share Chart + Price/Performance Matrix */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Pazar Payı Dağılımı */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Pazar Payı Dağılımı</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={[
              ...categoryAnalytics.topByOrders.slice(0, 5).map(cat => ({
                name: cat.name,
                value: cat.totalOrders
              })),
              {
                name: 'Diğer',
                value: categoryAnalytics.categories
                  .filter((_, i) => i >= 5)
                  .reduce((sum, cat) => sum + cat.totalOrders, 0)
              }
            ]}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6b7280'][index]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString('tr-TR')} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Pazar payı satış adedine göre hesaplanmıştır
      </p>
    </div>

    {/* Fiyat/Performans Matrisi */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fiyat/Performans Matrisi</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="avgPrice" name="Ort. Fiyat" unit="₺" />
          <YAxis type="number" dataKey="totalOrders" name="Satış" />
          <ZAxis type="number" dataKey="socialScore" range={[50, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                    <p className="font-semibold text-gray-900">{data.name}</p>
                    <p className="text-sm text-gray-600">Ort. Fiyat: ₺{data.avgPrice.toLocaleString('tr-TR')}</p>
                    <p className="text-sm text-gray-600">Satış: {data.totalOrders.toLocaleString('tr-TR')}</p>
                    <p className="text-sm text-gray-600">Sosyal Skor: {data.socialScore}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <Scatter name="Kategoriler" data={categoryAnalytics.topByOrders.slice(0, 15)} fill="#8b5cf6" />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Kabarcık boyutu: Sosyal kanıt skoru (görüntülenme + satış + ürün çeşitliliği)
      </p>
    </div>
  </div>

  {/* Row 4: Detailed Category Comparison Table */}
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detaylı Kategori Karşılaştırması</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th
              onClick={() => handleCategorySort('name')}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Kategori
                {categorySortConfig.key === 'name' && (
                  <span className="text-gray-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('totalOrders')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Satış
                {categorySortConfig.key === 'totalOrders' && (
                  <span className="text-gray-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('totalRevenue')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ciro
                {categorySortConfig.key === 'totalRevenue' && (
                  <span className="text-gray-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('brandCount')}
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-center gap-1">
                Marka Çeşitliliği
                {categorySortConfig.key === 'brandCount' && (
                  <span className="text-gray-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('avgPrice')}
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ort. Fiyat
                {categorySortConfig.key === 'avgPrice' && (
                  <span className="text-gray-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Fiyat Aralığı</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Segment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedCategories.map(category => (
            <tr key={category.name} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <a
                  href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {category.name}
                </a>
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {category.totalOrders.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                ₺{category.totalRevenue.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full">
                  <span className="text-sm font-semibold text-indigo-700">{category.brandCount}</span>
                  <span className="text-xs text-indigo-600">marka</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">
                ₺{category.avgPrice.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-xs text-gray-600">
                {category.minPrice !== category.maxPrice
                  ? `₺${category.minPrice.toLocaleString('tr-TR')} - ₺${category.maxPrice.toLocaleString('tr-TR')}`
                  : `₺${category.minPrice.toLocaleString('tr-TR')}`
                }
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  category.priceSegment === 'Premium'
                    ? 'bg-purple-100 text-purple-800'
                    : category.priceSegment === 'Orta Segment'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {category.priceSegment}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>

  {/* Row 5: Category Insights */}
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Kategori İçgörüleri
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Lider Kategori Dominansı</p>
        <p className="text-lg font-bold text-blue-600 mt-1">
          {categoryAnalytics.topByOrders[0]?.name} pazarın %{categoryAnalytics.kpis.leaderShare}'ini kontrol ediyor
        </p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Segment Analizi</p>
        <p className="text-lg font-bold text-purple-600 mt-1">
          {Object.entries(categoryAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][0]}
          {' '}segment en kalabalık ({Object.entries(categoryAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][1].length} kategori)
        </p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Pazar Yapısı</p>
        <p className="text-lg font-bold text-green-600 mt-1">
          {categoryAnalytics.kpis.marketConcentration} - HHI: {categoryAnalytics.kpis.hhi}
        </p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">Rekabet Yoğunluğu</p>
        <p className="text-lg font-bold text-orange-600 mt-1">
          Top 3 kategori toplam satışın %{categoryAnalytics.kpis.top3Share}'i
        </p>
      </div>
    </div>
  </div>
    </div>
  )
}
