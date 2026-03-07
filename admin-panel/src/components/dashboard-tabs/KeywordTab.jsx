import { useState, useEffect, useMemo } from 'react'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG } from '../../config/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, LineChart, Line } from 'recharts'
import axios from 'axios'
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../../constants/chartColors'
import { Target, TrendingUp, Crosshair, DollarSign, Search, Filter, ArrowUpDown, ChevronDown, X, BarChart3, Loader2 } from 'lucide-react'

// Preset filter configurations
const PRESET_FILTERS = [
  {
    id: 'high_opportunity',
    label: 'Potansiyel Keywordler',
    description: 'Yüksek dönüşüm + Düşük rekabet',
    icon: '🎯',
    filters: {
      minPotentialScore: 60,
      competitionLevel: 'low',
      sortBy: 'potential_score',
      sortOrder: 'desc'
    },
    color: 'green'
  },
  {
    id: 'high_demand_low_supply',
    label: 'Talep Fazla Arz Az',
    description: 'Yüksek görüntülenme + Az ürün',
    icon: '📈',
    filters: {
      minViews: 5000,
      competitionLevel: 'low',
      sortBy: 'views',
      sortOrder: 'desc'
    },
    color: 'blue'
  },
  {
    id: 'long_tail_winners',
    label: 'Long-tail Kazananlar',
    description: '2+ kelime + Düşük rekabet',
    icon: '🎯',
    filters: {
      minWordCount: 2,  // NEW: 2+ word keywords
      maxWordCount: 4,  // NEW: up to 4 words
      competitionLevel: 'low',
      minConversionRate: 3,
      sortBy: 'conversion_rate',
      sortOrder: 'desc'
    },
    color: 'purple'
  },
  {
    id: 'high_revenue',
    label: 'Yüksek Ciro',
    description: 'En çok satış yapan keywordler',
    icon: '💰',
    filters: {
      minOrders: 1000,
      sortBy: 'orders',
      sortOrder: 'desc'
    },
    color: 'orange'
  },
  {
    id: 'trending_keywords',
    label: 'Trend Keywordler',
    description: 'Yüksek görüntülenme + Sepet ekleme',
    icon: '🔥',
    filters: {
      minViews: 10000,
      minConversionRate: 2,
      sortBy: 'views',
      sortOrder: 'desc'
    },
    color: 'red'
  },
  {
    id: 'underutilized',
    label: 'Keşfedilmemiş Fırsatlar',
    description: 'İyi performans + Az bilinen',
    icon: '💎',
    filters: {
      competitionLevel: 'low',
      minConversionRate: 4,
      minOrders: 100,
      sortBy: 'potential_score',
      sortOrder: 'desc'
    },
    color: 'indigo'
  }
]

