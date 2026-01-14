# CLAUDE.md

Bu dosya Claude Code (claude.ai/code) için proje rehberidir.

## Proje Özeti

**Trendyol Product Dashboard**: Trendyol e-ticaret platformu için kategori bazlı ürün analiz sistemi. 7 tab'lı dashboard, otomatik rapor oluşturma ve sosyal kanıt metrikleri.

**Stack**: FastAPI + React 19 + Vite + SQLite + Tailwind CSS

## Geliştirme Komutları

```bash
# Uygulamayı başlat (önerilen - dependency, port, env otomatik)
python3 start.py

# Manuel başlatma (iki terminal)
cd backend && python3 main.py                    # Terminal 1 - Backend
cd admin-panel && npm run dev                    # Terminal 2 - Frontend

# Dependency kurulumu
cd backend && pip install -r requirements.txt   # Python
cd admin-panel && npm install                    # Node.js

# Diğer komutlar
cd admin-panel && npm run build                  # Frontend build
cd admin-panel && npm run lint                   # Lint
cd backend && python3 -c "from database import init_db; init_db()"  # DB init
```

**Erişim URL'leri**:
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8001
- API Docs: http://127.0.0.1:8001/docs

**Port çakışması**: `start.py` kullan veya `lsof -ti:8001 | xargs kill -9`

## Mimari

### 3 Katmanlı Yapı
```
React Frontend (admin-panel/)     →  FastAPI Backend (backend/)  →  SQLite + JSON
├── CategoryManagement.jsx            ├── main.py (~4400 satır)       ├── trendyol.db
├── ReportGeneration.jsx              ├── database.py                 ├── categories/*.json
├── ReportList.jsx                    └── scraper.py                  └── reports/*.json
└── ReportDashboard.jsx (7 tab)
```

### Dashboard Tab'ları (7 adet)
| Tab ID | Tab Adı | Component | Açıklama |
|--------|---------|-----------|----------|
| overview | Genel Bakış | OverviewTab | KPI'lar, özet grafikler |
| brand | Marka | BrandTab | Marka analizi, pazar payı |
| category | Kategori | CategoryTab | Kategori dağılımı |
| origin | Menşei | OriginTab | Ülke bazlı analiz |
| barcode | Barkod | BarcodeTab | Barkod veri analizi |
| keyword | Keyword Aracı | KeywordTab | Anahtar kelime analizi |
| product-finder | Ürün Bulma | ProductFinderTab | Ürün arama/filtreleme |

### Veri Akışı

**Rapor Oluşturma** (uzun süren arka plan görevi):
1. `POST /api/reports/create` → `task_id` döner, BackgroundTask başlar
2. Client `GET /api/reports/progress/{task_id}` ile poll eder (1s→5s backoff)
3. Backend her alt kategori için Trendyol API'yi tarar
4. JSON'u `reports/` klasörüne kaydeder, DB kaydı oluşturur

**Dashboard Veri Pipeline**:
- Backend JSON okur, on-demand işler/toplar
- Sonuçlar cache'lenir: BoundedCache (maxsize=100, TTL=3600s)
- Frontend hazır `kpis` ve `charts` objeleri alır

## Dashboard Geliştirme (KRİTİK)

### Veri Kullanım Kuralları

**Backend'den gelen hazır objeleri kullan, ham hesaplama YAPMA:**

```jsx
// ✅ DOĞRU - Hazır veriyi kullan
const kpis = dashboardData?.kpis || {};
const topProducts = dashboardData?.charts?.top_products || [];
const topBrands = dashboardData?.charts?.top_brands || [];

// ❌ YANLIŞ - all_products'tan hesaplama yapma
const total = dashboardData?.all_products.reduce((sum, p) => sum + p.price, 0);
```

**Öncelik Sırası**:
1. `dashboardData.kpis` - KPI kartları
2. `dashboardData.charts.*` - Liste ve grafikler
3. `dashboardData.all_products` - Sadece özel analiz için (son çare)

### Alan Adı Uyumsuzluğu

