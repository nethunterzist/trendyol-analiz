import { useState, useEffect, useRef } from 'react'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG, calculateNextDelay } from '../config/api'
import { Search, Loader2, ChevronRight, ArrowLeft, X, Check } from 'lucide-react'

function ReportGeneration() {
  const [mainCategories, setMainCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [subCategories, setSubCategories] = useState([])
  const [selectedSubCategories, setSelectedSubCategories] = useState([])
  const [loadingSubCategories, setLoadingSubCategories] = useState(false)
  const [subCategorySearch, setSubCategorySearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [showNameModal, setShowNameModal] = useState(false)
  const [reportName, setReportName] = useState('')
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionData, setCompletionData] = useState(null)
  const [subBreadcrumb, setSubBreadcrumb] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const pollTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)
  const logsEndRef = useRef(null)

  useEffect(() => {
    isMountedRef.current = true
    fetchMainCategories()

    return () => {
      isMountedRef.current = false
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const fetchMainCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithTimeout(`${API_URL}/categories/main`)
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      if (isMountedRef.current) {
        setMainCategories(data)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const fetchSubCategories = async (categoryId, resetSelection = true) => {
    setLoadingSubCategories(true)
    setSubCategories([])
    if (resetSelection) {
      setSelectedSubCategories([])
      setSubBreadcrumb([])
    }
    setSubCategorySearch('')
    setShowSearch(false)
    try {
      const response = await fetchWithTimeout(`${API_URL}/categories/${categoryId}/children`)
      if (!response.ok) throw new Error('Failed to fetch sub-categories')
      const data = await response.json()
      if (isMountedRef.current) {
        setSubCategories(data)
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Sub-category fetch error:', err)
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingSubCategories(false)
      }
    }
  }

  const handleDrillDown = (subCat) => {
    if (generating || subCat.children_count === 0) return
    setSubBreadcrumb(prev => [...prev, subCat])
    fetchSubCategories(subCat.id, false)
  }

  const handleBreadcrumbBack = (index) => {
    if (index === -1) {
      setSubBreadcrumb([])
      fetchSubCategories(selectedCategory.id, false)
    } else {
      const target = subBreadcrumb[index]
      setSubBreadcrumb(subBreadcrumb.slice(0, index + 1))
      fetchSubCategories(target.id, false)
    }
  }

  const toggleSubCategory = (subCat) => {
    if (generating) return
    setSelectedSubCategories(prev => {
      const exists = prev.some(c => c.id === subCat.id)
      if (exists) return prev.filter(c => c.id !== subCat.id)
      return [...prev, subCat]
    })
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
      const requestBody = {
        name: reportName,
        category_id: selectedCategory.id
      }

      if (selectedSubCategories.length > 0) {
        requestBody.subcategory_ids = selectedSubCategories.map(cat => cat.id)
      }

      console.log('🔍 Frontend - Rapor oluşturuluyor:')
      console.log('  - Rapor adı:', requestBody.name)
      console.log('  - Kategori ID:', requestBody.category_id)
      console.log('  - Alt kategori IDs:', requestBody.subcategory_ids)

      const params = new URLSearchParams({
        name: requestBody.name,
        category_id: requestBody.category_id,
        ...(requestBody.subcategory_ids && { subcategory_ids: JSON.stringify(requestBody.subcategory_ids) })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Yükleniyor...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Hata: {error}</p>
      </div>
    )
  }

  const filteredSubCategories = subCategories.filter((subCat) =>
    subCat.name.toLowerCase().includes(subCategorySearch.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Main Category Selection - Horizontal Pills */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Kategori</h2>
          {selectedCategory && (
            <button
              onClick={() => {
                if (!generating) {
                  setSelectedCategory(null)
                  setSubCategories([])
                  setSelectedSubCategories([])
                  setSubBreadcrumb([])
                }
              }}
              disabled={generating}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {mainCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                if (!generating) {
                  setSelectedCategory(category)
                  fetchSubCategories(category.id)
                }
              }}
              disabled={generating}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory?.id === category.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Category Selection - Clean List */}
      {selectedCategory && (subCategories.length > 0 || loadingSubCategories) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {subBreadcrumb.length > 0 && (
                  <button
                    onClick={() => !generating && handleBreadcrumbBack(subBreadcrumb.length >= 2 ? subBreadcrumb.length - 2 : -1)}
                    disabled={generating}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-sm">
                  <button
                    onClick={() => !generating && subBreadcrumb.length > 0 && handleBreadcrumbBack(-1)}
                    className={`font-medium transition-colors ${subBreadcrumb.length > 0 ? 'text-orange-500 hover:text-orange-600 cursor-pointer' : 'text-slate-800 cursor-default'}`}
                    disabled={generating || subBreadcrumb.length === 0}
                  >
                    {selectedCategory.name}
                  </button>
                  {subBreadcrumb.map((crumb, index) => (
                    <span key={crumb.id} className="flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      {index < subBreadcrumb.length - 1 ? (
                        <button
                          onClick={() => !generating && handleBreadcrumbBack(index)}
                          className="text-orange-500 hover:text-orange-600 font-medium"
                          disabled={generating}
                        >
                          {crumb.name}
                        </button>
                      ) : (
                        <span className="text-slate-800 font-medium">{crumb.name}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                    showSearch ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-400 tabular-nums">{subCategories.length}</span>
              </div>
            </div>

            {/* Search - collapsible */}
            {showSearch && (
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={subCategorySearch}
                  onChange={(e) => setSubCategorySearch(e.target.value)}
                  disabled={generating}
                  autoFocus
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all"
                />
                {subCategorySearch && (
                  <button
                    onClick={() => setSubCategorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selected chips */}
          {selectedSubCategories.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 bg-orange-50/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-orange-500 uppercase tracking-wider shrink-0">
                  {selectedSubCategories.length} seçili
                </span>
                <div className="w-px h-4 bg-orange-200 shrink-0" />
                {selectedSubCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-full text-xs font-medium text-slate-700 border border-orange-200 shadow-sm"
                  >
                    {cat.name}
                    <button
                      onClick={() => !generating && setSelectedSubCategories(prev => prev.filter(c => c.id !== cat.id))}
                      disabled={generating}
                      className="text-slate-300 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => !generating && setSelectedSubCategories([])}
                  disabled={generating}
                  className="text-[11px] text-slate-400 hover:text-red-400 font-medium transition-colors ml-auto shrink-0"
                >
                  Temizle
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loadingSubCategories ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {/* Select all row */}
              <div
                onClick={() => {
                  if (generating) return
                  const allIds = new Set(selectedSubCategories.map(c => c.id))
                  const allSelected = filteredSubCategories.every(c => allIds.has(c.id))
                  if (allSelected) {
                    const filterIds = new Set(filteredSubCategories.map(c => c.id))
                    setSelectedSubCategories(prev => prev.filter(c => !filterIds.has(c.id)))
                  } else {
                    const newOnes = filteredSubCategories.filter(c => !allIds.has(c.id))
                    setSelectedSubCategories(prev => [...prev, ...newOnes])
                  }
                }}
                className={`flex items-center px-5 py-2.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center mr-3 shrink-0 transition-colors ${
                  filteredSubCategories.length > 0 && filteredSubCategories.every(c => selectedSubCategories.some(s => s.id === c.id))
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-slate-300'
                }`}>
                  {filteredSubCategories.length > 0 && filteredSubCategories.every(c => selectedSubCategories.some(s => s.id === c.id)) && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tümünü seç</span>
              </div>

              {filteredSubCategories.length > 0 ? (
                filteredSubCategories.map((subCat) => {
                  const isSelected = selectedSubCategories.some(c => c.id === subCat.id)
                  const hasChildren = subCat.children_count > 0
                  return (
                    <div
                      key={subCat.id}
                      className={`group flex items-center px-5 py-3 border-b border-slate-50 transition-colors ${
                        isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50/80'
                      } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSubCategory(subCat)}
                        disabled={generating}
                        className="mr-3 shrink-0"
                      >
                        <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-150 ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 scale-105'
                            : 'border-slate-300 group-hover:border-slate-400'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                      </button>

                      {/* Name - click to select */}
                      <button
                        onClick={() => toggleSubCategory(subCat)}
                        disabled={generating}
                        className="flex-1 text-left min-w-0"
                      >
                        <span className={`text-sm font-medium ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>
                          {subCat.name}
                        </span>
                      </button>

                      {/* Children count + drill down */}
                      {hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDrillDown(subCat)
                          }}
                          disabled={generating}
                          className="group/drill flex items-center gap-1.5 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-orange-600 hover:bg-orange-100 transition-all shrink-0 border border-transparent hover:border-orange-200"
                          title="Alt kategorileri gör"
                        >
                          <span className="text-xs tabular-nums font-medium">{subCat.children_count}</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/drill:translate-x-0.5" />
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">Sonuç bulunamadı</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generate Button - compact inline */}
      {selectedCategory && !generating && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{selectedCategory.name}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {selectedSubCategories.length > 0 ? (
              <span>{selectedSubCategories.length} seçili kategori</span>
            ) : (
              <span>{selectedCategory.children_count || 0} alt kategori</span>
            )}
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
