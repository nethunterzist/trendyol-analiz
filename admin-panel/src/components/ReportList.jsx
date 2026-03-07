import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG, POLLING_CONFIG, calculateNextDelay } from '../config/api'
import { FileBarChart, Trash2, Eye, Calendar, Layers, Package, Sparkles, GitCompareArrows } from 'lucide-react'

function ReportList() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [enrichingReports, setEnrichingReports] = useState({}) // { reportId: { status, progress, enriched } }

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithTimeout(`${API_URL}/api/reports`)
      if (!response.ok) throw new Error('Failed to fetch reports')
      const data = await response.json()
      setReports(data)

      // Check enrichment status for each report
      data.forEach(report => {
        if (report.is_enriched) {
          setEnrichingReports(prev => ({
            ...prev,
            [report.id]: { status: 'completed', progress: 100, enriched: true }
          }))
        }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = async (reportId, reportName) => {
    if (!confirm(`"${reportName}" raporunu silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetchWithTimeout(
        `${API_URL}/api/reports/${reportId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete report')

      alert('Rapor başarıyla silindi!')
      fetchReports() // Refresh list
    } catch (err) {
      alert(`Hata: ${err.message}`)
    }
  }

  const handleEnrich = async (reportId) => {
    // Set loading state
    setEnrichingReports(prev => ({
      ...prev,
      [reportId]: { status: 'loading', progress: 0, enriched: false }
    }))

    try {
      // Start enrichment
      const response = await fetchWithTimeout(
        `${API_URL}/api/reports/${reportId}/enrich/start`,
        { method: 'POST' },
        TIMEOUT_CONFIG.ENRICHMENT
      )

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Zenginleştirme başlatılamadı')
      }

      // Start polling for status
      pollEnrichmentStatus(reportId)
    } catch (err) {
      setEnrichingReports(prev => ({
        ...prev,
        [reportId]: { status: 'error', progress: 0, enriched: false, error: err.message }
      }))
    }
  }

  const pollEnrichmentStatus = async (reportId) => {
    let delay = POLLING_CONFIG.INITIAL_DELAY

    const poll = async () => {
      try {
        const response = await fetchWithTimeout(
          `${API_URL}/api/reports/${reportId}/enrich/status`
        )

        if (!response.ok) throw new Error('Status check failed')
        const data = await response.json()

        const progress = data.progress || 0
        const isComplete = data.status === 'completed' || progress >= 100

        setEnrichingReports(prev => ({
          ...prev,
          [reportId]: {
            status: isComplete ? 'completed' : 'loading',
            progress,
            enriched: isComplete
          }
        }))

        if (!isComplete) {
          delay = calculateNextDelay(delay)
          setTimeout(poll, delay)
        }
      } catch {
        // On error, retry a few times
        delay = calculateNextDelay(delay)
        setTimeout(poll, delay)
      }
    }

    setTimeout(poll, delay)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-700">Hata: {error}</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Henüz Rapor Yok</h3>
        <p className="text-slate-500 mb-6">
          "Rapor Oluştur" sekmesinden ilk raporunuzu oluşturun
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Raporlarım</h1>
            <p className="text-sm text-slate-500 mt-1">
              Toplam {reports.length} rapor
            </p>
          </div>
          {reports.length >= 2 && (
            <button
              onClick={() => navigate('/compare')}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
            >
              <GitCompareArrows size={16} />
              Karşılaştır
            </button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const enrichState = enrichingReports[report.id]
          const isEnriched = enrichState?.enriched || report.is_enriched
          const isEnriching = enrichState?.status === 'loading'
          const enrichProgress = enrichState?.progress || 0

          return (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500 p-6 hover:shadow-md transition-shadow"
            >
              {/* Report Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    {report.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {report.category_name}
                  </p>
                </div>
                {isEnriched && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    <Sparkles size={10} />
                    Zengin
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs text-slate-500 font-medium mb-1">Alt Kategori</p>
                  <p className="text-lg font-bold text-slate-900">
                    {report.total_subcategories}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs text-slate-500 font-medium mb-1">Ürün</p>
                  <p className="text-lg font-bold text-slate-900">
                    {report.total_products.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Enrichment Progress */}
              {isEnriching && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-amber-600 font-medium">Zenginleştiriliyor...</span>
                    <span className="text-xs text-amber-600 font-medium tabular-nums">{enrichProgress}%</span>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${enrichProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="text-xs text-slate-400 mb-4">
                {formatDate(report.created_at)}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/reports/${report.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors text-sm text-center"
                >
                  <Eye size={16} />
                  Görüntüle
                </Link>
                {!isEnriched && !isEnriching && (
                  <button
                    onClick={() => handleEnrich(report.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-medium hover:bg-amber-100 transition-colors text-sm"
                    title="Sosyal kanıt verilerini zenginleştir"
                  >
                    <Sparkles size={14} />
                    Zenginleştir
                  </button>
                )}
                <button
                  onClick={() => handleDeleteReport(report.id, report.name)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors text-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ReportList
