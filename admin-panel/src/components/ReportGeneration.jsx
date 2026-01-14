import { useState, useEffect, useRef } from 'react'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG, calculateNextDelay } from '../config/api'

function ReportGeneration() {
  const [mainCategories, setMainCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [subCategories, setSubCategories] = useState([])
  const [selectedSubCategories, setSelectedSubCategories] = useState([]) // Changed to array for multi-select
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

  // Auto-scroll to bottom of logs
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

  const fetchSubCategories = async (categoryId) => {
    setLoadingSubCategories(true)
    setSubCategories([])
    setSelectedSubCategories([]) // Clear selected subcategories
    setSubCategorySearch('') // Clear search when loading new category
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

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('tr-TR')
    setLogs((prev) => [...prev, { timestamp, message, type }])
  }

  const handleGenerateReport = async () => {
    if (!selectedCategory) {
      alert('Lütfen önce bir kategori seçin!')
      return
    }

    // Show modal first to get report name
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
      // Prepare request body
      const requestBody = {
        name: reportName,
        category_id: selectedCategory.id
      }

      // Add subcategory_ids if subcategories are selected
      if (selectedSubCategories.length > 0) {
        requestBody.subcategory_ids = selectedSubCategories.map(cat => cat.id)
      }

      console.log('🔍 Frontend - Rapor oluşturuluyor:')
      console.log('  - Rapor adı:', requestBody.name)
      console.log('  - Kategori ID:', requestBody.category_id)
      console.log('  - Alt kategori IDs:', requestBody.subcategory_ids)

      // Build URL with query parameters for POST request with streaming
      const url = new URL(`${API_URL}/api/reports/create`)

      // Build SSE URL
      const params = new URLSearchParams({
        name: requestBody.name,
        category_id: requestBody.category_id,
        ...(requestBody.subcategory_ids && { subcategory_ids: JSON.stringify(requestBody.subcategory_ids) })
      })

      const sseUrl = `${API_URL}/api/reports/create?${params}`
      console.log('🌐 SSE URL:', sseUrl)

      // Start SSE connection
      const eventSource = new EventSource(sseUrl)
      console.log('📡 EventSource oluşturuldu')

      eventSource.onopen = () => {
        console.log('✅ SSE bağlantısı açıldı')
      }

      eventSource.onmessage = (event) => {
        console.log('📨 Mesaj alındı:', event.data)
        try {
          const data = JSON.parse(event.data)

          // Update progress
          if (data.progress !== undefined) {
            setProgress(data.progress)
          }

          // Add log message
          if (data.message) {
            const timestamp = new Date().toLocaleTimeString('tr-TR')
            setLogs(prev => [...prev, {
              timestamp,
              message: data.message,
              type: data.type || 'info'
            }])
          }

          // Handle completion
          if (data.type === 'complete') {
            eventSource.close()

            // Store completion data
            setCompletionData({
              report_id: data.report_id,
              total_products: data.total_products,
              successful: data.successful
            })

            // Show completion modal
            setShowCompletionModal(true)
            setGenerating(false)
          }

          // Handle error
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
        console.error('EventSource readyState:', eventSource.readyState)
        console.error('EventSource url:', eventSource.url)
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
      // Navigate to report dashboard
      window.location.href = `/reports/${completionData.report_id}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
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

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 border-l-4 border-l-blue-600">
        <div className="flex items-start">
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-gray-900">Rapor Oluşturma Süreci</h3>
            <div className="mt-2 text-sm text-gray-600">
              <ol className="list-decimal list-inside space-y-1">
                <li>Ana kategoriyi seçin</li>
                <li>(Opsiyonel) Sadece bir alt kategori seçebilirsiniz</li>
                <li>"Rapor Oluştur" butonuna tıklayın</li>
                <li>Sistem seçili kategorilerden verileri çekecek</li>
                <li>Rapora bir ad verin ve kaydedin</li>
                <li>"Raporlarım" sekmesinden raporlarınızı görüntüleyin</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          1. Kategori Seçin
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainCategories.map((category) => (
            <div
              key={category.id}
              onClick={() => {
                if (!generating) {
                  setSelectedCategory(category)
                  fetchSubCategories(category.id)
                }
              }}
              className={`bg-white border-l-4 ${selectedCategory?.id === category.id ? 'border-blue-600' : 'border-gray-300'} rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedCategory?.id === category.id ? 'ring-2 ring-blue-200' : ''
              } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
                <p className="text-xs text-gray-600">
                  {category.children_count || 0} alt kategori
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Category Selection (Optional) */}
      {selectedCategory && subCategories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            2. Alt Kategori Seçin (Opsiyonel)
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              İsterseniz sadece bir alt kategori için rapor oluşturabilirsiniz. Seçmezseniz tüm alt kategoriler için rapor oluşturulur.
            </p>

            {loadingSubCategories ? (
              <div className="text-center text-gray-500">Alt kategoriler yükleniyor...</div>
            ) : (
              <div className="space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Alt kategori ara... (örn: Telefon)"
                    value={subCategorySearch}
                    onChange={(e) => setSubCategorySearch(e.target.value)}
                    disabled={generating}
                    className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors ${
                      generating ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'
                    }`}
                  />
                  {subCategorySearch && (
                    <button
                      onClick={() => setSubCategorySearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selection info and controls */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">
                      {selectedSubCategories.length === 0
                        ? 'Tüm Alt Kategoriler Seçili'
                        : `${selectedSubCategories.length} Kategori Seçildi`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {selectedSubCategories.length > 0 && (
                      <button
                        onClick={() => !generating && setSelectedSubCategories([])}
                        disabled={generating}
                        className={`px-3 py-1 text-sm rounded-lg border-2 transition-all ${
                          generating
                            ? 'opacity-50 cursor-not-allowed'
                            : 'border-red-300 text-red-700 hover:bg-red-50'
                        }`}
                      >
                        Seçimi Temizle
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!generating) {
                          const filteredSubs = subCategories.filter((subCat) =>
                            subCat.name.toLowerCase().includes(subCategorySearch.toLowerCase())
                          )
                          setSelectedSubCategories(filteredSubs)
                        }
                      }}
                      disabled={generating}
                      className={`px-3 py-1 text-sm rounded-lg border-2 transition-all ${
                        generating
                          ? 'opacity-50 cursor-not-allowed'
                          : 'border-green-600 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {subCategorySearch ? 'Gösterilenleri Seç' : 'Tümünü Seç'}
                    </button>
                  </div>
                </div>

                {/* Sub-category options */}
                {(() => {
                  const filteredSubCategories = subCategories.filter((subCat) =>
                    subCat.name.toLowerCase().includes(subCategorySearch.toLowerCase())
                  )

                  return filteredSubCategories.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                      {filteredSubCategories.map((subCat) => {
                        const isSelected = selectedSubCategories.some(cat => cat.id === subCat.id)
                        return (
                          <div
                            key={subCat.id}
                            onClick={() => {
                              if (!generating) {
                                if (isSelected) {
                                  // Remove from selection
                                  setSelectedSubCategories(prev =>
                                    prev.filter(cat => cat.id !== subCat.id)
                                  )
                                } else {
                                  // Add to selection
                                  setSelectedSubCategories(prev => [...prev, subCat])
                                }
                              }
                            }}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent div onClick
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-600 cursor-pointer"
                                  disabled={generating}
                                />
                                <span className="text-sm font-medium text-gray-900">{subCat.name}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                      <p className="font-medium">Sonuç bulunamadı</p>
                      <p className="text-sm mt-1">"{subCategorySearch}" araması için kategori bulunamadı</p>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Button */}
      {selectedCategory && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {subCategories.length > 0 ? '3. Rapor Oluştur' : '2. Rapor Oluştur'}
          </h2>
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-gray-600 mb-4 text-center">
              <strong>{selectedCategory.name}</strong> kategorisi için{' '}
              {selectedSubCategories.length > 0 ? (
                <>
                  <strong>{selectedSubCategories.length}</strong> seçili alt kategoriden veri çekilecek
                </>
              ) : (
                <>
                  <strong>{selectedCategory.children_count}</strong> alt kategoriden veri çekilecek
                </>
              )}
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className={`px-8 py-4 rounded-lg font-medium text-lg transition-all ${
                generating
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {generating ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Rapor Oluşturuluyor... {progress}%
                </span>
              ) : (
                <>Rapor Oluştur</>
              )}
            </button>

            {/* Progress Bar */}
            {generating && (
              <div className="w-full max-w-md mt-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Logs */}
      {logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>Terminal - Rapor Oluşturuluyor</span>
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-600">Canlı</span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto border-2 border-gray-700">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-gray-400 text-xs font-mono ml-2">trendyol-analytics-terminal</span>
            </div>

            {/* Terminal Content */}
            {logs.map((log, index) => (
              <div
                key={index}
                className={`font-mono text-sm mb-2 ${
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
                    : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}

            {/* Auto-scroll anchor */}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rapora Ad Verin</h2>
            <p className="text-gray-600 mb-6">
              Rapor başarıyla oluşturuldu! Kaydetmek için bir isim verin.
            </p>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent mb-6"
              placeholder="Örn: Kasım Ayı Kozmetik Raporu"
              autoFocus
            />
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowNameModal(false)
                  setGenerating(false)
                }}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleStartReportGeneration}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Rapor Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal - Shows when report is 100% complete */}
      {showCompletionModal && completionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Rapor Tamamlandı!</h3>
              <p className="text-gray-600 mb-6">
                <strong>{reportName}</strong> başarıyla oluşturuldu.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Toplam Ürün:</span>
                  <span className="font-bold text-gray-900">{completionData.total_products}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Başarılı Kategori:</span>
                  <span className="font-bold text-green-600">{completionData.successful}</span>
                </div>
              </div>
              <button
                onClick={handleViewReport}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Raporu Görüntüle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportGeneration
