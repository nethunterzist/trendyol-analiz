import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Star, X, Filter, SlidersHorizontal } from 'lucide-react'

export default function ProductFinderTab({ allProducts }) {

  // Filter state
  const [filters, setFilters] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('productFinderFilters')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved filters:', e)
      }
    }
    return {
      searchText: '',
      category: '',
      brand: '',
      country: '',
      minPrice: '',
      maxPrice: '',
      minOrders: '',
      minViews: '',
      minReviews: '',
      maxReviews: '',
      minRating: '',
      sortBy: 'orders',
      sortOrder: 'desc'
    }
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('productFinderFilters', JSON.stringify(filters))
  }, [filters])

  // Extract unique categories, brands, and countries from products
  const { uniqueCategories, uniqueBrands, uniqueCountries } = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return { uniqueCategories: [], uniqueBrands: [], uniqueCountries: [] }
    }

    const categories = [...new Set(allProducts.map(p => p.category_name).filter(Boolean))].sort()
    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort()
    const countries = [...new Set(allProducts.map(p => p.country).filter(Boolean))].sort()

    return {
      uniqueCategories: categories,
      uniqueBrands: brands,
      uniqueCountries: countries
    }
  }, [allProducts])

  // Debounced search text
  const [searchText, setSearchText] = useState(filters.searchText)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchText }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return []
    }

    let result = [...allProducts]

    // Text search (name, brand, barcode)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.brand?.toLowerCase().includes(searchLower) ||
        p.barcode?.includes(filters.searchText)
      )
    }

    // Category filter
    if (filters.category) {
      result = result.filter(p => p.category_name === filters.category)
    }

    // Brand filter
    if (filters.brand) {
      result = result.filter(p => p.brand === filters.brand)
    }

    // Country filter
    if (filters.country) {
      result = result.filter(p => p.country === filters.country)
    }

    // Price range filter
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice)
      result = result.filter(p => p.price >= minPrice)
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice)
      result = result.filter(p => p.price <= maxPrice)
    }

    // Orders filter
    if (filters.minOrders) {
      const minOrders = parseInt(filters.minOrders)
      result = result.filter(p => (p.orders || 0) >= minOrders)
    }

    // Views filter
    if (filters.minViews) {
      const minViews = parseInt(filters.minViews)
      result = result.filter(p => (p.page_views || 0) >= minViews)
    }

    // Reviews filter (min)
    if (filters.minReviews) {
      const minReviews = parseInt(filters.minReviews)
      result = result.filter(p => ((p.reviews || p.rating_count) || 0) >= minReviews)
    }

    // Reviews filter (max)
    if (filters.maxReviews) {
      const maxReviews = parseInt(filters.maxReviews)
      result = result.filter(p => ((p.reviews || p.rating_count) || 0) <= maxReviews)
    }

    // Rating filter (minimum rating)
    if (filters.minRating) {
      const minRating = parseFloat(filters.minRating)
      result = result.filter(p => (p.rating || 0) >= minRating)
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (filters.sortBy) {
        case 'price':
          comparison = parseFloat(a.price || 0) - parseFloat(b.price || 0)
          break
        case 'orders':
          comparison = parseInt(a.orders || 0, 10) - parseInt(b.orders || 0, 10)
          break
        case 'views':
          comparison = parseInt(a.page_views || 0, 10) - parseInt(b.page_views || 0, 10)
          break
        case 'reviews':
          comparison = parseInt((a.reviews || a.rating_count) || 0, 10) - parseInt((b.reviews || b.rating_count) || 0, 10)
          break
        case 'rating':
          comparison = parseFloat(a.rating || 0) - parseFloat(b.rating || 0)
          break
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '', 'tr-TR')
          break
        default:
          comparison = 0
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [allProducts, filters])

  // Paginated products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Update filter handler
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Quick filter handlers
  const applyQuickFilter = useCallback((preset) => {
    setFilters(prev => ({ ...prev, ...preset }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchText('')
    setFilters({
      searchText: '',
      category: '',
      brand: '',
      country: '',
      minPrice: '',
      maxPrice: '',
      minOrders: '',
      minViews: '',
      minReviews: '',
      maxReviews: '',
      minRating: '',
      sortBy: 'orders',
      sortOrder: 'desc'
    })
  }, [])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.searchText) count++
    if (filters.category) count++
    if (filters.brand) count++
    if (filters.country) count++
    if (filters.minPrice) count++
    if (filters.maxPrice) count++
    if (filters.minOrders) count++
    if (filters.minViews) count++
    if (filters.minReviews) count++
    if (filters.maxReviews) count++
    if (filters.minRating) count++
    return count
  }, [filters])

  if (!allProducts || allProducts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-slate-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Henüz Ürün Yok</h3>
        <p className="text-slate-400">Ürün verisi yüklendiğinde burada görüntülenecektir.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <span>⚡</span>
          Hızlı Filtreler
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => applyQuickFilter({ minOrders: '100', minPrice: '', maxPrice: '' })}
            className="p-3 rounded-xl border-2 border-green-500 bg-green-50 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xs font-semibold text-slate-800">Çok Satanlar</div>
            <div className="text-xs text-slate-400 mt-1">(100+ satış)</div>
          </button>
          <button
            onClick={() => applyQuickFilter({ minViews: '5000', minPrice: '', maxPrice: '' })}
            className="p-3 rounded-xl border-2 border-purple-500 bg-purple-50 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="text-2xl mb-1">👁</div>
            <div className="text-xs font-semibold text-slate-800">Yüksek Görüntüleme</div>
            <div className="text-xs text-slate-400 mt-1">(5K+ görüntülenme)</div>
          </button>
          <button
            onClick={() => applyQuickFilter({ minPrice: '1000', maxPrice: '', minOrders: '', minViews: '' })}
            className="p-3 rounded-xl border-2 border-orange-500 bg-orange-50 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="text-2xl mb-1">💎</div>
            <div className="text-xs font-semibold text-slate-800">Premium</div>
            <div className="text-xs text-slate-400 mt-1">(1000+ TL)</div>
          </button>
          <button
            onClick={() => applyQuickFilter({ maxPrice: '200', minPrice: '', minOrders: '', minViews: '' })}
            className="p-3 rounded-xl border-2 border-blue-500 bg-blue-50 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xs font-semibold text-slate-800">Ekonomik</div>
            <div className="text-xs text-slate-400 mt-1">(&lt;200 TL)</div>
          </button>
          <button
            onClick={() => applyQuickFilter({ minReviews: '100', minPrice: '', maxPrice: '', minOrders: '', minViews: '' })}
            className="p-3 rounded-xl border-2 border-red-500 bg-red-50 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="text-2xl mb-1">💬</div>
            <div className="text-xs font-semibold text-slate-800">Çok Yorumlananlar</div>
            <div className="text-xs text-slate-400 mt-1">(100+ yorum)</div>
          </button>
          <button
            onClick={() => applyQuickFilter({ minRating: '4.5', minPrice: '', maxPrice: '', minOrders: '', minViews: '', minReviews: '' })}
            className="p-3 rounded-xl border-2 border-indigo-500 bg-indigo-50 transition-all duration-200 hover:shadow-md hover:scale-105"
          >
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-xs font-semibold text-slate-800">Yüksek Puanlılar</div>
            <div className="text-xs text-slate-400 mt-1">(4.5+ puan)</div>
          </button>
        </div>
        {activeFilterCount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-2"
            >
              <X size={16} />
              Filtreleri Temizle ({activeFilterCount})
            </button>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <Search size={12} /> Ürün, Marka veya Barkod Ara
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Örn: iPhone, Samsung, 8690000000000"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              📁 Kategori
            </label>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="">Tüm Kategoriler</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              🏷️ Marka
            </label>
            <select
              value={filters.brand}
              onChange={(e) => updateFilter('brand', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="">Tüm Markalar</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              💵 Min Fiyat (TL)
            </label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => updateFilter('minPrice', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              💵 Max Fiyat (TL)
            </label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', e.target.value)}
              placeholder="∞"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              🌍 Ülke/Menşei
            </label>
            <select
              value={filters.country}
              onChange={(e) => updateFilter('country', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="">Tüm Ülkeler</option>
              {uniqueCountries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Min Orders */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              🛒 Min Satış (Son 3 Gün)
            </label>
            <input
              type="number"
              value={filters.minOrders}
              onChange={(e) => updateFilter('minOrders', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Min Views */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              👁 Min Görüntülenme
            </label>
            <input
              type="number"
              value={filters.minViews}
              onChange={(e) => updateFilter('minViews', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Min Reviews */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              💬 Min Yorum Sayısı
            </label>
            <input
              type="number"
              value={filters.minReviews}
              onChange={(e) => updateFilter('minReviews', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Max Reviews */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              💬 Max Yorum Sayısı
            </label>
            <input
              type="number"
              value={filters.maxReviews}
              onChange={(e) => updateFilter('maxReviews', e.target.value)}
              placeholder="∞"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Min Rating */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              ⭐ Min Puan
            </label>
            <input
              type="number"
              value={filters.minRating}
              onChange={(e) => updateFilter('minRating', e.target.value)}
              placeholder="Örn: 4.0"
              min="0"
              max="5"
              step="0.5"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-xs font-medium text-slate-500">
              Sıralama:
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="orders">Satış Sayısı</option>
              <option value="views">Görüntülenme</option>
              <option value="reviews">Yorum Sayısı</option>
              <option value="price">Fiyat</option>
              <option value="name">Ürün Adı</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => updateFilter('sortOrder', e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="desc">Azalan (Yüksek → Düşük)</option>
              <option value="asc">Artan (Düşük → Yüksek)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-orange-900">Aktif Filtreler:</span>
            {filters.searchText && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Arama: "{filters.searchText}"
                <button onClick={() => setSearchText('')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Kategori: {filters.category}
                <button onClick={() => updateFilter('category', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.brand && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Marka: {filters.brand}
                <button onClick={() => updateFilter('brand', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.country && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Ülke: {filters.country}
                <button onClick={() => updateFilter('country', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.minPrice && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Min: ₺{parseFloat(filters.minPrice).toLocaleString('tr-TR')}
                <button onClick={() => updateFilter('minPrice', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.maxPrice && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Max: ₺{parseFloat(filters.maxPrice).toLocaleString('tr-TR')}
                <button onClick={() => updateFilter('maxPrice', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.minOrders && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Min Satış: {parseInt(filters.minOrders).toLocaleString('tr-TR')}
                <button onClick={() => updateFilter('minOrders', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.minViews && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Min Görüntülenme: {parseInt(filters.minViews).toLocaleString('tr-TR')}
                <button onClick={() => updateFilter('minViews', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.minReviews && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Min Yorum: {parseInt(filters.minReviews).toLocaleString('tr-TR')}
                <button onClick={() => updateFilter('minReviews', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.maxReviews && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Max Yorum: {parseInt(filters.maxReviews).toLocaleString('tr-TR')}
                <button onClick={() => updateFilter('maxReviews', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filters.minRating && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Min Puan: ⭐{parseFloat(filters.minRating).toFixed(1)}
                <button onClick={() => updateFilter('minRating', '')} className="hover:text-orange-900">×</button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-slate-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Sonuç Bulunamadı</h3>
          <p className="text-slate-400 mb-4">
            Aradığınız kriterlere uygun ürün bulunamadı. Lütfen filtrelerinizi değiştirin.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            Tüm Filtreleri Temizle
          </button>
        </div>
      ) : (
        <>
          {/* Products Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="p-3 text-left text-sm font-medium text-slate-400">
                      Görsel
                    </th>
                    <th scope="col" className="p-3 text-left text-sm font-medium text-slate-400">
                      Ürün Bilgisi
                    </th>
                    <th scope="col" className="p-3 text-left text-sm font-medium text-slate-400">
                      Marka
                    </th>
                    <th scope="col" className="p-3 text-left text-sm font-medium text-slate-400">
                      Kategori
                    </th>
                    <th scope="col" className="p-3 text-left text-sm font-medium text-slate-400">
                      Menşei
                    </th>
                    <th scope="col" className="p-3 text-right text-sm font-medium text-slate-400">
                      Fiyat
                    </th>
                    <th scope="col" className="p-3 text-right text-sm font-medium text-slate-400">
                      Satış
                    </th>
                    <th scope="col" className="p-3 text-right text-sm font-medium text-slate-400">
                      Görüntülenme
                    </th>
                    <th scope="col" className="p-3 text-right text-sm font-medium text-slate-400">
                      Yorum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedProducts.map((product) => {
                    const productUrl = product.url?.startsWith('http') ? product.url : `https://www.trendyol.com${product.url}`

                    return (
                      <tr key={product.id} className="hover:bg-orange-50/30 transition-colors">
                        {/* Image */}
                        <td className="p-3 whitespace-nowrap">
                          <a
                            href={productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-orange-500 transition-all"
                          >
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </a>
                        </td>

                        {/* Product Info */}
                        <td className="p-3">
                          <div className="max-w-md">
                            <a
                              href={productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-slate-900 hover:text-orange-600 transition-colors mb-1 block"
                              title={product.name}
                            >
                              {product.name}
                            </a>
                            {product.barcode && (
                              <div className="text-xs text-slate-400 mt-1">Barkod: {product.barcode}</div>
                            )}
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{product.brand || '-'}</div>
                        </td>

                        {/* Category */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{product.category_name || '-'}</div>
                        </td>

                        {/* Country */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {product.country ? (
                              <span className="inline-flex items-center gap-1">
                                <span>{product.country}</span>
                                <span className="text-xs text-slate-400">({product.country_code})</span>
                              </span>
                            ) : '-'}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="p-3 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-orange-500">
                            ₺{product.price?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* Orders */}
                        <td className="p-3 whitespace-nowrap text-right">
                          <div className="text-sm text-slate-900">
                            {(product.orders || 0).toLocaleString('tr-TR')}
                          </div>
                        </td>

                        {/* Views */}
                        <td className="p-3 whitespace-nowrap text-right">
                          <div className="text-sm text-slate-900">
                            {(product.page_views || 0).toLocaleString('tr-TR')}
                          </div>
                        </td>

                        {/* Reviews */}
                        <td className="p-3 whitespace-nowrap text-right">
                          <div className="text-sm text-slate-900">
                            {(product.reviews || product.rating_count || 0).toLocaleString('tr-TR')}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Sayfa {currentPage} / {totalPages} (Toplam {filteredProducts.length.toLocaleString('tr-TR')} ürün)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
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
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm border rounded-xl transition-colors ${
                            currentPage === pageNum
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-slate-300 hover:bg-orange-50/30'
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
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl hover:bg-orange-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    »»
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
