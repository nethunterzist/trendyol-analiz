import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TAB_GROUPS, ALL_TABS } from '../constants/tabGroups'
import { API_URL, fetchWithTimeout, TIMEOUT_CONFIG } from '../config/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, BarChart, Bar } from 'recharts'
import BarcodeTab from './dashboard-tabs/BarcodeTab'
import OriginTab from './dashboard-tabs/OriginTab'
import OverviewTab from './dashboard-tabs/OverviewTab'
import BrandTab from './dashboard-tabs/BrandTab'
import CategoryTab from './dashboard-tabs/CategoryTab'
import KeywordTab from './dashboard-tabs/KeywordTab'
import ProductFinderTab from './dashboard-tabs/ProductFinderTab'

function ReportDashboard() {
  const { reportId } = useParams()
  const navigate = useNavigate()

  // Basic state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Category table sorting state (CategoryTab içinde kullanılıyor)
  const [categorySortConfig, setCategorySortConfig] = useState({ key: 'totalOrders', direction: 'desc' })

  // Brand table sorting state (BrandTab içinde kullanılıyor)
  const [brandSortConfig, setBrandSortConfig] = useState({ key: 'totalOrders', direction: 'desc' })

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      console.log('🔄 [DASHBOARD] useEffect triggered, reportId:', reportId)

      if (!reportId) {
        console.warn('⚠️ [DASHBOARD] No reportId provided')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const apiUrl = `${API_URL}/api/reports/${reportId}/dashboard-data`
        console.log('📡 [DASHBOARD] Fetching from:', apiUrl)

        const response = await fetchWithTimeout(
          apiUrl,
          { timeout: TIMEOUT_CONFIG.DASHBOARD }
        )

        console.log('📥 [DASHBOARD] Response status:', response.status, response.statusText)

        if (!response.ok) {
          throw new Error('Dashboard verileri yüklenemedi')
        }

        const data = await response.json()
        console.log('✅ [DASHBOARD] Data received:', data)
        console.log('📊 [DASHBOARD] All products count:', data?.all_products?.length || 0)
        console.log('📋 [DASHBOARD] First product sample:', data?.all_products?.[0])

        setDashboardData(data)
      } catch (err) {
        console.error('❌ [DASHBOARD] Loading error:', err)
        console.error('❌ [DASHBOARD] Error stack:', err.stack)
        setError(err.message)
      } finally {
        setLoading(false)
        console.log('🏁 [DASHBOARD] Loading finished')
      }
    }

    loadDashboardData()
  }, [reportId])

  // Calculate KPIs for Overview tab
  const overviewKPIs = useMemo(() => {
    console.log('🧮 [KPI] Calculating KPIs...')
    console.log('🧮 [KPI] dashboardData exists:', !!dashboardData)
    console.log('🧮 [KPI] all_products exists:', !!dashboardData?.all_products)
    console.log('🧮 [KPI] all_products length:', dashboardData?.all_products?.length)

    if (!dashboardData?.all_products) {
      console.warn('⚠️ [KPI] No all_products data, returning zeros')
      return {
        totalProducts: 0,
        totalOrders: 0,
        totalViews: 0,
        avgPrice: 0,
        totalRevenue: 0
      }
    }

    const products = dashboardData.all_products
    const totalProducts = products.length
    const totalOrders = products.reduce((sum, p) => sum + (p.orders || 0), 0)
    const totalViews = products.reduce((sum, p) => sum + (p.page_views || 0), 0)
    const avgPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / totalProducts
    const totalRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.orders || 0)), 0)

    const kpis = {
      totalProducts,
      totalOrders,
      totalViews,
      avgPrice: Math.round(avgPrice),
      totalRevenue: Math.round(totalRevenue)
    }

    console.log('✅ [KPI] Calculated KPIs:', kpis)
    return kpis
  }, [dashboardData])

  // Brand Analytics - Pro Analysis
  const brandAnalytics = useMemo(() => {
    console.log('🏷️ [BRAND] Calculating brand analytics...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [BRAND] No products data')
      return null
    }

    const products = dashboardData.all_products
    console.log('📊 [BRAND] Processing', products.length, 'products')

    // 1. Group products by brand
    const brandMap = new Map()

    products.forEach(product => {
      const brandName = product.brand || 'Bilinmeyen Marka'

      if (!brandMap.has(brandName)) {
        brandMap.set(brandName, {
          name: brandName,
          products: [],
          totalOrders: 0,
          totalRevenue: 0,
          totalViews: 0,
          productCount: 0,
          avgPrice: 0,
          minPrice: Infinity,
          maxPrice: 0
        })
      }

      const brand = brandMap.get(brandName)
      brand.products.push(product)
      brand.totalOrders += (product.orders || 0)
      brand.totalRevenue += ((product.price || 0) * (product.orders || 0))
      brand.totalViews += (product.page_views || 0)
      brand.productCount++

      const price = product.price || 0
      if (price > 0) {
        if (price < brand.minPrice) brand.minPrice = price
        if (price > brand.maxPrice) brand.maxPrice = price
      }
    })

    // 2. Calculate additional metrics for each brand
    const brands = Array.from(brandMap.values()).map(brand => {
      const prices = brand.products.map(p => p.price || 0).filter(p => p > 0)
      brand.avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0

      if (brand.minPrice === Infinity) brand.minPrice = 0

      // Category diversity - kaç farklı kategoride satış yapıyor
      const uniqueCategories = new Set(brand.products.map(p => p.category_name).filter(c => c))
      brand.categoryCount = uniqueCategories.size
      console.log('🏷️ [BRAND CATEGORY]', brand.name, '→', brand.categoryCount, 'kategori:', Array.from(uniqueCategories).slice(0, 3).join(', '))

      // Social proof score (0-100)
      brand.socialScore = Math.min(100, Math.round(
        (brand.totalOrders / 100) * 0.5 +
        (brand.totalViews / 1000) * 0.3 +
        (brand.productCount / 10) * 0.2
      ))

      // Price segment
      if (brand.avgPrice >= 1000) brand.priceSegment = 'Premium'
      else if (brand.avgPrice >= 300) brand.priceSegment = 'Orta Segment'
      else brand.priceSegment = 'Ekonomik'

      return brand
    })

    // 3. Sort and rank
    const topByOrders = [...brands].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20)
    const topByRevenue = [...brands].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20)

    // 4. Market concentration (HHI - Herfindahl Index)
    const totalOrders = brands.reduce((sum, b) => sum + b.totalOrders, 0)
    const marketShares = brands.map(b => (b.totalOrders / totalOrders) * 100)
    const hhi = marketShares.reduce((sum, share) => sum + (share * share), 0)

    let marketConcentration = 'Rekabetçi'
    if (hhi > 2500) marketConcentration = 'Yüksek Yoğunlaşma'
    else if (hhi > 1500) marketConcentration = 'Orta Yoğunlaşma'

    // 5. Price segments distribution
    const priceSegments = {
      Premium: brands.filter(b => b.priceSegment === 'Premium'),
      'Orta Segment': brands.filter(b => b.priceSegment === 'Orta Segment'),
      'Ekonomik': brands.filter(b => b.priceSegment === 'Ekonomik')
    }

    // 6. Top 3 market share
    const top3Share = topByOrders.slice(0, 3).reduce((sum, b) => sum + (b.totalOrders / totalOrders * 100), 0)

    // 7. KPIs
    const kpis = {
      totalBrands: brands.length,
      leaderShare: topByOrders.length > 0 ? Math.round((topByOrders[0].totalOrders / totalOrders) * 100) : 0,
      avgProductsPerBrand: Math.round(products.length / brands.length),
      hhi: Math.round(hhi),
      marketConcentration,
      top3Share: Math.round(top3Share)
    }

    console.log('✅ [BRAND] Analytics calculated:', {
      totalBrands: brands.length,
      topBrand: topByOrders[0]?.name,
      hhi: kpis.hhi,
      marketConcentration
    })

    return {
      brands,
      topByOrders,
      topByRevenue,
      priceSegments,
      kpis,
      totalOrders
    }
  }, [dashboardData])

  // Category Analytics - Pro Analysis
  const categoryAnalytics = useMemo(() => {
    console.log('📁 [CATEGORY] Calculating category analytics...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [CATEGORY] No products data')
      return null
    }

    const products = dashboardData.all_products
    console.log('📊 [CATEGORY] Processing', products.length, 'products')

    // 1. Group products by category
    const categoryMap = new Map()

    products.forEach(product => {
      const categoryName = product.category_name || 'Bilinmeyen Kategori'

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          products: [],
          totalOrders: 0,
          totalRevenue: 0,
          totalViews: 0,
          productCount: 0,
          avgPrice: 0,
          minPrice: Infinity,
          maxPrice: 0
        })
      }

      const category = categoryMap.get(categoryName)
      category.products.push(product)
      category.totalOrders += (product.orders || 0)
      category.totalRevenue += ((product.price || 0) * (product.orders || 0))
      category.totalViews += (product.page_views || 0)
      category.productCount++

      const price = product.price || 0
      if (price > 0) {
        if (price < category.minPrice) category.minPrice = price
        if (price > category.maxPrice) category.maxPrice = price
      }
    })

    // 2. Calculate total orders first for market share calculation
    const totalOrders = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.totalOrders, 0)

    // 3. Calculate additional metrics for each category
    const categories = Array.from(categoryMap.values()).map(category => {
      const prices = category.products.map(p => p.price || 0).filter(p => p > 0)
      category.avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0

      if (category.minPrice === Infinity) category.minPrice = 0

      // Brand diversity - kaç farklı marka
      const uniqueBrands = new Set(category.products.map(p => p.brand).filter(b => b))
      category.brandCount = uniqueBrands.size

      // Market share percentage
      category.marketShare = totalOrders > 0 ? (category.totalOrders / totalOrders) * 100 : 0

      // Social proof score (0-100)
      category.socialScore = Math.min(100, Math.round(
        (category.totalOrders / 100) * 0.5 +
        (category.totalViews / 1000) * 0.3 +
        (category.productCount / 10) * 0.2
      ))

      // Price segment
      if (category.avgPrice >= 1000) category.priceSegment = 'Premium'
      else if (category.avgPrice >= 300) category.priceSegment = 'Orta Segment'
      else category.priceSegment = 'Ekonomik'

      return category
    })

    // 4. Sort and rank
    const topByOrders = [...categories].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20)
    const topByRevenue = [...categories].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20)

    // 5. Market concentration (HHI - Herfindahl Index)
    const marketShares = categories.map(c => (c.totalOrders / totalOrders) * 100)
    const hhi = marketShares.reduce((sum, share) => sum + (share * share), 0)

    let marketConcentration = 'Rekabetçi'
    if (hhi > 2500) marketConcentration = 'Yüksek Yoğunlaşma'
    else if (hhi > 1500) marketConcentration = 'Orta Yoğunlaşma'

    // 6. Price segments distribution
    const priceSegments = {
      Premium: categories.filter(c => c.priceSegment === 'Premium'),
      'Orta Segment': categories.filter(c => c.priceSegment === 'Orta Segment'),
      'Ekonomik': categories.filter(c => c.priceSegment === 'Ekonomik')
    }

    // 7. Top 3 market share
    const top3Share = topByOrders.slice(0, 3).reduce((sum, c) => sum + (c.totalOrders / totalOrders * 100), 0)

    // 8. KPIs
    const kpis = {
      totalCategories: categories.length,
      leaderShare: topByOrders.length > 0 ? Math.round((topByOrders[0].totalOrders / totalOrders) * 100) : 0,
      avgProductsPerCategory: Math.round(products.length / categories.length),
      hhi: Math.round(hhi),
      marketConcentration,
      top3Share: Math.round(top3Share)
    }

    console.log('✅ [CATEGORY] Analytics calculated:', {
      totalCategories: categories.length,
      topCategory: topByOrders[0]?.name,
      hhi: kpis.hhi,
      marketConcentration
    })

    return {
      categories,
      topByOrders,
      topByRevenue,
      priceSegments,
      kpis,
      totalOrders
    }
  }, [dashboardData])

  // Barcode country mapping (from backend - complete GS1 prefix mapping)
  const BARCODE_PREFIX_TO_COUNTRY = {
    // Turkey
    '869': 'Türkiye',
    '868': 'Türkiye',

    // Europe
    ...Object.fromEntries(Array.from({length: 80}, (_, i) => [`${300 + i}`, 'Fransa'])), // 300-379
    '380': 'Bulgaristan',
    '383': 'Slovenya',
    '385': 'Hırvatistan',
    '387': 'Bosna Hersek',
    '389': 'Karadağ',
    ...Object.fromEntries(Array.from({length: 41}, (_, i) => [`${400 + i}`, 'Almanya'])), // 400-440
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${450 + i}`, 'Japonya'])), // 450-459
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${460 + i}`, 'Rusya'])), // 460-469
    '470': 'Kırgızistan',
    '471': 'Tayvan',
    '474': 'Estonya',
    '475': 'Letonya',
    '476': 'Azerbaycan',
    '477': 'Litvanya',
    '478': 'Özbekistan',
    '479': 'Sri Lanka',
    '480': 'Filipinler',
    '481': 'Belarus',
    '482': 'Ukrayna',
    '483': 'Türkmenistan',
    '484': 'Moldova',
    '485': 'Ermenistan',
    '486': 'Gürcistan',
    '487': 'Kazakistan',
    '488': 'Tacikistan',
    '489': 'Hong Kong',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${490 + i}`, 'Japonya'])), // 490-499
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${500 + i}`, 'İngiltere'])), // 500-509
    '520': 'Yunanistan', '521': 'Yunanistan',
    '528': 'Lübnan',
    '529': 'Kıbrıs',
    '530': 'Arnavutluk',
    '531': 'Makedonya',
    '535': 'Malta',
    '539': 'İrlanda',
    ...Object.fromEntries(Array.from({length: 7}, (_, i) => [`${540 + i}`, 'Belçika'])), // 540-546
    '560': 'Portekiz',
    '569': 'İzlanda',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${570 + i}`, 'Danimarka'])), // 570-579
    '590': 'Polonya',
    '594': 'Romanya',
    '599': 'Macaristan',

    // Africa & Middle East
    '600': 'Güney Afrika', '601': 'Güney Afrika',
    '603': 'Gana',
    '604': 'Senegal',
    '608': 'Bahreyn',
    '609': 'Moritanya',
    '611': 'Fas',
    '613': 'Cezayir',
    '615': 'Nijerya',
    '616': 'Kenya',
    '618': 'Fildişi Sahili',
    '619': 'Tunus',
    '620': 'Tanzanya',
    '621': 'Suriye',
    '622': 'Mısır',
    '623': 'Brunei',
    '624': 'Libya',
    '625': 'Ürdün',
    '626': 'İran',
    '627': 'Kuveyt',
    '628': 'Suudi Arabistan',
    '629': 'Birleşik Arap Emirlikleri',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${640 + i}`, 'Finlandiya'])), // 640-649

    // Asia
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${690 + i}`, 'Çin'])), // 690-699
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${700 + i}`, 'Norveç'])), // 700-709
    '729': 'İsrail',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${730 + i}`, 'İsveç'])), // 730-739
    '740': 'Guatemala',
    '741': 'El Salvador',
    '742': 'Honduras',
    '743': 'Nikaragua',
    '744': 'Kosta Rika',
    '745': 'Panama',
    '746': 'Dominik Cumhuriyeti',
    '750': 'Meksika',
    '754': 'Kanada', '755': 'Kanada',
    '759': 'Venezuela',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${760 + i}`, 'İsviçre'])), // 760-769
    '770': 'Kolombiya', '771': 'Kolombiya',
    '773': 'Uruguay',
    '775': 'Peru',
    '777': 'Bolivya',
    '778': 'Arjantin', '779': 'Arjantin',
    '780': 'Şili',
    '784': 'Paraguay',
    '786': 'Ekvador',
    '789': 'Brezilya', '790': 'Brezilya',
    ...Object.fromEntries(Array.from({length: 40}, (_, i) => [`${800 + i}`, 'İtalya'])), // 800-839
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${840 + i}`, 'İspanya'])), // 840-849
    '850': 'Küba',
    '858': 'Slovakya',
    '859': 'Çekya',
    '860': 'Sırbistan',
    '865': 'Moğolistan',
    '867': 'Kuzey Kore',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${870 + i}`, 'Hollanda'])), // 870-879
    '880': 'Güney Kore',
    '884': 'Kamboçya',
    '885': 'Tayland',
    '888': 'Singapur',
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${890 + i}`, 'Hindistan'])), // 890-899
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${900 + i}`, 'Avusturya'])), // 900-909
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${930 + i}`, 'Avustralya'])), // 930-939
    ...Object.fromEntries(Array.from({length: 10}, (_, i) => [`${940 + i}`, 'Yeni Zelanda'])), // 940-949
    '955': 'Malezya',
    '958': 'Makao',

    // North America (000-139)
    ...Object.fromEntries(Array.from({length: 140}, (_, i) => {
      const prefix = i.toString().padStart(3, '0')
      return [prefix, 'ABD/Kanada']
    }))
  }

  const getBarcodeCountry = (barcode) => {
    if (!barcode || barcode.length < 3) return 'Bilinmeyen'

    const prefix = barcode.substring(0, 3)
    return BARCODE_PREFIX_TO_COUNTRY[prefix] || 'Diğer'
  }

  // Barcode Analytics - Origin/Country Analysis
  const barcodeAnalytics = useMemo(() => {
    console.log('🏷️ [BARCODE] Calculating barcode analytics...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [BARCODE] No products data')
      return null
    }

    const products = dashboardData.all_products
    console.log('📊 [BARCODE] Processing', products.length, 'products')

    // 1. Group products by country
    const countryMap = new Map()
    let totalWithBarcode = 0

    products.forEach(product => {
      const barcode = product.barcode || product.winnerVariant?.barcode || ''

      if (barcode) {
        totalWithBarcode++
        const country = getBarcodeCountry(barcode)

        if (!countryMap.has(country)) {
          countryMap.set(country, {
            name: country,
            products: [],
            totalOrders: 0,
            totalRevenue: 0,
            totalViews: 0,
            productCount: 0,
            avgPrice: 0,
            minPrice: Infinity,
            maxPrice: 0
          })
        }

        const countryData = countryMap.get(country)
        countryData.products.push(product)
        countryData.totalOrders += (product.orders || 0)
        countryData.totalRevenue += ((product.price || 0) * (product.orders || 0))
        countryData.totalViews += (product.page_views || 0)
        countryData.productCount++

        const price = product.price || 0
        if (price > 0) {
          if (price < countryData.minPrice) countryData.minPrice = price
          if (price > countryData.maxPrice) countryData.maxPrice = price
        }
      }
    })

    // 2. Calculate total orders for market share
    const totalOrders = Array.from(countryMap.values()).reduce((sum, c) => sum + c.totalOrders, 0)

    // 3. Calculate additional metrics for each country
    const countries = Array.from(countryMap.values()).map(country => {
      const prices = country.products.map(p => p.price || 0).filter(p => p > 0)
      country.avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0

      if (country.minPrice === Infinity) country.minPrice = 0

      // Market share percentage
      country.marketShare = totalOrders > 0 ? (country.totalOrders / totalOrders) * 100 : 0

      // Category diversity - kaç farklı kategori
      const uniqueCategories = new Set(country.products.map(p => p.category_name).filter(c => c))
      country.categoryCount = uniqueCategories.size

      // Brand diversity - kaç farklı marka
      const uniqueBrands = new Set(country.products.map(p => p.brand).filter(b => b))
      country.brandCount = uniqueBrands.size

      // Price segment
      if (country.avgPrice >= 1000) country.priceSegment = 'Premium'
      else if (country.avgPrice >= 300) country.priceSegment = 'Orta Segment'
      else country.priceSegment = 'Ekonomik'

      return country
    })

    // 4. Sort and rank
    const topByOrders = [...countries].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20)
    const topByRevenue = [...countries].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20)

    // 5. Domestic vs Import analysis
    const domesticData = countryMap.get('Türkiye') || {
      productCount: 0, totalOrders: 0, totalRevenue: 0, avgPrice: 0
    }
    const importData = {
      productCount: totalWithBarcode - domesticData.productCount,
      totalOrders: totalOrders - domesticData.totalOrders,
      totalRevenue: countries.reduce((sum, c) => sum + c.totalRevenue, 0) - domesticData.totalRevenue
    }
    importData.avgPrice = importData.productCount > 0
      ? Math.round(importData.totalRevenue / importData.totalOrders || 0)
      : 0

    // 6. Category-Country Heatmap Data
    const categoryCountryMatrix = []
    const topCountriesForHeatmap = topByOrders.slice(0, 10) // Top 10 ülke
    const categoryOrdersMap = new Map()

    // Her kategori için toplam satışı hesapla
    products.forEach(product => {
      if (product.barcode && product.category_name) {
        const current = categoryOrdersMap.get(product.category_name) || 0
        categoryOrdersMap.set(product.category_name, current + (product.orders || 0))
      }
    })

    // Top 10 kategori al
    const topCategories = Array.from(categoryOrdersMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name)

    // Heatmap matrisini oluştur
    topCategories.forEach(category => {
      topCountriesForHeatmap.forEach(country => {
        const categoryProducts = country.products.filter(p => p.category_name === category)
        const totalOrders = categoryProducts.reduce((sum, p) => sum + (p.orders || 0), 0)
        const totalRevenue = categoryProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.orders || 0)), 0)
        const productCount = categoryProducts.length

        if (productCount > 0) {
          categoryCountryMatrix.push({
            category,
            country: country.name,
            orders: totalOrders,
            revenue: totalRevenue,
            productCount,
            avgOrdersPerProduct: Math.round(totalOrders / productCount)
          })
        }
      })
    })

    // 7. KPIs
    const totalProducts = products.length
    const undetectedProducts = totalProducts - totalWithBarcode

    const kpis = {
      totalWithBarcode,
      totalCountries: countries.length,
      domesticShare: totalOrders > 0 ? Math.round((domesticData.totalOrders / totalOrders) * 100) : 0,
      topCountry: topByOrders.length > 0 ? topByOrders[0].name : 'N/A',
      topCountryShare: topByOrders.length > 0 ? topByOrders[0].marketShare : 0,
      undetectedProducts
    }

    console.log('✅ [BARCODE] Analytics calculated:', {
      totalCountries: countries.length,
      topCountry: kpis.topCountry,
      domesticShare: kpis.domesticShare
    })

    return {
      countries,
      topByOrders,
      topByRevenue,
      domesticData,
      importData,
      kpis,
      totalOrders,
      categoryCountryMatrix,
      topCategories,
      topCountriesForHeatmap
    }
  }, [dashboardData])

  // Origin Analytics - Country Analysis based on product.country field
  const originAnalytics = useMemo(() => {
    console.log('🌍 [ORIGIN] Calculating origin analytics...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [ORIGIN] No products data')
      return null
    }

    const products = dashboardData.all_products
    console.log('📊 [ORIGIN] Processing', products.length, 'products')

    // 1. Group products by origin country
    const countryMap = new Map()
    let totalWithOrigin = 0

    products.forEach(product => {
      const country = product.country || ''

      if (country) {
        totalWithOrigin++

        if (!countryMap.has(country)) {
          countryMap.set(country, {
            name: country,
            products: [],
            totalOrders: 0,
            totalRevenue: 0,
            totalViews: 0,
            productCount: 0,
            avgPrice: 0,
            minPrice: Infinity,
            maxPrice: 0
          })
        }

        const countryData = countryMap.get(country)
        countryData.products.push(product)
        countryData.totalOrders += (product.orders || 0)
        countryData.totalRevenue += ((product.price || 0) * (product.orders || 0))
        countryData.totalViews += (product.page_views || 0)
        countryData.productCount++

        const price = product.price || 0
        if (price > 0) {
          if (price < countryData.minPrice) countryData.minPrice = price
          if (price > countryData.maxPrice) countryData.maxPrice = price
        }
      }
    })

    // 2. Calculate total orders for market share
    const totalOrders = Array.from(countryMap.values()).reduce((sum, c) => sum + c.totalOrders, 0)

    // 3. Calculate additional metrics for each country
    const countries = Array.from(countryMap.values()).map(country => {
      const prices = country.products.map(p => p.price || 0).filter(p => p > 0)
      country.avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0

      if (country.minPrice === Infinity) country.minPrice = 0

      // Market share percentage
      country.marketShare = totalOrders > 0 ? (country.totalOrders / totalOrders) * 100 : 0

      // Category diversity
      const uniqueCategories = new Set(country.products.map(p => p.category_name).filter(c => c))
      country.categoryCount = uniqueCategories.size

      // Brand diversity
      const uniqueBrands = new Set(country.products.map(p => p.brand).filter(b => b))
      country.brandCount = uniqueBrands.size

      // Price segment
      if (country.avgPrice >= 1000) country.priceSegment = 'Premium'
      else if (country.avgPrice >= 300) country.priceSegment = 'Orta Segment'
      else country.priceSegment = 'Ekonomik'

      return country
    })

    // 4. Sort and rank
    const topByOrders = [...countries].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20)
    const topByRevenue = [...countries].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20)

    // 5. Domestic vs Import analysis (Türkiye vs others)
    const domesticData = countryMap.get('Türkiye') || {
      productCount: 0, totalOrders: 0, totalRevenue: 0, avgPrice: 0
    }
    // Add 'count' alias for compatibility
    domesticData.count = domesticData.productCount

    const importData = {
      productCount: totalWithOrigin - domesticData.productCount,
      totalOrders: totalOrders - domesticData.totalOrders,
      totalRevenue: countries.reduce((sum, c) => sum + c.totalRevenue, 0) - domesticData.totalRevenue
    }
    importData.avgPrice = importData.productCount > 0
      ? Math.round(importData.totalRevenue / importData.totalOrders || 0)
      : 0
    // Add 'count' alias for compatibility
    importData.count = importData.productCount

    // 6. Category-Country Heatmap Data
    const categoryCountryMatrix = {}
    const topCountriesForHeatmap = topByOrders.slice(0, 10).map(c => c.name) // Top 10 country names
    const categoryOrdersMap = new Map()

    // Calculate total orders per category
    products.forEach(product => {
      if (product.country && product.category_name) {
        const current = categoryOrdersMap.get(product.category_name) || 0
        categoryOrdersMap.set(product.category_name, current + (product.orders || 0))
      }
    })

    // Get Top 10 categories
    const topCategories = Array.from(categoryOrdersMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name)

    // Build heatmap matrix as nested object
    const topCountryObjects = topByOrders.slice(0, 10)
    topCategories.forEach(category => {
      categoryCountryMatrix[category] = {}

      topCountryObjects.forEach(country => {
        const categoryProducts = country.products.filter(p => p.category_name === category)
        const totalOrders = categoryProducts.reduce((sum, p) => sum + (p.orders || 0), 0)
        const totalRevenue = categoryProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.orders || 0)), 0)
        const productCount = categoryProducts.length

        categoryCountryMatrix[category][country.name] = {
          count: productCount,
          revenue: totalRevenue,
          orders: totalOrders
        }
      })
    })

    // 7. KPIs
    const totalProducts = products.length
    const undetectedProducts = totalProducts - totalWithOrigin

    const kpis = {
      totalWithOrigin,
      totalCountries: countries.length,
      domesticShare: totalOrders > 0 ? Math.round((domesticData.totalOrders / totalOrders) * 100) : 0,
      domesticPercentage: totalProducts > 0 ? Math.round((domesticData.productCount / totalProducts) * 100) : 0,
      importPercentage: totalProducts > 0 ? Math.round((importData.productCount / totalProducts) * 100) : 0,
      topCountry: topByOrders.length > 0 ? topByOrders[0].name : 'N/A',
      topCountryShare: topByOrders.length > 0 ? topByOrders[0].marketShare : 0,
      undetectedProducts
    }

    console.log('✅ [ORIGIN] Analytics calculated:', {
      totalCountries: countries.length,
      topCountry: kpis.topCountry,
      domesticShare: kpis.domesticShare
    })

    // 🔍 DEBUG: Log raw data structure BEFORE transformation
    console.log('🔍 [DEBUG] Raw countries[0] BEFORE transform:', countries[0])
    console.log('🔍 [DEBUG] Field names in raw data:', countries[0] ? Object.keys(countries[0]) : 'NO DATA')
    console.log('🔍 [DEBUG] Has "country" field?', countries[0] ? 'country' in countries[0] : 'N/A')
    console.log('🔍 [DEBUG] Has "name" field?', countries[0] ? 'name' in countries[0] : 'N/A')
    console.log('🔍 [DEBUG] Has "count" field?', countries[0] ? 'count' in countries[0] : 'N/A')
    console.log('🔍 [DEBUG] Has "productCount" field?', countries[0] ? 'productCount' in countries[0] : 'N/A')

    // 🎯 MAPPING LAYER: Transform data to match OriginTab expectations
    console.log('🔄 [TRANSFORM] Starting data transformation...')
    const countriesTransformed = countries.map(c => ({
      country: c.name,              // name → country
      name: c.name,                 // Keep original for compatibility
      count: c.productCount,        // productCount → count
      productCount: c.productCount, // Keep original for compatibility
      totalOrders: c.totalOrders,
      totalRevenue: c.totalRevenue,
      totalViews: c.totalViews,
      avgPrice: c.avgPrice,
      minPrice: c.minPrice,
      maxPrice: c.maxPrice,
      marketShare: c.marketShare,
      categoryCount: c.categoryCount,
      brandCount: c.brandCount,
      priceSegment: c.priceSegment,
      products: c.products
    }))

    const topByOrdersTransformed = topByOrders.map(c => ({
      country: c.name,
      name: c.name,
      count: c.productCount,
      productCount: c.productCount,
      totalOrders: c.totalOrders,
      totalRevenue: c.totalRevenue,
      totalViews: c.totalViews,
      avgPrice: c.avgPrice,
      minPrice: c.minPrice,
      maxPrice: c.maxPrice,
      marketShare: c.marketShare,
      categoryCount: c.categoryCount,
      brandCount: c.brandCount,
      priceSegment: c.priceSegment,
      products: c.products
    }))

    const topByRevenueTransformed = topByRevenue.map(c => ({
      country: c.name,
      name: c.name,
      count: c.productCount,
      productCount: c.productCount,
      totalOrders: c.totalOrders,
      totalRevenue: c.totalRevenue,
      totalViews: c.totalViews,
      avgPrice: c.avgPrice,
      minPrice: c.minPrice,
      maxPrice: c.maxPrice,
      marketShare: c.marketShare,
      categoryCount: c.categoryCount,
      brandCount: c.brandCount,
      priceSegment: c.priceSegment,
      products: c.products
    }))

    // 🔍 DEBUG: Log transformed data
    console.log('✅ [TRANSFORM] Transformation complete!')
    console.log('🔍 [DEBUG] Transformed countries[0]:', countriesTransformed[0])
    console.log('🔍 [DEBUG] Field names AFTER transform:', countriesTransformed[0] ? Object.keys(countriesTransformed[0]) : 'NO DATA')
    console.log('🔍 [DEBUG] Has "country" field?', countriesTransformed[0] ? 'country' in countriesTransformed[0] : 'N/A')
    console.log('🔍 [DEBUG] Has "count" field?', countriesTransformed[0] ? 'count' in countriesTransformed[0] : 'N/A')
    console.log('🔍 [DEBUG] Value of "country":', countriesTransformed[0]?.country)
    console.log('🔍 [DEBUG] Value of "count":', countriesTransformed[0]?.count)
    console.log('🔍 [DEBUG] Value of "totalOrders":', countriesTransformed[0]?.totalOrders)

    return {
      countries: countriesTransformed,
      topByOrders: topByOrdersTransformed,
      topByRevenue: topByRevenueTransformed,
      domesticData,
      importData,
      kpis,
      totalOrders,
      categoryCountryMatrix,
      topCategories,
      topCountriesForHeatmap
    }
  }, [dashboardData])

  // Category sort handler
  const handleCategorySort = (key) => {
    setCategorySortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  // Brand sort handler
  const handleBrandSort = (key) => {
    setBrandSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  // Sorted categories based on current sort config
  const sortedCategories = useMemo(() => {
    if (!categoryAnalytics?.topByOrders) return []

    const sorted = [...categoryAnalytics.topByOrders].sort((a, b) => {
      let aValue, bValue

      switch (categorySortConfig.key) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          return categorySortConfig.direction === 'desc'
            ? bValue.localeCompare(aValue, 'tr')
            : aValue.localeCompare(bValue, 'tr')

        case 'totalOrders':
          aValue = a.totalOrders
          bValue = b.totalOrders
          break

        case 'totalRevenue':
          aValue = a.totalRevenue
          bValue = b.totalRevenue
          break

        case 'productCount':
          aValue = a.productCount
          bValue = b.productCount
          break

        case 'brandCount':
          aValue = a.brandCount
          bValue = b.brandCount
          break

        case 'avgPrice':
          aValue = a.avgPrice
          bValue = b.avgPrice
          break

        default:
          return 0
      }

      return categorySortConfig.direction === 'desc' ? bValue - aValue : aValue - bValue
    })

    return sorted.slice(0, 20)
  }, [categoryAnalytics, categorySortConfig])

  // Sorted brands based on current sort config
  const sortedBrands = useMemo(() => {
    if (!brandAnalytics?.topByOrders) return []

    const sorted = [...brandAnalytics.topByOrders].sort((a, b) => {
      let aValue, bValue

      switch (brandSortConfig.key) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          return brandSortConfig.direction === 'desc'
            ? bValue.localeCompare(aValue, 'tr')
            : aValue.localeCompare(bValue, 'tr')

        case 'totalOrders':
          aValue = a.totalOrders
          bValue = b.totalOrders
          break

        case 'totalRevenue':
          aValue = a.totalRevenue
          bValue = b.totalRevenue
          break

        case 'productCount':
          aValue = a.productCount
          bValue = b.productCount
          break

        case 'avgPrice':
          aValue = a.avgPrice
          bValue = b.avgPrice
          break

        default:
          return 0
      }

      return brandSortConfig.direction === 'desc' ? bValue - aValue : aValue - bValue
    })

    return sorted.slice(0, 20)
  }, [brandAnalytics, brandSortConfig])

  // Top selling products
  const topSellingProducts = useMemo(() => {
    console.log('🏆 [TOP PRODUCTS] Calculating top selling products...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [TOP PRODUCTS] No all_products data')
      return []
    }

    const sorted = [...dashboardData.all_products]
      .sort((a, b) => (b.orders || 0) - (a.orders || 0))
      .slice(0, 10)

    console.log('✅ [TOP PRODUCTS] Top 10 products:', sorted.length, 'items')
    console.log('📊 [TOP PRODUCTS] First product:', sorted[0])
    return sorted
  }, [dashboardData])

  // Top selling brands
  const topSellingBrands = useMemo(() => {
    console.log('🏷️ [TOP BRANDS] Calculating top brands...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [TOP BRANDS] No all_products data')
      return []
    }

    const brandSales = {}
    dashboardData.all_products.forEach(p => {
      const brand = p.brand || 'Bilinmiyor'
      if (!brandSales[brand]) {
        brandSales[brand] = { name: brand, totalOrders: 0 }
      }
      brandSales[brand].totalOrders += (p.orders || 0)
    })

    const sorted = Object.values(brandSales)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)

    console.log('✅ [TOP BRANDS] Top 10 brands:', sorted.length, 'items')
    console.log('📊 [TOP BRANDS] First brand:', sorted[0])
    return sorted
  }, [dashboardData])

  // Top selling categories (by revenue)
  const topSellingCategories = useMemo(() => {
    console.log('📁 [TOP CATEGORIES] Calculating top categories by revenue...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [TOP CATEGORIES] No all_products data')
      return []
    }

    const categorySales = {}
    dashboardData.all_products.forEach(p => {
      const category = p.category_name || 'Bilinmiyor'
      if (!categorySales[category]) {
        categorySales[category] = { name: category, revenue: 0 }
      }
      categorySales[category].revenue += (p.price || 0) * (p.orders || 0)
    })

    const sorted = Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    console.log('✅ [TOP CATEGORIES] Top 10 categories:', sorted.length, 'items')
    console.log('📊 [TOP CATEGORIES] First category:', sorted[0])
    return sorted
  }, [dashboardData])

  // Most viewed categories
  const mostViewedCategories = useMemo(() => {
    console.log('👁️ [MOST VIEWED] Calculating most viewed categories...')
    if (!dashboardData?.all_products) {
      console.warn('⚠️ [MOST VIEWED] No all_products data')
      return []
    }

    const categoryViews = {}
    dashboardData.all_products.forEach(p => {
      const category = p.category_name || 'Bilinmiyor'
      if (!categoryViews[category]) {
        categoryViews[category] = { name: category, views: 0 }
      }
      categoryViews[category].views += (p.page_views || 0)
    })

    const sorted = Object.values(categoryViews)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    console.log('✅ [MOST VIEWED] Top 10 categories:', sorted.length, 'items')
    console.log('📊 [MOST VIEWED] First category:', sorted[0])
    return sorted
  }, [dashboardData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hata</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/reports')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Raporlara Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dashboardData.report_name}</h1>
              <p className="text-gray-600 mt-1">{dashboardData.category_name}</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Geri
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {ALL_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* GENEL BAKIŞ TAB */}
          {activeTab === 'overview' && (
            <OverviewTab
              overviewKPIs={overviewKPIs}
              topSellingProducts={topSellingProducts}
              topSellingBrands={topSellingBrands}
              topSellingCategories={topSellingCategories}
              mostViewedCategories={mostViewedCategories}
            />
          )}

          {/* MARKA TAB - PRO ANALYSIS */}
          {activeTab === 'brand' && (
            <BrandTab
              brandAnalytics={brandAnalytics}
              sortedBrands={sortedBrands}
              handleBrandSort={handleBrandSort}
              brandSortConfig={brandSortConfig}
            />
          )}

          {/* KATEGORİ TAB */}
          {activeTab === 'category' && (
            <CategoryTab
              categoryAnalytics={categoryAnalytics}
              sortedCategories={sortedCategories}
              handleCategorySort={handleCategorySort}
              categorySortConfig={categorySortConfig}
            />
          )}

          {/* MENŞEİ TAB */}
          {activeTab === 'origin' && <OriginTab originAnalytics={originAnalytics} />}

          {/* BARKOD TAB */}
          {activeTab === 'barcode' && <BarcodeTab barcodeAnalytics={barcodeAnalytics} />}

          {/* KEYWORD ARACI TAB */}
          {activeTab === 'keyword' && (
            <KeywordTab reportId={reportId} />
          )}

          {/* ÜRÜN BULMA TAB */}
          {activeTab === 'product-finder' && (
            <ProductFinderTab allProducts={dashboardData.all_products || []} />
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportDashboard
