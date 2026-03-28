import { useState, useEffect, useRef } from 'react'
import { API_URL, fetchWithTimeout } from '../config/api'
import { Search, ChevronRight, Loader2, X, Layers } from 'lucide-react'

/**
 * Miller Columns category selector (sahibinden.com style)
 * Shows cascading columns: click a category → its children appear in the next column
 */
function CategorySelector({ onSelect, disabled = false }) {
  const [allCategories, setAllCategories] = useState([])
  const [columns, setColumns] = useState([])       // [{parentId, items, selectedId}]
  const [breadcrumb, setBreadcrumb] = useState([])  // [{id, name}]
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchMode, setSearchMode] = useState(false)
  const columnsRef = useRef(null)

  // Load all categories once
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/category-tree`)
      if (!res.ok) throw new Error('Failed to load categories')
      const data = await res.json()
      setAllCategories(data)

      // Initialize with root categories
      const roots = data.filter(c => c.level === 0)
      setColumns([{ parentId: null, items: roots, selectedId: null }])
    } catch (err) {
      console.error('Category load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getChildren = (parentId) => {
    return allCategories.filter(c => c.parentId === parentId)
  }

  const handleItemClick = (item, columnIndex) => {
    if (disabled) return

    const children = getChildren(item.id)

    // Update selection in current column
    const newColumns = columns.slice(0, columnIndex + 1)
    newColumns[columnIndex] = { ...newColumns[columnIndex], selectedId: item.id }

    // Add children column if exists
    if (children.length > 0) {
      newColumns.push({ parentId: item.id, items: children, selectedId: null })
    }

    setColumns(newColumns)

    // Build breadcrumb
    const newBreadcrumb = []
    for (let i = 0; i <= columnIndex; i++) {
      const col = newColumns[i]
      if (col.selectedId) {
        const selected = col.items.find(c => c.id === col.selectedId)
        if (selected) newBreadcrumb.push({ id: selected.id, name: selected.name })
      }
    }
    setBreadcrumb(newBreadcrumb)

    // Notify parent — always pass clicked category info
    if (onSelect) {
      onSelect({
        id: item.id,
        name: item.name,
        path: [...newBreadcrumb.map(b => b.name)].join(' > '),
        hasChildren: children.length > 0,
        isLeaf: children.length === 0,
        level: item.level,
        url: item.url
      })
    }

    // Scroll to show new column
    setTimeout(() => {
      if (columnsRef.current) {
        columnsRef.current.scrollLeft = columnsRef.current.scrollWidth
      }
    }, 50)
  }

  const handleBreadcrumbClick = (index) => {
    if (disabled) return

    if (index === -1) {
      // Click on root — reset everything
      const roots = allCategories.filter(c => c.level === 0)
      setColumns([{ parentId: null, items: roots, selectedId: null }])
      setBreadcrumb([])
      setSearchMode(false)
      if (onSelect) onSelect(null)
      return
    }

    const target = breadcrumb[index]
    const newColumns = columns.slice(0, index + 2)
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    setColumns(newColumns)
  }

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const q = searchQuery.toLowerCase()
    const results = allCategories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30)
    setSearchResults(results)
  }, [searchQuery, allCategories])

  const handleSearchSelect = (item) => {
    if (disabled) return

    // Build the full path and open all columns
    const pathParts = item.path.split(' > ')
    const newColumns = []
    const newBreadcrumb = []

    // Start with roots
    const roots = allCategories.filter(c => c.level === 0)
    let currentItems = roots
    let selectedId = null

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      const found = currentItems.find(c => c.name === part)

      if (found) {
        selectedId = found.id
        newColumns.push({ parentId: found.parentId, items: currentItems, selectedId: found.id })
        newBreadcrumb.push({ id: found.id, name: found.name })

        const children = getChildren(found.id)
        if (children.length > 0 && i < pathParts.length - 1) {
          currentItems = children
        } else if (children.length > 0) {
          // Last item has children — show them
          newColumns.push({ parentId: found.id, items: children, selectedId: null })
        }
      }
    }

    setColumns(newColumns)
    setBreadcrumb(newBreadcrumb)
    setSearchMode(false)
    setSearchQuery('')

    if (onSelect) {
      const children = getChildren(item.id)
      onSelect({
        id: item.id,
        name: item.name,
        path: item.path,
        hasChildren: children.length > 0,
        isLeaf: children.length === 0,
        level: item.level,
        url: item.url
      })
    }

    setTimeout(() => {
      if (columnsRef.current) {
        columnsRef.current.scrollLeft = columnsRef.current.scrollWidth
      }
    }, 50)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-orange-400 mr-2" />
        <span className="text-sm text-slate-400">Kategoriler yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Adım Adım Kategori Seç</h2>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm flex-wrap min-h-[24px]">
          {breadcrumb.length > 0 ? (
            <>
              {breadcrumb.map((crumb, index) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                  {index < breadcrumb.length - 1 ? (
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      disabled={disabled}
                      className="text-orange-500 hover:text-orange-600 hover:underline font-medium transition-colors"
                    >
                      {crumb.name}
                    </button>
                  ) : (
                    <span className="text-slate-700 font-medium">{crumb.name}</span>
                  )}
                </span>
              ))}
            </>
          ) : (
            <span className="text-slate-400 text-xs">Bir kategori seçin</span>
          )}
        </nav>
      </div>

      {/* Miller Columns */}
      {!searchMode && (
        <div
          ref={columnsRef}
          className="flex overflow-x-auto border-b border-slate-100"
          style={{ scrollBehavior: 'smooth' }}
        >
          {columns.map((column, colIndex) => (
            <div
              key={`${column.parentId}-${colIndex}`}
              className="min-w-[220px] max-w-[260px] flex-shrink-0 border-r border-slate-100 last:border-r-0"
            >
              <div className="max-h-[380px] overflow-y-auto">
                {column.items.map((item) => {
                  const isSelected = column.selectedId === item.id
                  const children = getChildren(item.id)
                  const hasChildren = children.length > 0

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item, colIndex)}
                      disabled={disabled}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-orange-50 text-orange-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="truncate pr-2">{item.name}</span>
                      {hasChildren && (
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isSelected ? 'text-orange-400' : 'text-slate-300'
                        }`} />
                      )}
                      {!hasChildren && isSelected && (
                        <Layers className="w-3.5 h-3.5 flex-shrink-0 text-orange-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchMode && searchResults.length > 0 && (
        <div className="max-h-[380px] overflow-y-auto border-b border-slate-100">
          {searchResults.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSearchSelect(item)}
              disabled={disabled}
              className="w-full text-left px-5 py-3 text-sm hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-b-0"
            >
              <span className="font-medium text-slate-800">{item.name}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{item.path}</span>
            </button>
          ))}
        </div>
      )}

      {searchMode && searchQuery.length >= 2 && searchResults.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-slate-400 border-b border-slate-100">
          Sonuç bulunamadı
        </div>
      )}

      {/* Divider with "veya" */}
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">veya</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder="Kelime ile Arayarak Kategori Seç"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchMode(e.target.value.length >= 2)
            }}
            onFocus={() => {
              if (searchQuery.length >= 2) setSearchMode(true)
            }}
            disabled={disabled}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchMode(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategorySelector
