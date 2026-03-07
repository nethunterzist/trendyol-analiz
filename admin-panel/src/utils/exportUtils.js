import * as XLSX from 'xlsx'

/**
 * Export dashboard data to Excel
 * @param {object} dashboardData - Full dashboard data
 * @param {string} reportName - Report name for the file
 */
export function exportToExcel(dashboardData, reportName) {
  if (!dashboardData) return

  const wb = XLSX.utils.book_new()
  const products = dashboardData.all_products || []

  // Sheet 1: KPI Summary
  const kpiData = []
  const totalProducts = products.length
  const totalOrders = products.reduce((s, p) => s + (p.orders || 0), 0)
  const totalViews = products.reduce((s, p) => s + (p.page_views || 0), 0)
  const avgPrice = totalProducts > 0
    ? Math.round(products.reduce((s, p) => s + (p.price || 0), 0) / totalProducts)
    : 0
  const totalRevenue = products.reduce((s, p) => s + ((p.price || 0) * (p.orders || 0)), 0)

  // Unique brands
  const uniqueBrands = new Set(products.map(p => p.brand).filter(Boolean))

  kpiData.push(['Metrik', 'Değer'])
  kpiData.push(['Rapor Adı', reportName])
  kpiData.push(['Toplam Ürün', totalProducts])
  kpiData.push(['Toplam Sipariş', totalOrders])
  kpiData.push(['Toplam Görüntülenme', totalViews])
  kpiData.push(['Ortalama Fiyat (₺)', avgPrice])
  kpiData.push(['Toplam Ciro (₺)', Math.round(totalRevenue)])
  kpiData.push(['Toplam Marka', uniqueBrands.size])

  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData)
  kpiSheet['!cols'] = [{ wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPI Özet')

  // Sheet 2: All Products
  if (products.length > 0) {
    const productRows = products.map(p => ({
      'Ürün Adı': p.name || '',
      'Marka': p.brand || '',
      'Kategori': p.category_name || '',
      'Fiyat (₺)': p.price || 0,
      'Sipariş': p.orders || 0,
      'Görüntülenme': p.page_views || 0,
      'Rating': p.rating || 0,
      'Yorum Sayısı': p.review_count || p.reviewCount || 0,
      'Menşei': p.country || '',
      'Barkod': p.barcode || '',
      'URL': p.url || ''
    }))

    const productSheet = XLSX.utils.json_to_sheet(productRows)
    productSheet['!cols'] = [
      { wch: 50 }, // name
      { wch: 20 }, // brand
      { wch: 25 }, // category
      { wch: 12 }, // price
      { wch: 10 }, // orders
      { wch: 15 }, // views
      { wch: 8 },  // rating
      { wch: 12 }, // reviews
      { wch: 15 }, // country
      { wch: 18 }, // barcode
      { wch: 40 }, // url
    ]
    XLSX.utils.book_append_sheet(wb, productSheet, 'Tüm Ürünler')
  }

  // Sheet 3: Brand Summary
  const brandMap = new Map()
  products.forEach(p => {
    const brand = p.brand || 'Bilinmeyen'
    if (!brandMap.has(brand)) {
      brandMap.set(brand, { name: brand, count: 0, orders: 0, revenue: 0 })
    }
    const b = brandMap.get(brand)
    b.count++
    b.orders += (p.orders || 0)
    b.revenue += (p.price || 0) * (p.orders || 0)
  })

  const brandRows = Array.from(brandMap.values())
    .sort((a, b) => b.orders - a.orders)
    .map(b => ({
      'Marka': b.name,
      'Ürün Sayısı': b.count,
      'Toplam Sipariş': b.orders,
      'Toplam Ciro (₺)': Math.round(b.revenue)
    }))

  if (brandRows.length > 0) {
    const brandSheet = XLSX.utils.json_to_sheet(brandRows)
    brandSheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, brandSheet, 'Marka Özet')
  }

  // Generate filename
  const date = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
  const safeName = (reportName || 'rapor').replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s-]/g, '').trim().replace(/\s+/g, '_')
  const filename = `${safeName}_${date}.xlsx`

  XLSX.writeFile(wb, filename)
}

/**
 * Print the current report dashboard
 */
export function printReport() {
  window.print()
}
