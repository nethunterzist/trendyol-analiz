import { useState, useEffect } from 'react'
import { API_URL, fetchWithTimeout } from '../config/api'
import { getCategoryIcon, getCategoryColors } from '../constants/categories'

function CategoryManagement() {
  const [mainCategories, setMainCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [subCategories, setSubCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSubCategories, setLoadingSubCategories] = useState(false)
  const [error, setError] = useState(null)

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
    fetchSubCategories(category.id)
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Ana Kategoriler</h1>
        <p className="text-sm text-gray-600 mt-1">
          Toplam {mainCategories.length} ana kategori
        </p>
      </div>

      {/* Main Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mainCategories.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className={`bg-white border-l-4 ${selectedCategory?.id === category.id ? 'border-blue-600' : 'border-gray-300'} rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow ${
              selectedCategory?.id === category.id ? 'ring-2 ring-blue-200' : ''
            }`}
          >
            <div className="flex flex-col space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-600">
                {category.children_count || 0} alt kategori
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Subcategories Table */}
      {selectedCategory && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedCategory.name} - Alt Kategoriler
            </h2>
            <span className="text-sm text-gray-600">
              {subCategories.length} kategori
            </span>
          </div>

          {loadingSubCategories ? (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          ) : subCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bu kategoride alt kategori bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trendyol ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trendyol URL
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subCategories.map((subCat, index) => (
                    <tr key={subCat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subCat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subCat.trendyol_category_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {subCat.trendyol_url ? (
                          <a
                            href={subCat.trendyol_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Trendyol'da Aç
                          </a>
                        ) : (
                          <span className="text-gray-400">Link yok</span>
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
