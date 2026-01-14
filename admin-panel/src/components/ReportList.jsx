import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_URL, fetchWithTimeout } from '../config/api'

function ReportList() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz Rapor Yok</h3>
        <p className="text-gray-600 mb-6">
          "Rapor Oluştur" sekmesinden ilk raporunuzu oluşturun
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Raporlarım</h1>
        <p className="text-sm text-gray-600 mt-1">
          Toplam {reports.length} rapor
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-600 p-6 hover:shadow-md transition-shadow"
          >
            {/* Report Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {report.category_name}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-gray-600 font-medium mb-1">Alt Kategori</p>
                <p className="text-lg font-bold text-gray-900">
                  {report.total_subcategories}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-600 font-medium mb-1">Ürün</p>
                <p className="text-lg font-bold text-gray-900">
                  {report.total_products.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="text-xs text-gray-500 mb-4">
              {formatDate(report.created_at)}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Link
                to={`/reports/${report.id}`}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm text-center"
              >
                Görüntüle
              </Link>
              <button
                onClick={() => handleDeleteReport(report.id, report.name)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReportList
