# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

**Trendyol Product Dashboard**: Trendyol e-ticaret platformu için kategori bazlı ürün analiz sistemi. 9 tab'lı dashboard, otomatik rapor oluşturma, sosyal kanıt metrikleri ve hidden champion analizi.

**Stack**: FastAPI + React 19 + Vite + PostgreSQL + Tailwind CSS

## Geliştirme Komutları

```bash
# Uygulamayı başlat (önerilen - dependency, port, env otomatik)
python3 start.py

# Manuel başlatma (iki terminal)
cd backend && python3 main.py                    # Terminal 1 - Backend (port 8001)
cd admin-panel && npm run dev                    # Terminal 2 - Frontend (port 5173)

# Dependency kurulumu
cd backend && pip install -r requirements.txt   # Python
cd admin-panel && npm install                    # Node.js

# Build & lint
cd admin-panel && npm run build                  # Frontend production build
cd admin-panel && npm run lint                   # ESLint

# Backend testler
cd backend && pytest                             # Tüm testler
cd backend && pytest tests/test_cache.py         # Tek test dosyası
cd backend && pytest tests/test_cache.py -k "test_ttl"  # Tek test

# Frontend E2E testler (Playwright)
cd admin-panel && npx playwright test            # Tüm E2E testler
cd admin-panel && npx playwright test tests/rare-keywords.spec.js  # Tek spec

# Docker ile çalıştırma
./build-docker.sh && ./start-docker.sh           # Build + start
./stop-docker.sh                                 # Durdur

# DB migration
cd backend && alembic upgrade head               # Migration uygula
cd backend && alembic revision --autogenerate -m "description"  # Yeni migration
```

**Erişim URL'leri**:
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8001
- API Docs: http://127.0.0.1:8001/docs

**Port çakışması**: `start.py` kullan veya `lsof -ti:8001 | xargs kill -9`

## Mimari

### 3 Katmanlı Yapı
```
React Frontend (admin-panel/)     →  FastAPI Backend (backend/)    →  PostgreSQL + JSON
├── ReportDashboard.jsx (9 tab)       ├── main.py (~4000 satır)        ├── trendyol_db
├── ReportGeneration.jsx              ├── database.py (ORM)            ├── categories/*.json
├── ReportList.jsx                    ├── scraper.py                   └── reports/*.json
├── ReportComparison.jsx              ├── google_trends_helper.py
└── CategoryManagement.jsx            └── analytics/
                                          ├── metrics.py
                                          └── champion_finder.py
```

### Frontend Routes
| Path | Component | Açıklama |
|------|-----------|----------|
| `/` veya `/report` | ReportGeneration | Yeni rapor oluştur |
| `/reports` | ReportList | Kayıtlı raporlar |
| `/reports/:reportId` | ReportDashboard | 9 tab'lı analiz dashboard |
| `/compare` | ReportComparison | Yan yana rapor karşılaştırma |

### Dashboard Tab'ları (9 adet)
| Tab ID | Tab Adı | Component | Açıklama |
|--------|---------|-----------|----------|
| overview | Genel Bakış | OverviewTab | KPI'lar, özet grafikler |
| brand | Marka | BrandTab | Marka analizi, pazar payı |
| category | Kategori | CategoryTab | Kategori dağılımı |
| origin | Menşei | OriginTab | Ülke bazlı analiz |
| barcode | Barkod | BarcodeTab | Barkod/GS1 menşei analizi |
| keyword | Keyword Aracı | KeywordTab | Anahtar kelime + Google Trends |
| product-finder | Ürün Bulma | ProductFinderTab | Ürün arama/filtreleme |
| hidden-champions | Gizli Şampiyonlar | HiddenChampionsTab | Düşük yorum, yüksek puan fırsatları |
| opportunity | Fırsat Analizi | OpportunityTab | Pazar fırsat analizi |

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
// DOĞRU - Hazır veriyi kullan
const kpis = dashboardData?.kpis || {};
const topProducts = dashboardData?.charts?.top_products || [];
const topBrands = dashboardData?.charts?.top_brands || [];

// YANLIŞ - all_products'tan hesaplama yapma
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
const transformed = sourceData.map(item => ({
  country: item.name,
  name: item.name,
  count: item.productCount,
  productCount: item.productCount
}));
```

### Yeni Tab Ekleme

1. Tab config'i `src/constants/tabGroups.js`'e ekle
2. Tab component'ini `src/components/dashboard-tabs/` altına oluştur
3. `ReportDashboard.jsx`'te import et ve render bloğu ekle
4. Gerekiyorsa backend'e yeni endpoint ekle (`main.py`)

## API Entegrasyonu

### Timeout Konfigürasyonu (src/config/api.js)
| Tip | Süre | Kullanım |
|-----|------|----------|
| STANDARD | 30s | Genel istekler |
| DASHBOARD | 180s | Dashboard veri yükleme |
| ENRICHMENT | 120s | Sosyal kanıt zenginleştirme |
| KEYWORD_ANALYSIS | 300s | Keyword analizi |

### Rate Limit & Resilience
- Sosyal kanıt API: 2 istek/saniye (RateLimiter)
- Circuit breaker pattern for external API calls
- Exponential backoff with jitter (1s → 5s max)

## Kod Değişiklik Kuralları

### Backend (main.py)
- Request/response için Pydantic BaseModel kullan
- Hata yönetimi için HTTPException kullan
- Uzun işlemler: BackgroundTasks + progress polling endpoint
- Harici API çağrıları: Her zaman timeout parametresi ekle
- Cache: BoundedCache kullan (asla sınırsız dict kullanma)
- Analytics hesaplamaları: `analytics/` modülüne koy (metrics.py, champion_finder.py)

### Frontend
- `fetchWithTimeout` kullan (`src/config/api.js`'den)
- Async işlemler için loading state göster
- Eşzamanlı çağrılar için request deduplication uygula
- Grafikler: Recharts kullan, veri dönüşümü `utils/chartTransformers.js`'de
- Export: `utils/exportUtils.js` ile CSV/Excel

### CORS Değişiklikleri
Yeni frontend portları için `main.py`'deki CORS allowlist'e ekle:
```python
allow_origins=["http://localhost:5173", "http://localhost:5174", ...]
```

## Database

**Dev**: `postgresql://postgres:trendyol123@localhost:5433/trendyol_db`
**Docker**: `postgresql://postgres:trendyol123@postgres:5432/trendyol_db`

Migrations: Alembic (`backend/alembic/`). Her schema değişikliğinde `alembic revision --autogenerate` çalıştır.

| Model | Amaç | Anahtar Alanlar |
|-------|------|-----------------|
| Category | Hiyerarşik kategori ağacı | `parent_id` (self-ref), `trendyol_category_id` |
| Snapshot | Aylık veri görüntüleri | `category_id`, `json_file_path` |
| Report | Kayıtlı raporlar | `category_id`, `json_file_path` |
| EnrichmentError | API hata logları | `endpoint`, `error_type`, `status_code` |

## Deployment

**Platform**: Coolify + Docker Compose + Traefik reverse proxy

Docker Compose servisleri: `postgres` (15-alpine), `backend` (FastAPI), `frontend` (Nginx)

`startup.sh` sırası: PostgreSQL bağlantı bekle → Alembic migration → Kategori seeding → Uvicorn başlat

Traefik SSE streaming desteği: 100ms flush interval (rapor progress için)

### URL Mimarisi (KRİTİK — "Failed to fetch" hatası burada başlar)

```
Tarayıcı → https://trendyol.194.187.253.230.sslip.io  (frontend, Traefik)
         → https://trendyol-api.194.187.253.230.sslip.io  (backend API, Traefik)
```

**Frontend (`admin-panel/src/config/api.js`)**:
```js
export const API_URL = import.meta.env.VITE_API_URL ?? ''
```
- `VITE_API_URL` Coolify tarafından build ARG olarak geçilir: `https://trendyol-api.194.187.253.230.sslip.io`
- Bu değer `admin-panel/Dockerfile`'da `ARG VITE_API_URL=` (boş default) olarak tanımlı
- Vite build sırasında bu URL koda **inline** edilir → runtime'da değiştirilemez

**⚠️ Değiştirme — asla yapma:**
- `admin-panel/.env` dosyasına `VITE_API_URL=http://...` ekleme — Vite `.env` dosyasını build ARG'dan önce okur, Coolify'ın set ettiği değeri ezer
- `Dockerfile`'daki `ARG VITE_API_URL=` satırına hardcoded URL yazma — bu da aynı sorunu yaratır
- `.env` sadece local dev içindir, Coolify build'e `.env` dosyası dahil edilmez

**Coolify Build Akışı**:
1. Git'ten clone → `.env` dosyası YOK (gitignore'da)
2. `docker build --build-arg VITE_API_URL=https://trendyol-api.194.187.253.230.sslip.io`
3. Dockerfile: `ARG VITE_API_URL=` → `ENV VITE_API_URL=$VITE_API_URL`
4. `npm run build` → URL koda gömülür

### Container / Traefik Sorunları

**Coolify deploy otomatik tetiklenmez** — kod push sonrası Coolify dashboard'dan manuel "Redeploy" gerekir.

**Container elle restart gerekirse** — mutlaka Traefik label'larıyla başlat:
```bash
# Coolify imajını bul
docker images | grep x4c08gc | grep frontend

# Doğru label'larla başlat (docker-compose.yaml'dan kopyala)
docker run -d \
  --name frontend-x4c08gc84kcw4oow0ggg44cg-212853484582 \
  --network x4c08gc84kcw4oow0ggg44cg \
  --network x4c08gc84kcw4oow0ggg44cg_trendyol-network \
  -p 3010:80 \
  --label traefik.enable=true \
  --label "traefik.http.services.http-0-x4c08gc84kcw4oow0ggg44cg-frontend.loadbalancer.server.port=80" \
  --label "traefik.http.routers.http-0-x4c08gc84kcw4oow0ggg44cg-frontend.entryPoints=http" \
  --label "traefik.http.routers.http-0-x4c08gc84kcw4oow0ggg44cg-frontend.middlewares=gzip" \
  --label "traefik.http.routers.http-0-x4c08gc84kcw4oow0ggg44cg-frontend.rule=Host(\`trendyol.194.187.253.230.sslip.io\`) && PathPrefix(\`/\`)" \
  --label "traefik.docker.network=coolify" \
  x4c08gc84kcw4oow0ggg44cg_frontend:<GIT_COMMIT_HASH>
```
Traefik label'ları olmadan container başlarsa site **Bad Gateway** verir.

**nginx `/categories/` proxy** — `admin-panel/nginx.conf`'ta `/api/` yanı sıra `/categories/` de backend'e proxy'lenir. Bu satırı silme.

## Kaynak Limitleri

| Kaynak | Limit |
|--------|-------|
| Cache | 100 item, 1 saat TTL |
| Frontend pagination | 150 item/sayfa |
| Backend pagination | 200 item/sayfa |
| Sosyal kanıt batch | 5 ürün/istek |
| Rate limit | 2 istek/saniye (sosyal kanıt) |

## Dokümantasyon

| Dosya | Amaç |
|-------|------|
| docs/DASHBOARD_ARCHITECTURE.md | Dashboard veri yapıları ve KPI tanımları |
| docs/bug-fixes/ORIGINTAB_BUG_FIX.md | **Kritik** - Alan adı uyumsuzluk pattern'i |
| docs/API_DOCUMENTATION.md | Tam API referansı |
| docs/ARCHITECTURE.md | Sistem mimarisi (Türkçe) |
| docs/SETUP_GUIDE.md | Kurulum rehberi |
