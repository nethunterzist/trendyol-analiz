# Dashboard Geliştirme Rehberi

Dashboard frontend geliştirme için kritik dokümantasyon.

## Tab Yapısı (7 Tab)

| Tab ID | Tab Adı | Veri Kaynağı |
|--------|---------|--------------|
| overview | Genel Bakış | `kpis`, `charts.top_*` |
| brand | Marka | `charts.top_brands` |
| category | Kategori | `charts.top_categories` |
| origin | Menşei | `charts.origin_countries` |
| barcode | Barkod | `charts.barcode_*` |
| keyword | Keyword Aracı | `/keyword-analysis` endpoint |
| product-finder | Ürün Bulma | `/product-finder` endpoint |

## Veri Akışı

```
Backend API → dashboardData → { kpis, charts, all_products }
```

## KRİTİK: Veri Kullanım Kuralları

### Öncelik Sırası

1. **İlk**: `dashboardData.kpis` - KPI kartları için
2. **İkinci**: `dashboardData.charts.*` - Liste ve grafikler için
3. **Son Çare**: `dashboardData.all_products` - Sadece özel analiz için

### DOĞRU Kullanım

```jsx
// KPI'lar
const kpis = dashboardData?.kpis || {};

// Top listeler
const topBrands = dashboardData?.charts?.top_brands || [];
const topProducts = dashboardData?.charts?.top_products || [];
const topCategories = dashboardData?.charts?.top_categories || [];
```

### YANLIŞ Kullanım

```jsx
// all_products'tan hesaplama YAPMA!
const topProducts = useMemo(() => {
  const products = dashboardData?.all_products || [];
  return products
    .filter(p => p.orders > 0)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);
}, [dashboardData]);
// Bu veri zaten charts.top_products'ta HAZIR!
```

## API Response Yapısı

```json
{
  "kpis": {
    "total_products": 19043,
    "total_orders": 145680,
    "total_views": 2456789,
    "average_price": 249.99,
    "unique_brands": 234
  },
  "charts": {
    "top_products": [...],
    "top_brands": [...],
    "top_categories": [...],
    "origin_countries": [...],
    "price_distribution": [...],
    "rating_distribution": [...]
  },
  "all_products": [...]
}
```

## Yeni Tab Ekleme Rehberi

### Adım 1: Tab Config'e Ekle

`src/constants/tabGroups.js`:
```javascript
tabs: [
  // ... mevcut tablar
  { id: 'new-tab', name: 'Yeni Tab' }
]
```

### Adım 2: Component Oluştur

`src/components/dashboard-tabs/NewTab.jsx`:
```jsx
const NewTab = ({ dashboardData }) => {
  console.log('📊 NewTab Data:', dashboardData);

  const kpis = dashboardData?.kpis || {};
  const chartData = dashboardData?.charts?.relevant_chart || [];

  return (
    <div className="tab-container">
      {/* KPI Kartları */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>KPI Başlığı</h3>
          <p>{kpis.metric_name?.toLocaleString('tr-TR') || 0}</p>
        </div>
      </div>

      {/* Chart/Liste */}
      <div className="chart-container">
        {chartData.map(item => (
          <div key={item.id || item.name}>
            {/* Item içeriği */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewTab;
```

### Adım 3: ReportDashboard.jsx'te Import

```jsx
import NewTab from './dashboard-tabs/NewTab';

// Render bloğunda
{activeTab === 'new-tab' && <NewTab dashboardData={dashboardData} />}
```

### Adım 4: Console Log ile Doğrula

```jsx
console.log('🎯 Tab Data:', dashboardData);
console.log('📊 Chart Data:', chartData);
console.log('✅ Items:', items.length);
```

## Field Name Mapping Pattern

Backend ve frontend arasında alan adı uyumsuzluğu olabilir. Çözüm:

```jsx
// Backend: { name: 'Türkiye', productCount: 1234 }
// Component: { country: ..., count: ... } bekliyor

const transformed = sourceData.map(item => ({
  country: item.name,           // Beklenen alana map'le
  name: item.name,              // Orijinali koru
  count: item.productCount,     // Beklenen alana map'le
  productCount: item.productCount  // Orijinali koru
}));
```

Detaylı örnek: [bug-fixes/ORIGINTAB_BUG_FIX.md](./bug-fixes/ORIGINTAB_BUG_FIX.md)

## Yaygın Hatalar

### 1. Veri Yok / Boş Gösterim

**Sebep**: Yanlış property adı kullanımı

```jsx
// YANLIŞ
const products = dashboardData?.products || [];

// DOĞRU
const products = dashboardData?.charts?.top_products || [];
```

### 2. "bilinmiyor" Gösteriyor

**Sebep**: `all_products`'tan hesaplama yapılıyor

```jsx
// YANLIŞ
const categories = products.map(p => p.category);

// DOĞRU
const categories = dashboardData?.charts?.top_categories || [];
```

### 3. Alan Adı Uyumsuzluğu

**Sebep**: Backend ve component farklı field adları bekliyor

**Çözüm**: Mapping layer pattern kullan (yukarıya bak)

## Debugging

Her tab'a console.log ekle:

```jsx
useEffect(() => {
  console.log('📊 Tab loaded with data:', {
    kpis: dashboardData?.kpis,
    charts: Object.keys(dashboardData?.charts || {}),
    productCount: dashboardData?.all_products?.length
  });
}, [dashboardData]);
```

## Referans Dosyalar

| Dosya | Satırlar | İçerik |
|-------|----------|--------|
| `ReportDashboard.jsx` | - | Ana dashboard component |
| `tabGroups.js` | - | Tab yapılandırması |
| `backend/main.py` | ~2710-2950 | `get_dashboard_data` fonksiyonu |

## Performans İpuçları

1. **Gereksiz hesaplama yapma** - Backend'in hazır verilerini kullan
2. **useMemo kullan** - Sadece `all_products`'tan özel analiz yaparken
3. **Console log'ları kaldır** - Production'da

---

**Son Güncelleme**: Ocak 2025
