import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG } from '../config/api'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function ReportComparison() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportAId, setReportAId] = useState('')
  const [reportBId, setReportBId] = useState('')
  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    fetchWithTimeout(`${API_URL}/api/reports`)
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadReport = async (reportId) => {
    const res = await fetchWithTimeout(
      `${API_URL}/api/reports/${reportId}/dashboard-data`,
      {},
      TIMEOUT_CONFIG.DASHBOARD
    )
    if (!res.ok) throw new Error('Rapor yüklenemedi')
    return res.json()
  }

  const handleCompare = async () => {
    if (!reportAId || !reportBId) return
    setLoadingData(true)
    try {
      const [a, b] = await Promise.all([loadReport(reportAId), loadReport(reportBId)])
      setDataA(a)
      setDataB(b)
    } catch (err) {
      alert('Hata: ' + err.message)
    } finally {
      setLoadingData(false)
    }
  }

  // Calculate KPIs for a dataset
  const calcKpis = (data) => {
    if (!data?.all_products) return null
    const products = data.all_products
    const totalProducts = products.length
    const totalOrders = products.reduce((s, p) => s + (p.orders || 0), 0)
    const totalViews = products.reduce((s, p) => s + (p.page_views || 0), 0)
    const avgPrice = totalProducts > 0
      ? Math.round(products.reduce((s, p) => s + (p.price || 0), 0) / totalProducts)
      : 0
    const totalRevenue = products.reduce((s, p) => s + ((p.price || 0) * (p.orders || 0)), 0)
    const uniqueBrands = new Set(products.map(p => p.brand).filter(Boolean)).size

    // HHI
    const brandOrders = {}
    products.forEach(p => {
      const b = p.brand || 'Unknown'
      brandOrders[b] = (brandOrders[b] || 0) + (p.orders || 0)
    })
    const shares = Object.values(brandOrders).map(o => (o / totalOrders) * 100)
    const hhi = Math.round(shares.reduce((s, sh) => s + sh * sh, 0))

    return { totalProducts, totalOrders, totalViews, avgPrice, totalRevenue: Math.round(totalRevenue), uniqueBrands, hhi }
  }

  const kpisA = useMemo(() => calcKpis(dataA), [dataA])
  const kpisB = useMemo(() => calcKpis(dataB), [dataB])

  // Brand comparison chart
  const brandChartData = useMemo(() => {
    if (!dataA?.all_products || !dataB?.all_products) return []

    const getBrandOrders = (products) => {
      const map = {}
      products.forEach(p => {
        const b = p.brand || 'Bilinmeyen'
        map[b] = (map[b] || 0) + (p.orders || 0)
      })
      return map
    }

    const brandsA = getBrandOrders(dataA.all_products)
    const brandsB = getBrandOrders(dataB.all_products)

    // Top 10 brands (by combined orders)
    const allBrands = new Set([...Object.keys(brandsA), ...Object.keys(brandsB)])
    const combined = Array.from(allBrands).map(name => ({
      name,
      total: (brandsA[name] || 0) + (brandsB[name] || 0)
    }))
    combined.sort((a, b) => b.total - a.total)

    return combined.slice(0, 10).map(b => ({
      name: b.name.length > 15 ? b.name.substring(0, 15) + '...' : b.name,
      'Rapor A': brandsA[b.name] || 0,
      'Rapor B': brandsB[b.name] || 0
    }))
  }, [dataA, dataB])

  const DiffIndicator = ({ a, b, format = 'number' }) => {
    if (a == null || b == null) return <span className="text-slate-400">-</span>
    const diff = b - a
    const pct = a > 0 ? ((diff / a) * 100).toFixed(1) : '∞'

    if (diff === 0) return (
      <span className="text-slate-400 flex items-center gap-0.5 text-xs">
        <Minus size={12} /> Aynı
      </span>
    )

    if (diff > 0) return (
      <span className="text-emerald-600 flex items-center gap-0.5 text-xs font-medium">
        <ArrowUpRight size={12} /> +{format === 'currency' ? `₺${diff.toLocaleString('tr-TR')}` : diff.toLocaleString('tr-TR')} ({pct}%)
      </span>
    )

    return (
      <span className="text-red-500 flex items-center gap-0.5 text-xs font-medium">
        <ArrowDownRight size={12} /> {format === 'currency' ? `₺${diff.toLocaleString('tr-TR')}` : diff.toLocaleString('tr-TR')} ({pct}%)
      </span>
    )
  }

  const reportAName = reports.find(r => r.id === parseInt(reportAId))?.name || 'Rapor A'
  const reportBName = reports.find(r => r.id === parseInt(reportBId))?.name || 'Rapor B'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rapor Karşılaştırma</h1>
            <p className="text-sm text-slate-500 mt-1">İki raporu yan yana karşılaştırın</p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Geri
          </button>
        </div>
      </div>

      {/* Report Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rapor A</label>
            <select
              value={reportAId}
              onChange={e => setReportAId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Rapor seçin...</option>
              {reports.map(r => (
                <option key={r.id} value={r.id} disabled={r.id === parseInt(reportBId)}>
                  {r.name} ({r.total_products} ürün)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rapor B</label>
            <select
              value={reportBId}
              onChange={e => setReportBId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Rapor seçin...</option>
              {reports.map(r => (
                <option key={r.id} value={r.id} disabled={r.id === parseInt(reportAId)}>
                  {r.name} ({r.total_products} ürün)
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleCompare}
          disabled={!reportAId || !reportBId || loadingData}
          className="w-full md:w-auto px-6 py-2.5 bg-orange-500 text-white text-sm rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loadingData ? 'Yükleniyor...' : 'Karşılaştır'}
        </button>
      </div>

      {/* Comparison Results */}
      {kpisA && kpisB && (
        <>
          {/* KPI Comparison Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">KPI Karşılaştırma</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 font-medium text-slate-500">Metrik</th>
                    <th className="text-right px-6 py-3 font-medium text-orange-500">{reportAName}</th>
                    <th className="text-right px-6 py-3 font-medium text-blue-500">{reportBName}</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Toplam Ürün', keyA: kpisA.totalProducts, keyB: kpisB.totalProducts },
                    { label: 'Toplam Sipariş', keyA: kpisA.totalOrders, keyB: kpisB.totalOrders },
                    { label: 'Toplam Görüntülenme', keyA: kpisA.totalViews, keyB: kpisB.totalViews },
                    { label: 'Ortalama Fiyat', keyA: kpisA.avgPrice, keyB: kpisB.avgPrice, format: 'currency' },
                    { label: 'Toplam Ciro', keyA: kpisA.totalRevenue, keyB: kpisB.totalRevenue, format: 'currency' },
                    { label: 'Marka Sayısı', keyA: kpisA.uniqueBrands, keyB: kpisB.uniqueBrands },
                    { label: 'HHI (Yoğunlaşma)', keyA: kpisA.hhi, keyB: kpisB.hhi },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-700">{row.label}</td>
                      <td className="px-6 py-3 text-right text-slate-900">
                        {row.format === 'currency' ? `₺${row.keyA.toLocaleString('tr-TR')}` : row.keyA.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-900">
                        {row.format === 'currency' ? `₺${row.keyB.toLocaleString('tr-TR')}` : row.keyB.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <DiffIndicator a={row.keyA} b={row.keyB} format={row.format} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Brand Comparison Chart */}
          {brandChartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                <BarChart3 size={18} className="inline mr-2" />
                En Çok Satan 10 Marka Karşılaştırması
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandChartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value) => [value.toLocaleString('tr-TR'), '']}
                    />
                    <Legend />
                    <Bar dataKey="Rapor A" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Rapor B" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ReportComparison
