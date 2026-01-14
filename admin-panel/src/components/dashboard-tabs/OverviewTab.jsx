export default function OverviewTab({
  overviewKPIs,
  topSellingProducts,
  topSellingBrands,
  topSellingCategories,
  mostViewedCategories
}) {
  if (!overviewKPIs) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Genel bakış verileri yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Toplam Ürün</p>
              <p className="text-3xl font-bold mt-2">
                {overviewKPIs.totalProducts.toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Toplam Satın Alma</p>
              <p className="text-3xl font-bold mt-2">
                {overviewKPIs.totalOrders.toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Toplam Görüntülenme</p>
              <p className="text-3xl font-bold mt-2">
                {overviewKPIs.totalViews.toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Toplam Ciro</p>
              <p className="text-3xl font-bold mt-2">
                ₺{(overviewKPIs.totalRevenue || 0).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Ortalama Fiyat</p>
              <p className="text-3xl font-bold mt-2">
                ₺{overviewKPIs.avgPrice.toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Top Products & Top Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Satış Yapan Ürünler */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Satış Yapan Ürünler</h3>
          <div className="space-y-3">
            {topSellingProducts.map((product, index) => (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-600">₺{product.price?.toLocaleString('tr-TR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{product.orders?.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-gray-600">satış</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* En Çok Satış Yapan Marka */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Satış Yapan Marka</h3>
          <div className="space-y-3">
            {topSellingBrands.map((brand, index) => (
              <a
                key={index}
                href={`https://www.trendyol.com/sr?q=${encodeURIComponent(brand.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{brand.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{brand.totalOrders.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-gray-600">toplam satış</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Top Categories by Revenue & Most Viewed Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Satış Yapan Kategoriler */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Satış Yapan Kategoriler</h3>
          <div className="space-y-3">
            {topSellingCategories.map((category, index) => (
              <a
                key={index}
                href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{category.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₺{category.revenue.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-gray-600">toplam ciro</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* En Çok Görüntülenme Alan Kategoriler */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Görüntülenme Alan Kategoriler</h3>
          <div className="space-y-3">
            {mostViewedCategories.map((category, index) => (
              <a
                key={index}
                href={`https://www.trendyol.com/sr?q=${encodeURIComponent(category.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{category.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{category.views.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-gray-600">görüntülenme</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
