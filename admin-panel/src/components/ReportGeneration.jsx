import { useState, useEffect, useRef } from 'react'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG, calculateNextDelay } from '../config/api'
import { Loader2, Check } from 'lucide-react'
import CategorySelector from './CategorySelector'

function ReportGeneration() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [showNameModal, setShowNameModal] = useState(false)
  const [reportName, setReportName] = useState('')
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionData, setCompletionData] = useState(null)
  const isMountedRef = useRef(true)
  const logsEndRef = useRef(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const handleCategorySelect = (category) => {
    if (generating) return
    setSelectedCategory(category)
  }

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('tr-TR')
    setLogs((prev) => [...prev, { timestamp, message, type }])
  }

  const handleGenerateReport = async () => {
    if (!selectedCategory) {
      alert('Lütfen önce bir kategori seçin!')
      return
    }
    setReportName(`${new Date().toLocaleDateString('tr-TR', { month: 'long' })} ${selectedCategory.name} Raporu`)
    setShowNameModal(true)
  }

  const handleStartReportGeneration = async () => {
    if (!reportName.trim()) {
      alert('Lütfen rapor adı girin!')
      return
    }

    setShowNameModal(false)
    setGenerating(true)
    setProgress(0)
    setLogs([])

    try {
      console.log('🔍 Frontend - Rapor oluşturuluyor:')
      console.log('  - Rapor adı:', reportName)
      console.log('  - Kategori ID:', selectedCategory.id)
      console.log('  - Kategori path:', selectedCategory.path)

      const params = new URLSearchParams({
        name: reportName,
        category_id: selectedCategory.id
      })

      const sseUrl = `${API_URL}/api/reports/create?${params}`
      console.log('🌐 SSE URL:', sseUrl)

      const eventSource = new EventSource(sseUrl)
      console.log('📡 EventSource oluşturuldu')

      eventSource.onopen = () => {
        console.log('✅ SSE bağlantısı açıldı')
      }

      eventSource.onmessage = (event) => {
        console.log('📨 Mesaj alındı:', event.data)
        try {
          const data = JSON.parse(event.data)

          if (data.progress !== undefined) {
            setProgress(data.progress)
          }

          if (data.message) {
            const timestamp = new Date().toLocaleTimeString('tr-TR')
            setLogs(prev => [...prev, {
              timestamp,
              message: data.message,
              type: data.type || 'info'
            }])
          }

          if (data.type === 'complete') {
            eventSource.close()
            setCompletionData({
              report_id: data.report_id,
              total_products: data.total_products,
              successful: data.successful
            })
            setShowCompletionModal(true)
            setGenerating(false)
          }

          if (data.type === 'error' && data.progress === -1) {
            eventSource.close()
            setGenerating(false)
          }

        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError)
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ SSE Error:', error)
        eventSource.close()
        addLog('Bağlantı hatası oluştu', 'error')
        setGenerating(false)
      }

    } catch (err) {
      addLog(`Hata: ${err.message}`, 'error')
      setGenerating(false)
    }
  }

  const handleViewReport = () => {
    if (completionData && completionData.report_id) {
      window.location.href = `/reports/${completionData.report_id}`
    }
  }

  return (
    <div className="space-y-5">
      {/* Category Selector - Miller Columns */}
      <CategorySelector onSelect={handleCategorySelect} disabled={generating} />

      {/* Generate Button */}
      {selectedCategory && !generating && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{selectedCategory.name}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-xs text-slate-400">{selectedCategory.path}</span>
          </p>
          <button
            onClick={handleGenerateReport}
            className="px-6 py-2.5 bg-orange-500 text-white text-sm rounded-lg font-medium hover:bg-orange-600 shadow-sm hover:shadow transition-all"
          >
            Rapor Oluştur
          </button>
        </div>
      )}

      {/* Progress - shows during generation */}
      {generating && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">Rapor oluşturuluyor...</span>
            <span className="text-sm font-semibold text-orange-500 tabular-nums">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Terminal Logs */}
      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-slate-500 text-xs font-mono ml-2">terminal</span>
            {generating && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-auto"></div>}
          </div>

          {/* Terminal Content */}
          <div className="p-4 max-h-80 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`font-mono text-xs mb-1.5 ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'success'
                    ? 'text-green-400'
                    : log.type === 'warning'
                    ? 'text-yellow-400'
                    : log.type === 'api'
                    ? 'text-blue-400'
                    : log.type === 'processing'
                    ? 'text-cyan-400'
                    : 'text-slate-400'
                }`}
              >
                <span className="text-slate-600">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Rapor Adı</h2>
            <p className="text-sm text-slate-400 mb-4">Raporunuz için bir isim belirleyin</p>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
              placeholder="Örn: Kasım Kozmetik Raporu"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleStartReportGeneration()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNameModal(false)
                  setGenerating(false)
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleStartReportGeneration}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                Başla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completionData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tamamlandı</h3>
            <p className="text-sm text-slate-400 mb-5">{reportName}</p>
            <div className="flex gap-4 justify-center mb-5 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900">{completionData.total_products}</p>
                <p className="text-xs text-slate-400">Ürün</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <p className="text-2xl font-bold text-green-600">{completionData.successful}</p>
                <p className="text-xs text-slate-400">Kategori</p>
              </div>
            </div>
            <button
              onClick={handleViewReport}
              className="w-full px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              Raporu Görüntüle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportGeneration
