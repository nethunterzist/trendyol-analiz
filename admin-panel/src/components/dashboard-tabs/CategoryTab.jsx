import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'
import KpiCard from '../ui/KpiCard'
import { Grid3X3, Trophy, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../../constants/chartColors'

export default function CategoryTab({ categoryAnalytics, sortedCategories, handleCategorySort, categorySortConfig }) {
  if (!categoryAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Category analizi yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Toplam Kategori"
          value={categoryAnalytics.kpis.totalCategories}
          icon={Grid3X3}
          color="blue"
        />
        <KpiCard
          title="Lider Kategori Payı"
          value={`%${categoryAnalytics.kpis.leaderShare}`}
          icon={Trophy}
          color="violet"
        />
        <KpiCard
          title="Ort. Ürün/Kategori"
          value={categoryAnalytics.kpis.avgProductsPerCategory}
          icon={BarChart3}
          color="emerald"
        />
        <KpiCard
          title="Pazar Yoğunlaşması"
          value={categoryAnalytics.kpis.marketConcentration}
          subtitle={`HHI: ${categoryAnalytics.kpis.hhi}`}
          icon={PieChartIcon}
          color="orange"
        />
      </div>

  {/* Row 2: Top Categories Table + Price Positioning */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* En Çok Satan Kategoriler */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">En Çok Satan Kategoriler (Top 20)</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Kategori</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Satış</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Ciro</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Pay %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categoryAnalytics.topByOrders.slice(0, 20).map((category, index) => (
              <tr key={category.name} className="hover:bg-orange-50/30">
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{index + 1}</td>
                <td className="px-4 py-3">
                  <a
                    href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-600 font-medium"
                  >
                    {category.name}
                  </a>
                  <div className="text-xs text-slate-500 mt-1">{category.productCount} ürün</div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-900">{category.totalOrders.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-900">₺{category.totalRevenue.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">{category.marketShare.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Fiyat Pozisyonlaması */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Fiyat Pozisyonlaması</h3>
      <div className="space-y-4">
        {Object.entries(categoryAnalytics.priceSegments).map(([segment, categories]) => (
          <div key={segment} className="bg-slate-50 rounded-xl p-4">
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
                <span className="text-sm font-semibold text-slate-700">
                  {categories.length} kategori
                </span>
              </div>
              <span className="text-sm text-slate-500">
                %{Math.round((categories.length / categoryAnalytics.categories.length) * 100)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
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
            <p className="text-xs text-slate-400 mt-2">
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Kategori Pazar Payı Dağılımı</h3>
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
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
            ))}
          </Pie>
          <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value) => value.toLocaleString('tr-TR')} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Pazar payı satış adedine göre hesaplanmıştır
      </p>
    </div>

    {/* Fiyat/Performans Matrisi */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Fiyat/Performans Matrisi</h3>
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
                  <div className="bg-slate-800 p-3 border-none rounded-xl shadow-lg">
                    <p className="font-semibold text-slate-50">{data.name}</p>
                    <p className="text-sm text-slate-200">Ort. Fiyat: ₺{data.avgPrice.toLocaleString('tr-TR')}</p>
                    <p className="text-sm text-slate-200">Satış: {data.totalOrders.toLocaleString('tr-TR')}</p>
                    <p className="text-sm text-slate-200">Sosyal Skor: {data.socialScore}</p>
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
      <p className="text-xs text-slate-400 mt-2 text-center">
        Kabarcık boyutu: Sosyal kanıt skoru (görüntülenme + satış + ürün çeşitliliği)
      </p>
    </div>
  </div>

  {/* Row 4: Detailed Category Comparison Table */}
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Detaylı Kategori Karşılaştırması</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-slate-50">
          <tr>
            <th
              onClick={() => handleCategorySort('name')}
              className="px-4 py-3 text-left text-xs font-medium text-slate-400 cursor-pointer hover:bg-orange-50/30 select-none"
            >
              <div className="flex items-center gap-1">
                Kategori
                {categorySortConfig.key === 'name' && (
                  <span className="text-slate-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('totalOrders')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-orange-50/30 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Satış
                {categorySortConfig.key === 'totalOrders' && (
                  <span className="text-slate-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('totalRevenue')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-orange-50/30 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ciro
                {categorySortConfig.key === 'totalRevenue' && (
                  <span className="text-slate-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('brandCount')}
              className="px-4 py-3 text-center text-xs font-medium text-slate-400 cursor-pointer hover:bg-orange-50/30 select-none"
            >
              <div className="flex items-center justify-center gap-1">
                Marka Çeşitliliği
                {categorySortConfig.key === 'brandCount' && (
                  <span className="text-slate-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleCategorySort('avgPrice')}
              className="px-4 py-3 text-right text-xs font-medium text-slate-400 cursor-pointer hover:bg-orange-50/30 select-none"
            >
              <div className="flex items-center justify-end gap-1">
                Ort. Fiyat
                {categorySortConfig.key === 'avgPrice' && (
                  <span className="text-slate-400">
                    {categorySortConfig.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Fiyat Aralığı</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Segment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sortedCategories.map(category => (
            <tr key={category.name} className="hover:bg-orange-50/30">
              <td className="px-4 py-3">
                <a
                  href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-500 hover:text-orange-600 hover:underline"
                >
                  {category.name}
                </a>
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
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
              <td className="px-4 py-3 text-right text-sm text-slate-900">
                ₺{category.avgPrice.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-right text-xs text-slate-500">
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
  <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">
      Kategori İçgörüleri
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Lider Kategori Dominansı</p>
        <p className="text-lg font-bold text-orange-500 mt-1">
          {categoryAnalytics.topByOrders[0]?.name} pazarın %{categoryAnalytics.kpis.leaderShare}'ini kontrol ediyor
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Segment Analizi</p>
        <p className="text-lg font-bold text-purple-600 mt-1">
          {Object.entries(categoryAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][0]}
          {' '}segment en kalabalık ({Object.entries(categoryAnalytics.priceSegments)
            .sort((a, b) => b[1].length - a[1].length)[0][1].length} kategori)
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Pazar Yapısı</p>
        <p className="text-lg font-bold text-green-600 mt-1">
          {categoryAnalytics.kpis.marketConcentration} - HHI: {categoryAnalytics.kpis.hhi}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Rekabet Yoğunluğu</p>
        <p className="text-lg font-bold text-orange-600 mt-1">
          Top 3 kategori toplam satışın %{categoryAnalytics.kpis.top3Share}'i
        </p>
      </div>
    </div>
  </div>
    </div>
  )
}
