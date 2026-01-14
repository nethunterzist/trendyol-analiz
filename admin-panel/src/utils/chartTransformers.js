/**
 * Chart Data Transformers
 * Backend'den gelen verileri chart formatına dönüştürür
 */

/**
 * Hidden Champions için Bubble Chart verisi transform et
 * X: Rating, Y: Conversion Rate, Z (bubble size): Hidden Champion Score
 */
export function transformHiddenChampionsForBubbleChart(championsData) {
  try {
    if (!championsData || !championsData.hidden_champions || !Array.isArray(championsData.hidden_champions)) {
      return []
    }

    return championsData.hidden_champions
      .filter(champion => champion != null)
      .map(champion => {
        const rating = Number(champion.rating) || 0
        const conversionRate = Number(champion.conversion_rate) || 0
        const score = Number(champion.hidden_champion_score) || 0
        
        return {
          x: rating,
          y: conversionRate,
          z: score,
          name: (champion.name || 'Ürün').substring(0, 40),
          brand: champion.brand || 'Unknown',
          category: champion.category || '',
          price: Number(champion.price) || 0,
          orders: Number(champion.orders) || 0,
          page_views: Number(champion.page_views) || 0,
          baskets: Number(champion.baskets) || 0,
          // Bubble rengi: competition level'a göre
          fill: getCompetitionColor(champion.competition_level || 'medium'),
          // Bubble boyutu: score'a göre normalize (50-500 arası)
          size: normalizeBubbleSize(score),
          // Tooltip için ekstra bilgiler
          tooltip: {
            score: score,
            rating: rating,
            conversion: conversionRate,
            views: Number(champion.page_views) || 0,
            orders: Number(champion.orders) || 0
          }
        }
      })
      .filter(item => item.x > 0 && item.y >= 0) // Geçerli verileri filtrele
  } catch (error) {
    console.error('transformHiddenChampionsForBubbleChart error:', error)
    return []
  }
}

/**
 * Rekabet seviyesine göre renk
 */
function getCompetitionColor(level) {
  const colors = {
    low: '#10b981',    // Yeşil - Düşük rekabet
    medium: '#f59e0b', // Sarı - Orta rekabet
    high: '#ef4444'    // Kırmızı - Yüksek rekabet
  }
  return colors[level] || '#6b7280'
}

/**
 * Bubble boyutunu normalize et (50-500 arası)
 */
function normalizeBubbleSize(score) {
  // Score 0-100 arası, bubble size 50-500 arası
  return 50 + (score / 100) * 450
}

/**
 * Investment Risk için Radar Chart verisi
 */
export function transformInvestmentRiskForRadarChart(riskData) {
  if (!riskData || !riskData.detaylar) {
    return []
  }

  const detailScores = [
    { name: 'Rekabet', value: riskData.detaylar.rekabet_skoru, weight: 0.25 },
    { name: 'Pazar Boyutu', value: riskData.detaylar.pazar_boyutu_skoru, weight: 0.20 },
    { name: 'Karlılık', value: riskData.detaylar.karlilik_skoru, weight: 0.20 },
    { name: 'Giriş Bariyeri', value: riskData.detaylar.giris_bariyeri_skoru, weight: 0.15 },
    { name: 'Büyüme', value: riskData.detaylar.buyume_skoru, weight: 0.20 }
  ]

  return detailScores.map(score => ({
    subject: score.name,
    A: score.value,
    fullMark: 100
  }))
}

/**
 * Top Brands için Bar Chart verisi
 */
export function transformTopBrandsForBarChart(topBrands) {
  if (!topBrands || !Array.isArray(topBrands)) {
    return []
  }

  return topBrands.map(brand => ({
    name: brand.brand?.substring(0, 20) || 'Unknown',
    value: brand.market_share,
    count: brand.product_count,
    fullName: brand.brand
  }))
}

/**
 * Market Share Validation için Summary
 */
export function transformMarketShareValidation(validation) {
  if (!validation) {
    return null
  }

  return {
    top10Share: validation.top_10_total_share,
    totalBrands: validation.total_brands_count,
    fragmentationLevel: validation.top_10_total_share < 20 ? 'Yüksek' : 
                        validation.top_10_total_share < 40 ? 'Orta' : 'Düşük',
    opportunity: validation.top_10_total_share < 20 ? 'Çok Yüksek' :
                 validation.top_10_total_share < 40 ? 'Yüksek' : 'Orta'
  }
}

