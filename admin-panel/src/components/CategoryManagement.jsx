import { useState, useEffect } from 'react'
import { API_URL, fetchWithTimeout } from '../config/api'
import { FolderTree, ChevronRight, ExternalLink, Layers, Loader2, FolderOpen, ArrowLeft } from 'lucide-react'

function CategoryManagement() {
  const [mainCategories, setMainCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [subCategories, setSubCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSubCategories, setLoadingSubCategories] = useState(false)
  const [error, setError] = useState(null)
  // Breadcrumb trail for deep navigation
  const [breadcrumb, setBreadcrumb] = useState([])

  // Fetch main categories on mount
  useEffect(() => {
    fetchMainCategories()
  }, [])

  const fetchMainCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithTimeout(`${API_URL}/categories/main`)
      if (!response.ok) throw new Error('Failed to fetch main categories')
      const data = await response.json()
      setMainCategories(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubCategories = async (categoryId) => {
    setLoadingSubCategories(true)
    try {
      const response = await fetchWithTimeout(`${API_URL}/categories/${categoryId}/children`)
      if (!response.ok) throw new Error('Failed to fetch subcategories')
      const data = await response.json()
      setSubCategories(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSubCategories(false)
    }
  }

  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    setBreadcrumb([category])
    fetchSubCategories(category.id)
  }

  const handleSubCategoryClick = (subCat) => {
    if (subCat.children_count > 0) {
      setBreadcrumb(prev => [...prev, subCat])
      setSelectedCategory(subCat)
      fetchSubCategories(subCat.id)
    }
  }

  const handleBreadcrumbClick = (index) => {
    const target = breadcrumb[index]
    // Trim breadcrumb to clicked level
    setBreadcrumb(breadcrumb.slice(0, index + 1))
    setSelectedCategory(target)
    fetchSubCategories(target.id)
  }

  const handleBackToMain = () => {
    setSelectedCategory(null)
    setBreadcrumb([])
    setSubCategories([])
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Kategori Yönetimi</h1>
        <p className="text-sm text-slate-500 mt-1">
          Toplam {mainCategories.length} ana kategori
        </p>
      </div>

      {/* Main Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mainCategories.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className={`bg-white border-l-4 ${selectedCategory?.id === category.id && breadcrumb.length === 1 ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-300'} rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{category.name}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {category.children_count || 0} alt kategori
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Subcategories Panel */}
      {selectedCategory && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200">
            <button
              onClick={handleBackToMain}
              className="text-slate-400 hover:text-orange-500 transition-colors"
              title="Ana kategorilere dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <nav className="flex items-center gap-1 text-sm flex-wrap">
              {breadcrumb.map((crumb, index) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                  {index < breadcrumb.length - 1 ? (
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="text-orange-500 hover:text-orange-600 hover:underline font-medium"
                    >
                      {crumb.name}
                    </button>
                  ) : (
                    <span className="text-slate-900 font-semibold">{crumb.name}</span>
                  )}
                </span>
              ))}
            </nav>

            <span className="ml-auto text-sm text-slate-400">
              {subCategories.length} kategori
            </span>
          </div>

          {loadingSubCategories ? (
            <div className="text-center py-8 text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : subCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Bu kategoride alt kategori bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Kategori Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Alt Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Trendyol ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Trendyol URL
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {subCategories.map((subCat, index) => (
                    <tr
                      key={subCat.id}
                      onClick={() => handleSubCategoryClick(subCat)}
                      className={`hover:bg-orange-50/30 ${subCat.children_count > 0 ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {subCat.children_count > 0 ? (
                            <FolderOpen className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Layers className="w-4 h-4 text-slate-300" />
                          )}
                          {subCat.name}
                          {subCat.children_count > 0 && (
                            <ChevronRight className="w-4 h-4 text-orange-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {subCat.children_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                            {subCat.children_count} alt kategori
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {subCat.trendyol_category_id || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {subCat.trendyol_url ? (
                          <a
                            href={subCat.trendyol_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Trendyol'da Aç
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryManagement
