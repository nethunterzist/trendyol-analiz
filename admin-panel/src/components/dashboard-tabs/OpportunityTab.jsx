import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis, Cell } from 'recharts'
import { Target, TrendingUp, AlertTriangle, Zap } from 'lucide-react'
import KpiCard from '../ui/KpiCard'

// Renk paleti - dönüşüm oranına göre
const getConversionColor = (rate) => {
  if (rate >= 5) return '#10b981' // emerald
  if (rate >= 2) return '#f59e0b' // amber
  if (rate >= 1) return '#3b82f6' // blue
  return '#94a3b8' // slate
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 max-w-xs">
      <p className="font-semibold text-slate-900 text-sm mb-1">{d.name}</p>
      <div className="space-y-0.5 text-xs text-slate-600">
        <p>Ort. Görüntüleme: <span className="font-medium text-slate-900">{d.avgViews?.toLocaleString('tr-TR')}</span></p>
        <p>Ürün Sayısı: <span className="font-medium text-slate-900">{d.productCount?.toLocaleString('tr-TR')}</span></p>
        <p>Ort. Sipariş: <span className="font-medium text-slate-900">{d.avgOrders?.toLocaleString('tr-TR')}</span></p>
        <p>Dönüşüm: <span className="font-medium text-slate-900">{d.conversionRate?.toFixed(2)}%</span></p>
      </div>
      <div className={`mt-2 px-2 py-0.5 rounded text-xs font-medium inline-block ${
        d.quadrant === 'opportunity' ? 'bg-emerald-100 text-emerald-700' :
        d.quadrant === 'saturated' ? 'bg-red-100 text-red-700' :
        d.quadrant === 'niche' ? 'bg-blue-100 text-blue-700' :
        'bg-amber-100 text-amber-700'
      }`}>
        {d.quadrant === 'opportunity' ? 'FIRSAT' :
         d.quadrant === 'saturated' ? 'DOYGUN' :
         d.quadrant === 'niche' ? 'NİŞ' : 'REKABET'}
      </div>
    </div>
  )
}

export default function OpportunityTab({ allProducts }) {
  const chartData = useMemo(() => {
    if (!allProducts?.length) return { data: [], avgViews: 0, avgProducts: 0, opportunities: 0, saturated: 0 }

    // Alt kategorilere göre grupla
    const categoryMap = new Map()
    allProducts.forEach(p => {
      const cat = p.category_name || 'Bilinmeyen'
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { products: [], totalViews: 0, totalOrders: 0 })
      }
      const c = categoryMap.get(cat)
      c.products.push(p)
      c.totalViews += (p.page_views || 0)
      c.totalOrders += (p.orders || 0)
    })

    const categories = Array.from(categoryMap.entries()).map(([name, c]) => {
      const productCount = c.products.length
      const avgViews = productCount > 0 ? Math.round(c.totalViews / productCount) : 0
      const avgOrders = productCount > 0 ? Math.round(c.totalOrders / productCount) : 0
      const conversionRate = c.totalViews > 0 ? (c.totalOrders / c.totalViews) * 100 : 0

      return {
        name,
        avgViews,
        productCount,
        avgOrders,
        totalOrders: c.totalOrders,
        conversionRate,
        quadrant: '' // will be set after averages are calculated
      }
    })

    // Ortalama hesapla (çeyrek çizgileri için)
    const avgViews = categories.length > 0
      ? Math.round(categories.reduce((s, c) => s + c.avgViews, 0) / categories.length)
      : 0
    const avgProducts = categories.length > 0
      ? Math.round(categories.reduce((s, c) => s + c.productCount, 0) / categories.length)
      : 0

    // Kadranları belirle
    categories.forEach(c => {
      if (c.avgViews >= avgViews && c.productCount < avgProducts) {
        c.quadrant = 'opportunity' // Yüksek talep, düşük arz = FIRSAT
      } else if (c.avgViews < avgViews && c.productCount >= avgProducts) {
        c.quadrant = 'saturated' // Düşük talep, yüksek arz = DOYGUN
      } else if (c.avgViews >= avgViews && c.productCount >= avgProducts) {
        c.quadrant = 'competitive' // Yüksek talep, yüksek arz = REKABET
      } else {
        c.quadrant = 'niche' // Düşük talep, düşük arz = NİŞ
      }
    })

    const opportunities = categories.filter(c => c.quadrant === 'opportunity').length
    const saturated = categories.filter(c => c.quadrant === 'saturated').length

    return { data: categories, avgViews, avgProducts, opportunities, saturated }
  }, [allProducts])

  if (!allProducts?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Fırsat haritası için veri bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Toplam Kategori"
          value={chartData.data.length}
          icon={Target}
          color="blue"
        />
        <KpiCard
          title="Fırsat Alanı"
          value={chartData.opportunities}
          subtitle="Yüksek talep, düşük arz"
          icon={Zap}
          color="emerald"
        />
        <KpiCard
          title="Doygun Pazar"
          value={chartData.saturated}
          subtitle="Düşük talep, yüksek arz"
          icon={AlertTriangle}
          color="rose"
        />
        <KpiCard
          title="Ort. Görüntüleme"
          value={chartData.avgViews.toLocaleString('tr-TR')}
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* Scatter Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Fırsat Haritası</h3>
          <p className="text-xs text-slate-400 mt-1">
            X: Ortalama Görüntüleme (Talep) | Y: Ürün Sayısı (Arz) | Boyut: Ort. Sipariş | Renk: Dönüşüm Oranı
          </p>
        </div>

        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="avgViews"
                name="Ort. Görüntüleme"
                tick={{ fill: '#64748b', fontSize: 12 }}
                label={{ value: 'Ort. Görüntüleme (Talep)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="productCount"
                name="Ürün Sayısı"
                tick={{ fill: '#64748b', fontSize: 12 }}
                label={{ value: 'Ürün Sayısı (Arz)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="avgOrders" range={[50, 400]} name="Ort. Sipariş" />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={chartData.avgViews}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{ value: 'Ort. Talep', fill: '#94a3b8', fontSize: 11 }}
              />
              <ReferenceLine
                y={chartData.avgProducts}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{ value: 'Ort. Arz', fill: '#94a3b8', fontSize: 11 }}
              />
              <Scatter data={chartData.data} name="Kategoriler">
                {chartData.data.map((entry, index) => (
                  <Cell key={index} fill={getConversionColor(entry.conversionRate)} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Kadranlar:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Sol Üst = FIRSAT
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Sağ Alt = DOYGUN
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Sağ Üst = REKABET
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Sol Alt = NİŞ
            </span>
          </div>
        </div>
      </div>

      {/* Opportunity List */}
      {chartData.data.filter(c => c.quadrant === 'opportunity').length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Fırsat Kategorileri</h3>
          <div className="space-y-2">
            {chartData.data
              .filter(c => c.quadrant === 'opportunity')
              .sort((a, b) => b.avgViews - a.avgViews)
              .map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg">
                  <div className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{cat.name}</p>
                    <p className="text-xs text-slate-500">
                      {cat.productCount} ürün · {cat.avgViews.toLocaleString('tr-TR')} ort. görüntüleme
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{cat.avgOrders.toLocaleString('tr-TR')}</p>
                    <p className="text-xs text-slate-400">ort. sipariş</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