export default function KeywordTab({ reportId }) {
  const [keywordData, setKeywordData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Preset and advanced filter state
  const [activePreset, setActivePreset] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({})
  const [showRareKeywords, setShowRareKeywords] = useState(false)  // NEW: Rare keywords visibility

  // Table sorting state
  const [tableSortKey, setTableSortKey] = useState('frequency')
  const [tableSortOrder, setTableSortOrder] = useState('desc')

  // Pagination state (Backend-driven)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const itemsPerPage = 100  // Backend pagination: 100 keywords per page

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Google Trends state - for table rows
  const [googleTrendsCache, setGoogleTrendsCache] = useState({})
  const [googleTrendsLoading, setGoogleTrendsLoading] = useState({})

  // Manual search Google Trends state
  const [searchGoogleTrendsData, setSearchGoogleTrendsData] = useState(null)
  const [searchGoogleTrendsLoading, setSearchGoogleTrendsLoading] = useState(false)
  const [searchGoogleTrendsError, setSearchGoogleTrendsError] = useState(null)

  // Google Trends Modal state
  const [googleTrendsModalOpen, setGoogleTrendsModalOpen] = useState(false)
  const [selectedKeywordForChart, setSelectedKeywordForChart] = useState(null)

  // Tooltip state
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const [filters, setFilters] = useState({
    minFrequency: 3,
    minLength: 3,
    minWordCount: 1,  // NEW: N-gram min word count
    maxWordCount: 3,  // NEW: N-gram max word count
    topN: 50,
    sortBy: 'frequency',
    sortOrder: 'desc',
    categoryFilter: '',
    competitionLevel: '',
    minOrders: '',
    minViews: '',
    minConversionRate: '',
    minPotentialScore: ''
  })

  useEffect(() => {
    fetchKeywordAnalysis()
  }, [reportId])

  const fetchKeywordAnalysis = async (page = currentPage, customFilters = null) => {
    try {
      // Use isLoadingPage for pagination, loading for initial load
      if (page === 1) {
        setLoading(true)
      } else {
        setIsLoadingPage(true)
      }

      // Use customFilters if provided (for immediate filter application), otherwise use state
      const activeFilters = customFilters || filters
      setError(null)

      // 🔍 Step 1: Backend health check (only on initial load)
      if (page === 1) {
        console.log('🏥 [KEYWORD] Checking backend health...')
        try {
          const healthResponse = await fetchWithTimeout(`${API_URL}/`, {
            timeout: 5000
          })
          if (!healthResponse.ok) {
            throw new Error('Backend unhealthy')
          }
          console.log('✅ [KEYWORD] Backend is healthy')
        } catch (healthErr) {
          console.error('❌ [KEYWORD] Backend health check failed:', healthErr)
          throw new Error(
            '🚨 Backend sunucusu yanıt vermiyor!\n\n' +
            '💡 Çözüm:\n' +
            '1. Terminal açın\n' +
            '2. Komutu çalıştırın: cd backend && python3 main.py\n' +
            '3. Backend başladıktan sonra bu sayfayı yenileyin\n\n' +
            'veya\n\n' +
            'Otomatik başlatma: python3 start.py'
          )
        }
      }

      // 🎯 Step 2: Fetch keyword analysis with pagination
      const params = new URLSearchParams({
        min_frequency: activeFilters.minFrequency,
        min_length: activeFilters.minLength,
        min_word_count: activeFilters.minWordCount,
        max_word_count: activeFilters.maxWordCount,
        page: page,  // Backend pagination
        per_page: itemsPerPage,  // 100 keywords per page
        sort_by: activeFilters.sortBy,
        sort_order: activeFilters.sortOrder
      })

      if (activeFilters.categoryFilter) params.append('category_filter', activeFilters.categoryFilter)
      if (activeFilters.competitionLevel) params.append('competition_level', activeFilters.competitionLevel)
      if (activeFilters.minOrders) params.append('min_orders', activeFilters.minOrders)
      if (activeFilters.minViews) params.append('min_views', activeFilters.minViews)
      if (activeFilters.minConversionRate) params.append('min_conversion_rate', activeFilters.minConversionRate)
      if (activeFilters.minPotentialScore) params.append('min_potential_score', activeFilters.minPotentialScore)

      const url = `${API_URL}/api/reports/${reportId}/keyword-analysis?${params}`
      console.log(`📊 [KEYWORD] Fetching page ${page}:`, url)

      const response = await fetchWithTimeout(url, {
        timeout: TIMEOUT_CONFIG.KEYWORD_ANALYSIS
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [KEYWORD] API Error:', response.status, errorText)

        if (response.status === 404) {
          throw new Error(
            '📁 Rapor verisi bulunamadı!\n\n' +
            `Rapor ID: ${reportId}\n` +
            'Social proof verisi eksik olabilir.'
          )
        } else if (response.status === 500) {
          throw new Error(
            '⚠️ Sunucu hatası!\n\n' +
            'Backend işleme sırasında hata oluştu.\n' +
            'Backend console\'unda detayları kontrol edin.'
          )
        } else {
          throw new Error(`Keyword analizi yüklenemedi (HTTP ${response.status})`)
        }
      }

      const data = await response.json()
      console.log(`✅ [KEYWORD] Page ${page} data received:`, data)
      console.log(`📄 [KEYWORD] Pagination:`, data.pagination)

      setKeywordData(data)

      // Update pagination metadata
      if (data.pagination) {
        setTotalPages(data.pagination.total_pages)
        setCurrentPage(data.pagination.page)
      }
    } catch (err) {
      console.error('❌ [KEYWORD] Error:', err)
      setError(err.message || 'Bilinmeyen bir hata oluştu')
    } finally {
      setLoading(false)
      setIsLoadingPage(false)
    }
  }

  // Fetch Google Trends for table rows and open modal
  const fetchGoogleTrendsForKeyword = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
      return
    }

    // Check cache first
    if (googleTrendsCache[keyword]) {
      // Open modal with cached data
      setSelectedKeywordForChart({ keyword, data: googleTrendsCache[keyword] })
      setGoogleTrendsModalOpen(true)
      return googleTrendsCache[keyword]
    }

    // Mark as loading
    setGoogleTrendsLoading(prev => ({ ...prev, [keyword]: true }))

    try {
      const response = await axios.get(
        `${API_URL}/api/products/traffic-sources`,
        {
          params: { product_names: keyword.trim() },
          timeout: 15000
        }
      )

      if (response.data.success && response.data.results) {
        const trendsData = response.data.results[keyword.trim()]

        // Cache the result
        setGoogleTrendsCache(prev => ({ ...prev, [keyword]: trendsData }))

        // Open modal with fetched data
        setSelectedKeywordForChart({ keyword, data: trendsData })
        setGoogleTrendsModalOpen(true)

        return trendsData
      }
    } catch (error) {
      console.error('Google Trends fetch error for', keyword, ':', error)
    } finally {
      setGoogleTrendsLoading(prev => ({ ...prev, [keyword]: false }))
    }

    return null
  }

  // Preset filter handlers
  // Fetch Google Trends for search query (manual search box)
  const fetchSearchGoogleTrends = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
      return
    }

    setSearchGoogleTrendsLoading(true)
    setSearchGoogleTrendsError(null)

    try {
      const response = await axios.get(
        `${API_URL}/api/products/traffic-sources`,
        {
          params: { product_names: keyword.trim() },
          timeout: 15000
        }
      )

      if (response.data.success && response.data.results) {
        const trendsData = response.data.results[keyword.trim()]
        setSearchGoogleTrendsData(trendsData)
      } else {
        setSearchGoogleTrendsError('Veri alınamadı')
      }
    } catch (error) {
      console.error('Google Trends fetch error:', error)
      setSearchGoogleTrendsError(error.message || 'Bir hata oluştu')
    } finally {
      setSearchGoogleTrendsLoading(false)
    }
  }

  const applyPresetFilter = (preset) => {
    console.log('🎯 [FILTER] Applying preset:', preset.label)
    setActivePreset(preset.id)

    // Convert preset filter keys to match our filter state
    const presetFilters = {}
    Object.keys(preset.filters).forEach(key => {
      presetFilters[key] = preset.filters[key]
    })

    // Merge new filters with existing ones
    const updatedFilters = { ...filters, ...presetFilters }

    // Update state for UI
    setFilters(updatedFilters)

    // Fetch immediately with the merged filters (don't wait for state update)
    fetchKeywordAnalysis(1, updatedFilters)
  }

  const clearPreset = () => {
    console.log('🗑️ [FILTER] Clearing preset')
    setActivePreset(null)
    // Reset to default filters
    setFilters({
      minFrequency: 3,
      minLength: 3,
      minWordCount: 1,  // NEW: Reset to default
      maxWordCount: 3,  // NEW: Reset to default
      topN: 50,
      sortBy: 'frequency',
      sortOrder: 'desc',
      categoryFilter: '',
      competitionLevel: '',
      minOrders: '',
      minViews: '',
      minConversionRate: '',
      minPotentialScore: ''
    })
    setTimeout(() => fetchKeywordAnalysis(), 100)
  }

  const applyAdvancedFilters = () => {
    console.log('🔍 [FILTER] Applying advanced filters:', advancedFilters)
    setFilters(prev => ({ ...prev, ...advancedFilters }))
    setTimeout(() => fetchKeywordAnalysis(), 100)
  }

  const clearAdvancedFilters = () => {
    console.log('🗑️ [FILTER] Clearing advanced filters')
    setAdvancedFilters({})
    // Keep preset filters if any, but clear advanced
    setTimeout(() => fetchKeywordAnalysis(), 100)
  }

  const clearAllFilters = () => {
    console.log('🗑️ [FILTER] Clearing all filters')
    setActivePreset(null)
    setAdvancedFilters({})
    setFilters({
      minFrequency: 3,
      minLength: 3,
      topN: 50,
      sortBy: 'frequency',
      sortOrder: 'desc',
      categoryFilter: '',
      competitionLevel: '',
      minOrders: '',
      minViews: '',
      minConversionRate: '',
      minPotentialScore: ''
    })
    setTimeout(() => fetchKeywordAnalysis(), 100)
  }

  const getColorClass = (color, type = 'border') => {
    const colorMap = {
      green: type === 'border' ? 'border-green-500 bg-green-50' : 'bg-green-100 text-green-800',
      blue: type === 'border' ? 'border-blue-500 bg-blue-50' : 'bg-blue-100 text-blue-800',
      purple: type === 'border' ? 'border-purple-500 bg-purple-50' : 'bg-purple-100 text-purple-800',
      orange: type === 'border' ? 'border-orange-500 bg-orange-50' : 'bg-orange-100 text-orange-800',
      red: type === 'border' ? 'border-red-500 bg-red-50' : 'bg-red-100 text-red-800',
      indigo: type === 'border' ? 'border-indigo-500 bg-indigo-50' : 'bg-indigo-100 text-indigo-800'
    }
    return colorMap[color] || 'border-slate-200'
  }

  // Long-tail vs Short-tail classification
  const classifiedKeywords = useMemo(() => {
    if (!keywordData?.keywords) return { longTail: [], shortTail: [] }

    const frequencies = keywordData.keywords.map(k => k.frequency).sort((a, b) => a - b)
    const lowCompThreshold = frequencies[Math.floor(frequencies.length * 0.33)]

    return keywordData.keywords.reduce((acc, kw) => {
      const wordCount = kw.keyword.split(' ').length
      const isLongTail = wordCount >= 3 || kw.frequency <= lowCompThreshold

      if (isLongTail) {
        acc.longTail.push({ ...kw, type: 'long-tail' })
      } else {
        acc.shortTail.push({ ...kw, type: 'short-tail' })
      }

      return acc
    }, { longTail: [], shortTail: [] })
  }, [keywordData])

  // Calculate opportunity score
  const calculateOpportunityScore = (keyword) => {
    if (!keywordData?.keywords) return 0

    const maxFreq = Math.max(...keywordData.keywords.map(k => k.frequency))
    const maxConversion = Math.max(...keywordData.keywords.map(k => k.performance.conversion_rate))

    const normalizedCompetition = 100 - (keyword.frequency / maxFreq * 100)
    const normalizedConversion = (keyword.performance.conversion_rate / maxConversion) * 100

    return Math.round((normalizedConversion * 0.6) + (normalizedCompetition * 0.4))
  }

  // Calculate keyword revenue
  const calculateRevenue = (keyword) => {
    if (!keyword.products || keyword.products.length === 0) return 0

    const avgPrice = keyword.products.reduce((sum, p) => sum + (p.price || 0), 0) / keyword.products.length
    return keyword.performance.total_orders * avgPrice
  }

  // KPI calculations
  const kpis = useMemo(() => {
    if (!keywordData?.keywords) return null

    const totalRevenue = keywordData.keywords.reduce((sum, kw) => sum + calculateRevenue(kw), 0)
    const avgOrdersPerKeyword = keywordData.keywords.reduce((sum, kw) =>
      sum + kw.performance.total_orders, 0
    ) / keywordData.keywords.length

    const topConversionKw = [...keywordData.keywords].sort((a, b) =>
      b.performance.conversion_rate - a.performance.conversion_rate
    )[0]

    const longTailPercentage = (classifiedKeywords.longTail.length / keywordData.keywords.length) * 100

    return {
      totalKeywords: keywordData.total_keywords,
      longTailPercentage: Math.round(longTailPercentage),
      longTailCount: classifiedKeywords.longTail.length,
      avgOrdersPerKeyword: Math.round(avgOrdersPerKeyword),
      topConversionRate: topConversionKw?.performance.conversion_rate.toFixed(1) || 0,
      topConversionKeyword: topConversionKw?.keyword || 'N/A',
      totalRevenue
    }
  }, [keywordData, classifiedKeywords])

  // Table sorting handler - triggers backend fetch with new sort
  const handleTableSort = (key) => {
    let newSortOrder = 'desc'

    if (tableSortKey === key) {
      // Toggle order if same key
      newSortOrder = tableSortOrder === 'asc' ? 'desc' : 'asc'
    }

    setTableSortKey(key)
    setTableSortOrder(newSortOrder)

    // Update filters and trigger backend fetch
    setFilters(prev => ({ ...prev, sortBy: key, sortOrder: newSortOrder }))
    setTimeout(() => fetchKeywordAnalysis(1), 100)
  }

  // Backend-provided keywords (no frontend sorting/pagination needed)
  const displayKeywords = keywordData?.keywords || []

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
      fetchKeywordAnalysis(1)
    }
  }, [filters, advancedFilters, searchQuery])

  // Pagination controls
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchKeywordAnalysis(newPage)
    }
  }

  // Long-tail vs short-tail stats
  const typeStats = useMemo(() => {
    if (!classifiedKeywords.longTail.length && !classifiedKeywords.shortTail.length) return null

    const calcAvg = (keywords, field) => {
      if (keywords.length === 0) return 0
      return keywords.reduce((sum, kw) => sum + kw.performance[field], 0) / keywords.length
    }

    return {
      longTail: {
        avgOrders: Math.round(calcAvg(classifiedKeywords.longTail, 'total_orders')),
        avgConversion: calcAvg(classifiedKeywords.longTail, 'conversion_rate').toFixed(2)
      },
      shortTail: {
        avgOrders: Math.round(calcAvg(classifiedKeywords.shortTail, 'total_orders')),
        avgConversion: calcAvg(classifiedKeywords.shortTail, 'conversion_rate').toFixed(2)
      }
    }
  }, [classifiedKeywords])

  // Calculate maxFreq for component-wide usage
  const maxFreq = useMemo(() => {
    if (!keywordData?.keywords || keywordData.keywords.length === 0) return 1
    return Math.max(...keywordData.keywords.map(k => k.frequency))
  }, [keywordData])

  // Filter rare keywords to show only those with sales
  const filteredRareKeywords = useMemo(() => {
    if (!keywordData?.rare_keywords) return []
    return keywordData.rare_keywords.filter(kw => kw.performance.total_orders > 0)
  }, [keywordData])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const applyFilters = () => {
    fetchKeywordAnalysis()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Keyword analizi yapılıyor...</p>
          <p className="text-sm text-slate-400 mt-2">Bu işlem 30-60 saniye sürebilir</p>
          <p className="text-xs text-slate-400 mt-1">Lütfen bekleyin...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⚠️</span>
          <h3 className="text-red-800 font-semibold text-lg">Hata Oluştu</h3>
        </div>
        <pre className="text-red-700 whitespace-pre-wrap font-mono text-sm bg-red-100 p-4 rounded-xl border border-red-300 mb-4">
          {error}
        </pre>
        <button
          onClick={fetchKeywordAnalysis}
          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
        >
          🔄 Tekrar Dene
        </button>
      </div>
    )
  }

  if (!keywordData?.keywords || keywordData.keywords.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📊</span>
          <h3 className="text-yellow-800 font-semibold text-lg">Keyword Bulunamadı</h3>
        </div>
        <p className="text-yellow-600">Bu rapor için keyword analizi yapılamadı. Lütfen farklı filtreler deneyin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preset Filter Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <span>⚡</span>
          Hızlı Filtreler
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PRESET_FILTERS.map(preset => {
            const getGradientClass = (color) => {
              const colorMap = {
                green: 'bg-gradient-to-br from-green-500 to-green-600 border-green-400',
                blue: 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400',
                purple: 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-400',
                orange: 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400',
                red: 'bg-gradient-to-br from-red-500 to-red-600 border-red-400',
                indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400'
              }
              return colorMap[color] || 'bg-gradient-to-br from-slate-500 to-slate-600 border-slate-400'
            }

            return (
              <button
                key={preset.id}
                onClick={() => applyPresetFilter(preset)}
                className={`
                  p-3 rounded-xl border-2 transition-all duration-200 text-white
                  hover:shadow-lg hover:scale-105
                  ${getGradientClass(preset.color)}
                  ${activePreset === preset.id ? 'shadow-md ring-2 ring-white' : ''}
                `}
              >
                <div className="text-2xl mb-1">{preset.icon}</div>
                <div className="text-xs font-semibold">
                  {preset.label}
                </div>
                <div className="text-xs opacity-90 mt-1 line-clamp-2">
                  {preset.description}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Filter Tags */}
      {(activePreset || Object.keys(advancedFilters).length > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-orange-800">Aktif Filtreler:</span>

            {activePreset && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                {PRESET_FILTERS.find(p => p.id === activePreset)?.label}
                <button onClick={clearPreset} className="ml-1 hover:text-orange-900 font-bold">×</button>
              </span>
            )}

            {Object.keys(advancedFilters).length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                {Object.keys(advancedFilters).length} gelişmiş filtre
                <button onClick={clearAdvancedFilters} className="ml-1 hover:text-slate-900 font-bold">×</button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Tümünü Temizle
            </button>
          </div>
        </div>
      )}

      {/* Basic Filter Panel */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-orange-500" />
          Temel Filtreler
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sıralama</label>
            <select
              name="sortBy"
              value={filters.sortBy}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="frequency">Sıklık (Ürün Sayısı)</option>
              <option value="orders">Toplam Satış</option>
              <option value="views">Toplam Görüntülenme</option>
              <option value="conversion_rate">Dönüşüm Oranı</option>
              <option value="potential_score">Fırsat Skoru</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Rekabet Seviyesi</label>
            <select
              name="competitionLevel"
              value={filters.competitionLevel}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Tüm Seviyeler</option>
              <option value="low">Düşük Rekabet</option>
              <option value="medium">Orta Rekabet</option>
              <option value="high">Yüksek Rekabet</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min. Satış</label>
            <input
              type="number"
              name="minOrders"
              value={filters.minOrders}
              onChange={handleFilterChange}
              placeholder="Örn: 100"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min. Görüntülenme</label>
            <input
              type="number"
              name="minViews"
              value={filters.minViews}
              onChange={handleFilterChange}
              placeholder="Örn: 1000"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* NEW: Min Frequency Slider */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Min. Sıklık (Kaç üründe geçmeli?) 🎯
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                name="minFrequency"
                value={filters.minFrequency}
                onChange={handleFilterChange}
                min="1"
                max="10"
                className="flex-1 h-2 bg-slate-200 rounded-xl appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${(filters.minFrequency - 1) * 11.11}%, #e2e8f0 ${(filters.minFrequency - 1) * 11.11}%, #e2e8f0 100%)`
                }}
              />
              <span className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded-xl text-sm font-bold min-w-[3rem] text-center">
                {filters.minFrequency}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Keyword en az <strong>{filters.minFrequency}</strong> üründe geçmeli
            </div>
          </div>

          {/* NEW: Word Count Filters */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Min. Kelime Sayısı 💡
            </label>
            <input
              type="number"
              name="minWordCount"
              value={filters.minWordCount}
              onChange={handleFilterChange}
              min="1"
              max="5"
              placeholder="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="text-xs text-slate-400 mt-1">
              1=tek kelime, 2=iki kelime, vb.
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Max. Kelime Sayısı 💡
            </label>
            <input
              type="number"
              name="maxWordCount"
              value={filters.maxWordCount}
              onChange={handleFilterChange}
              min="1"
              max="5"
              placeholder="3"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="text-xs text-slate-400 mt-1">
              Long-tail için 2-4 arası önerilir
            </div>
          </div>
        </div>

        {/* Filtreleri Uygula Button */}
        <div className="mt-4">
          <button
            onClick={applyFilters}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all text-sm font-medium shadow-sm"
          >
            Filtreleri Uygula
          </button>
        </div>

        {/* Gelişmiş Filtreler - Collapsible Section */}
        <div className="mt-4 border-t pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between hover:bg-orange-50/30 transition-colors p-2 rounded-xl"
          >
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span>⚙️</span>
              Gelişmiş Filtreler
              {Object.keys(advancedFilters).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                  {Object.keys(advancedFilters).length} aktif
                </span>
              )}
            </h4>
            <ChevronDown className={`w-4 h-4 text-slate-400 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Conversion Rate Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Dönüşüm Oranı (%)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min %"
                      value={advancedFilters.minConversionRate || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minConversionRate: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Max %"
                      value={advancedFilters.maxConversionRate || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxConversionRate: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Views Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Görüntülenme Aralığı</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.minViews || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minViews: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.maxViews || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxViews: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Orders Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Satış Aralığı</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.minOrders || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minOrders: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.maxOrders || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxOrders: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Reviews Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Yorum Sayısı</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.minReviews || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minReviews: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.maxReviews || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxReviews: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ortalama Fiyat (₺)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min ₺"
                      value={advancedFilters.minAvgPrice || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minAvgPrice: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Max ₺"
                      value={advancedFilters.maxAvgPrice || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxAvgPrice: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Word Count Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kelime Sayısı</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      min="1"
                      value={advancedFilters.minWordCount || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minWordCount: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      min="1"
                      value={advancedFilters.maxWordCount || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxWordCount: e.target.value }))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Örn: Min 3, Max 5 (long-tail)</p>
                </div>

                {/* Potential Score */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Minimum Fırsat Skoru</label>
                  <select
                    value={advancedFilters.minPotentialScore || ''}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minPotentialScore: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Tümü</option>
                    <option value="40">Düşük (40+)</option>
                    <option value="60">Orta (60+)</option>
                    <option value="70">Yüksek (70+)</option>
                    <option value="85">Çok Yüksek (85+)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={clearAdvancedFilters}
                  className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-orange-50/30 text-sm font-medium"
                >
                  🗑️ Temizle
                </button>
                <button
                  onClick={applyAdvancedFilters}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-medium"
                >
                  ✅ Gelişmiş Filtreleri Uygula
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Long-tail vs Short-tail Comparison */}
      {typeStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎯</span>
              <h3 className="text-lg font-semibold text-green-800">Long-tail Keywords</h3>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-4">{classifiedKeywords.longTail.length}</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Ort. Satış</span>
                <span className="text-lg font-semibold text-green-700">{typeStats.longTail.avgOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Ort. Dönüşüm</span>
                <span className="text-lg font-semibold text-green-700">%{typeStats.longTail.avgConversion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Rekabet</span>
                <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">Düşük</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔥</span>
              <h3 className="text-lg font-semibold text-orange-800">Short-tail Keywords</h3>
            </div>
            <p className="text-4xl font-bold text-orange-500 mb-4">{classifiedKeywords.shortTail.length}</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Ort. Satış</span>
                <span className="text-lg font-semibold text-orange-700">{typeStats.shortTail.avgOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Ort. Dönüşüm</span>
                <span className="text-lg font-semibold text-orange-700">%{typeStats.shortTail.avgConversion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Rekabet</span>
                <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">Yüksek</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Search Box */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSearchGoogleTrendsData(null) // Clear Google Trends when search changes
              }}
              placeholder="Keyword ara... (örn: ayakkabı, tişört, spor)"
              className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl text-sm focus:outline-none transition-all ${
                searchQuery.trim()
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  fetchSearchGoogleTrends(searchQuery)
                }
              }}
            />
            {searchQuery.trim() && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchGoogleTrendsData(null)
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                title="Aramayı temizle"
              >
                <span className="text-xl font-bold">×</span>
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold shadow-sm">
                {displayKeywords.length} sonuç
              </span>
              <button
                onClick={() => fetchSearchGoogleTrends(searchQuery)}
                disabled={searchGoogleTrendsLoading}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Google Trends'de ara"
              >
                {searchGoogleTrendsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span>Google Trends</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <span className="font-medium">Arama yapılıyor:</span>
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md font-medium">
              "{searchQuery}"
            </span>
            <span className="text-slate-400">
              - Hem keyword hem de kategori isimlerinde aranıyor
            </span>
          </div>
        )}

        {/* Google Trends Results */}
        {searchGoogleTrendsData && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <span>📊</span>
              <span>Google Trends: "{searchQuery}"</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Volume */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Arama Hacmi (Son 3 Ay)</div>
                <div className="text-2xl font-bold text-green-600">
                  {(searchGoogleTrendsData.raw_scores?.google || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {searchGoogleTrendsData.disclaimer}
                </div>
              </div>

              {/* Trend Direction */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Trend Yönü</div>
                <div className="text-2xl font-bold">
                  {searchGoogleTrendsData.google_trend === 'rising' && '📈 Yükseliyor'}
                  {searchGoogleTrendsData.google_trend === 'falling' && '📉 Düşüyor'}
                  {searchGoogleTrendsData.google_trend === 'stable' && '➡️ Sabit'}
                  {searchGoogleTrendsData.google_trend === 'no_data' && '⚠️ Veri Yok'}
                  {searchGoogleTrendsData.google_trend === 'unknown' && '❓ Bilinmiyor'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Son 4 hafta vs Önceki 4 hafta
                </div>
              </div>

              {/* Comparison */}
              {searchGoogleTrendsData.recent_avg !== undefined && searchGoogleTrendsData.previous_avg !== undefined && (
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">Ortalama Karşılaştırma</div>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-xs text-slate-400">Son 4 hafta</div>
                      <div className="text-lg font-bold text-orange-500">
                        {searchGoogleTrendsData.recent_avg.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-2xl">→</div>
                    <div>
                      <div className="text-xs text-slate-400">Önceki 4 hafta</div>
                      <div className="text-lg font-bold text-slate-500">
                        {searchGoogleTrendsData.previous_avg.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cache Info */}
            {searchGoogleTrendsData.from_cache && (
              <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                <span>💾</span>
                <span>Önbellekten yüklendi (6 saat geçerli)</span>
              </div>
            )}
          </div>
        )}

        {/* Google Trends Error */}
        {searchGoogleTrendsError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="text-sm text-red-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>{searchGoogleTrendsError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Keywords Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 relative">
        {/* Loading Overlay */}
        {isLoadingPage && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Sayfa yükleniyor...</p>
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-orange-500" />
          En İyi Performans Gösteren Keywords
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th
                  onClick={() => handleTableSort('keyword')}
                  className="border border-slate-200 p-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Keyword
                    {tableSortKey === 'keyword' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleTableSort('frequency')}
                  className="border border-slate-200 p-3 text-center font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    Sıklık
                    {tableSortKey === 'frequency' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleTableSort('orders')}
                  className="border border-slate-200 p-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Satış
                    {tableSortKey === 'orders' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleTableSort('views')}
                  className="border border-slate-200 p-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Görüntülenme
                    {tableSortKey === 'views' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleTableSort('conversion')}
                  className="border border-slate-200 p-3 text-center font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    Dönüşüm
                    {tableSortKey === 'conversion' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleTableSort('baskets')}
                  className="border border-slate-200 p-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Sepet
                    {tableSortKey === 'baskets' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleTableSort('revenue')}
                  className="border border-slate-200 p-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Ciro
                    {tableSortKey === 'revenue' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">
                  En Çok Kullanılan
                </th>
                <th
                  onClick={() => handleTableSort('opportunity')}
                  className="border border-slate-200 p-3 text-center font-semibold text-slate-700 cursor-pointer hover:bg-orange-50/30 transition-colors relative group"
                >
                  <div className="flex items-center justify-center gap-1">
                    Fırsat
                    {tableSortKey === 'opportunity' && (
                      <span className="text-orange-500">{tableSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                    <span className="text-orange-500 text-xs cursor-help">ℹ️</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute hidden group-hover:block bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl z-50 w-64 left-1/2 transform -translate-x-1/2 top-full mt-2">
                    <div className="font-semibold mb-2">📊 Fırsat Skoru (0-100)</div>
                    <div className="space-y-1 text-left">
                      <div>* <strong>D:</strong> Dönüşüm oranı (%60 ağırlık)</div>
                      <div>* <strong>R:</strong> Rekabet azlığı (%40 ağırlık)</div>
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <div className="text-green-400">70+ : Yüksek fırsat</div>
                        <div className="text-yellow-400">40-69 : Orta fırsat</div>
                        <div className="text-slate-400">0-39 : Düşük fırsat</div>
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>
                </th>
                <th className="border border-slate-200 p-3 text-center font-semibold text-slate-700">
                  Google Trends
                </th>
                <th className="border border-slate-200 p-3 text-center font-semibold text-slate-700">
                  Top 10 Ürünler
                </th>
              </tr>
            </thead>
            <tbody>
              {displayKeywords.map((kw) => {
                const revenue = calculateRevenue(kw)
                const opportunityScore = calculateOpportunityScore(kw)
                const trendsData = googleTrendsCache[kw.keyword]
                const isLoading = googleTrendsLoading[kw.keyword]

                return (
                  <tr key={kw.keyword} className="hover:bg-orange-50/30 even:bg-slate-50/50 transition-colors">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">{kw.keyword}</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">
                      {kw.frequency} ürün
                    </td>
                    <td className="border border-slate-200 p-3 text-right font-semibold text-green-600">
                      {kw.performance.total_orders.toLocaleString('tr-TR')}
                    </td>
                    <td className="border border-slate-200 p-3 text-right text-slate-700">
                      {kw.performance.total_views.toLocaleString('tr-TR')}
                    </td>
                    <td className="border border-slate-200 p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        kw.performance.conversion_rate > 5
                          ? 'bg-green-100 text-green-800'
                          : kw.performance.conversion_rate > 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        %{kw.performance.conversion_rate.toFixed(1)}
                      </span>
                    </td>
                    <td className="border border-slate-200 p-3 text-right text-slate-700">
                      {kw.performance.total_baskets.toLocaleString('tr-TR')}
                    </td>
                    <td className="border border-slate-200 p-3 text-right font-semibold text-orange-500">
                      ₺{revenue >= 1000 ? `${(revenue / 1000).toFixed(0)}K` : revenue.toFixed(0)}
                    </td>
                    <td className="border border-slate-200 p-3 text-slate-700">
                      <span className="font-medium">{kw.top_categories[0]?.category || 'N/A'}</span>
                    </td>
                    <td className="border border-slate-200 p-3 text-center">
                      <div className="flex flex-col">
                        <div className={`font-bold ${
                          opportunityScore >= 70 ? 'text-green-600' :
                          opportunityScore >= 40 ? 'text-yellow-600' :
                          'text-slate-500'
                        }`}>
                          {opportunityScore}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          D:{kw.performance.conversion_rate.toFixed(1)}% × R:{(100 - (kw.frequency / maxFreq * 100)).toFixed(0)}%
                        </div>
                      </div>
                    </td>
                    <td className="border border-slate-200 p-3 text-center">
                      {isLoading ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                        </div>
                      ) : (
                        <button
                          onClick={() => fetchGoogleTrendsForKeyword(kw.keyword)}
                          className={`px-3 py-1 rounded-xl text-xs transition-colors ${
                            trendsData
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          📊 {trendsData ? 'Grafik' : 'Ara'}
                        </button>
                      )}
                    </td>
                    <td className="border border-slate-200 p-3">
                      <div className="flex gap-1 overflow-x-auto max-w-[400px] pb-1">
                        {kw.products?.slice(0, 10).map((product, idx) => (
                          <div key={idx} className="flex-shrink-0">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border border-slate-300 hover:ring-2 hover:ring-orange-500 cursor-pointer transition-all"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/150?text=No+Image'
                              }}
                              onClick={() => {
                                if (product.url) {
                                  window.open(product.url, '_blank', 'noopener,noreferrer')
                                }
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.target.getBoundingClientRect()
                                setTooltipPosition({
                                  x: rect.left + rect.width / 2,
                                  y: rect.bottom + 10
                                })
                                setHoveredProduct(product)
                              }}
                              onMouseLeave={() => {
                                setHoveredProduct(null)
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Kontrolleri - Sadece birden fazla sayfa varsa */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              <span className="font-medium">Toplam {keywordData.pagination.total_items?.toLocaleString('tr-TR') || 0} keyword bulundu</span>
              <span className="ml-2 text-slate-400">(Sayfa {currentPage}/{totalPages})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || isLoadingPage}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ««
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoadingPage}
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
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoadingPage}
                      className={`px-3 py-1.5 text-sm border rounded-xl transition-colors ${
                        currentPage === pageNum
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-slate-300 hover:bg-orange-50/30'
                      } ${isLoadingPage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoadingPage}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki ›
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || isLoadingPage}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rare Keywords Section - Collapsible */}
      {filteredRareKeywords.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <button
            onClick={() => setShowRareKeywords(!showRareKeywords)}
            className="w-full flex items-center justify-between hover:bg-orange-50/30 transition-colors p-2 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <h3 className="text-lg font-semibold text-slate-800">
                Rare Keywords (Nadide Keywordler)
              </h3>
              <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                {filteredRareKeywords.length} satışlı keyword
              </span>
              <span className="ml-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                Sadece satışı olanlar
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transform transition-transform ${showRareKeywords ? 'rotate-180' : ''}`} />
          </button>

          {showRareKeywords && (
            <div className="mt-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-purple-800">
                  <strong>💡 Bilgi:</strong> Bu keywordler sadece <strong>1-2 üründe</strong> geçiyor.
                  Benzersiz,틈새 (niche) fırsatları temsil eder. Rekabet düşük, keşfedilmemiş alanlar olabilir.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50">
                      <th className="border border-purple-200 p-3 text-left font-semibold text-purple-800">Keyword</th>
                      <th className="border border-purple-200 p-3 text-center font-semibold text-purple-800">Sıklık</th>
                      <th className="border border-purple-200 p-3 text-right font-semibold text-purple-800">Satış</th>
                      <th className="border border-purple-200 p-3 text-right font-semibold text-purple-800">Görüntülenme</th>
                      <th className="border border-purple-200 p-3 text-center font-semibold text-purple-800">Dönüşüm</th>
                      <th className="border border-purple-200 p-3 text-right font-semibold text-purple-800">Sepet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRareKeywords.map((kw) => (
                      <tr key={kw.keyword} className="hover:bg-purple-50 transition-colors">
                        <td className="border border-purple-200 p-3 font-medium text-slate-800">{kw.keyword}</td>
                        <td className="border border-purple-200 p-3 text-center">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                            {kw.frequency} ürün
                          </span>
                        </td>
                        <td className="border border-purple-200 p-3 text-right font-semibold text-green-600">
                          {kw.performance.total_orders.toLocaleString('tr-TR')}
                        </td>
                        <td className="border border-purple-200 p-3 text-right text-slate-700">
                          {kw.performance.total_views.toLocaleString('tr-TR')}
                        </td>
                        <td className="border border-purple-200 p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            kw.performance.conversion_rate > 5
                              ? 'bg-green-100 text-green-800'
                              : kw.performance.conversion_rate > 2
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            %{kw.performance.conversion_rate.toFixed(1)}
                          </span>
                        </td>
                        <td className="border border-purple-200 p-3 text-right text-slate-700">
                          {kw.performance.total_baskets.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>📊 Analiz Özeti:</strong> {keywordData.total_keywords} keyword bulundu,
          {keywordData.total_products_analyzed} ürün analiz edildi.
          Long-tail keywords %{kpis?.longTailPercentage} oranında.
          Toplam tahmini ciro: ₺{((kpis?.totalRevenue || 0) / 1000).toFixed(0)}K
        </p>
      </div>

      {/* Fixed Positioned Tooltip */}
      {hoveredProduct && (
        <div
          className="fixed z-[9999] bg-white shadow-2xl rounded-xl p-4 w-80 border-2 border-orange-500 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <img
            src={hoveredProduct.image_url}
            className="w-full h-48 object-cover rounded mb-3"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'
            }}
          />
          <h4 className="font-bold text-slate-800 mb-2 text-sm leading-tight">{hoveredProduct.name}</h4>
          <div className="space-y-1 text-sm">
            <p className="text-slate-700"><strong>Marka:</strong> {hoveredProduct.brand}</p>
            <p className="text-slate-700"><strong>Fiyat:</strong> ₺{hoveredProduct.price?.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || 'N/A'}</p>
            <p className="text-slate-700"><strong>Satış:</strong> {hoveredProduct.orders?.toLocaleString('tr-TR') || '0'}</p>
            <p className="text-slate-700"><strong>Görüntülenme:</strong> {hoveredProduct.views?.toLocaleString('tr-TR') || '0'}</p>
          </div>
        </div>
      )}

      {/* Google Trends Chart Modal */}
      {googleTrendsModalOpen && selectedKeywordForChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  📊 Google Trends Analizi
                </h2>
                <p className="text-slate-500 mt-1">
                  <strong>Keyword:</strong> "{selectedKeywordForChart.keyword}"
                </p>
              </div>
              <button
                onClick={() => {
                  setGoogleTrendsModalOpen(false)
                  setSelectedKeywordForChart(null)
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-sm text-green-600 font-semibold mb-1">Arama Hacmi</div>
                  <div className="text-2xl font-bold text-green-700">
                    {selectedKeywordForChart.data.raw_scores?.google?.toLocaleString('tr-TR') || '0'}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Son 3 Ay Toplamı</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-semibold mb-1">Trend Yönü</div>
                  <div className="text-2xl font-bold text-orange-700 flex items-center gap-2">
                    {selectedKeywordForChart.data.google_trend === 'rising' && '📈 Yükseliyor'}
                    {selectedKeywordForChart.data.google_trend === 'falling' && '📉 Düşüyor'}
                    {selectedKeywordForChart.data.google_trend === 'stable' && '➡️ Sabit'}
                    {selectedKeywordForChart.data.google_trend === 'no_data' && '⚠️ Veri Yok'}
                    {selectedKeywordForChart.data.google_trend === 'unknown' && '❓ Bilinmiyor'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-semibold mb-1">Son 4 Hafta</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {selectedKeywordForChart.data.recent_avg?.toFixed(1) || '0'}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">Ortalama Popülarite</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-semibold mb-1">Önceki 4 Hafta</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {selectedKeywordForChart.data.previous_avg?.toFixed(1) || '0'}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">Ortalama Popülarite</div>
                </div>
              </div>

              {/* Chart */}
              {selectedKeywordForChart.data.timeseries && selectedKeywordForChart.data.timeseries.length > 0 ? (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Zaman Serisi Grafiği (Son 3 Ay)
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={selectedKeywordForChart.data.timeseries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(date) => {
                          const d = new Date(date)
                          return `${d.getDate()}/${d.getMonth() + 1}`
                        }}
                      />
                      <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        {...CHART_TOOLTIP_STYLE}
                        labelFormatter={(date) => {
                          const d = new Date(date)
                          return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'long' })} ${d.getFullYear()}`
                        }}
                        formatter={(value) => [`${value} / 100`, 'Popülarite']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Chart Legend */}
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-green-500 rounded"></div>
                      <span>Popülarite Skoru (0-100)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                  <p className="text-yellow-700">
                    ⚠️ Zaman serisi verisi bulunamadı. Grafik gösterilemiyor.
                  </p>
                </div>
              )}

              {/* Info Section */}
              <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800">
                  <strong>ℹ️ Bilgi:</strong> Google Trends verileri Türkiye pazarı için son 3 aylık dönemi kapsamaktadır.
                  Popülarite skoru 0-100 arasında değişir ve en yüksek arama hacmine göre normalize edilir.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