Frontend hesaplamalı veri, alan adı uyumsuzluğuna yol açabilir. Detay için: `docs/bug-fixes/ORIGINTAB_BUG_FIX.md`

**Çözüm Pattern - Mapping Layer**:
```jsx
// Veriyi component beklentilerine dönüştür
const transformed = sourceData.map(item => ({
  country: item.name,           // Beklenen alana map'le
  name: item.name,              // Orijinali koru
  count: item.productCount,     // Beklenen alana map'le
  productCount: item.productCount  // Orijinali koru
}));
```

### Yeni Tab Ekleme

1. Tab config'i `src/constants/tabGroups.js`'e ekle
2. Tab component'ini `src/components/dashboard-tabs/` altına oluştur
3. `ReportDashboard.jsx`'te import et ve render bloğu ekle
4. **Her zaman veri dönüşümü için console.log ekle**

## API Entegrasyonu

### Timeout Konfigürasyonu (src/config/api.js)
| Tip | Süre | Kullanım |
|-----|------|----------|
| STANDARD | 30s | Genel istekler |
| DASHBOARD | 180s | Dashboard veri yükleme |
| ENRICHMENT | 120s | Sosyal kanıt zenginleştirme |
| KEYWORD_ANALYSIS | 300s | Keyword analizi |

### Polling Pattern
```jsx
// Exponential backoff with jitter (1s → 5s max)
import { fetchWithTimeout, API_BASE_URL } from '../config/api';
```

### Rate Limit
- Sosyal kanıt API: 2 istek/saniye
- Exponential backoff kullanılır (%75 istek azaltımı sağlandı)

## Kod Değişiklik Kuralları

### Backend (main.py)
- Request/response için Pydantic BaseModel kullan
- Hata yönetimi için HTTPException kullan
- Uzun işlemler: BackgroundTasks + progress polling endpoint
- Harici API çağrıları: Her zaman timeout parametresi ekle
- Cache: BoundedCache kullan (asla sınırsız dict kullanma)

### Frontend
- `fetchWithTimeout` kullan (`src/config/api.js`'den)
- Async işlemler için loading state göster
- Eşzamanlı çağrılar için request deduplication uygula

### CORS Değişiklikleri
Yeni frontend portları için `main.py`'deki CORS allowlist'e ekle (satır 34-45):
```python
allow_origins=["http://localhost:5173", "http://localhost:5174", ...]
```

## Kaynak Limitleri

| Kaynak | Limit |
|--------|-------|
| Cache | 100 item, 1 saat TTL |
| Frontend pagination | 150 item/sayfa |
| Backend pagination | 200 item/sayfa |
| Sosyal kanıt batch | 5 ürün/istek |
| Rate limit | 2 istek/saniye (sosyal kanıt) |

## Kritik Dependency'ler

**Backend**: FastAPI 0.104.1, SQLAlchemy 2.0.45, Uvicorn 0.24.0, Requests 2.31.0, Pytrends 4.9.2

**Frontend**: React 19.2.0, Vite 7.2.2, Recharts 3.4.1, Tailwind CSS 4.1.17, Axios 1.13.2

## Database Modelleri

| Model | Amaç | Anahtar Alanlar |
|-------|------|-----------------|
| Category | Hiyerarşik kategori ağacı | `parent_id` (self-ref), `trendyol_category_id` |
| Snapshot | Aylık veri görüntüleri | `category_id`, `json_file_path` |
| Report | Kayıtlı raporlar | `category_id`, `json_file_path` |
| EnrichmentError | API hata logları | `endpoint`, `error_type`, `status_code` |

## Dokümantasyon

| Dosya | Amaç |
|-------|------|
| docs/DASHBOARD_ARCHITECTURE.md | **Önemli** - Dashboard veri yapıları |
| docs/bug-fixes/ORIGINTAB_BUG_FIX.md | **Kritik** - Alan adı uyumsuzluk pattern'i |
| docs/API_DOCUMENTATION.md | Tam API referansı |
| docs/ARCHITECTURE.md | Sistem mimarisi (Türkçe) |
| docs/SETUP_GUIDE.md | Kurulum rehberi |
