# Sistem Mimarisi

Trendyol Product Dashboard teknik mimari dokümantasyonu.

## Genel Bakış

Trendyol Product Dashboard, Trendyol e-ticaret platformundan ürün verilerini çekip analiz eden full-stack bir uygulamadır.

**Temel Özellikler:**
- Kategori bazlı ürün verisi çekme (scraping)
- Otomatik rapor oluşturma ve arka plan işleme
- **7 tab'lı** çok boyutlu analitik dashboard
- Gerçek zamanlı ilerleme takibi
- Sosyal kanıt metrikleri ve yorum analizi

## 3 Katmanlı Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                   │
│              (React Frontend - Admin Panel)             │
│  • CategoryManagement • ReportGeneration               │
│  • ReportList • ReportDashboard (7 tab)                │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                    │
│              (FastAPI Backend - main.py)                │
│  • REST API Endpoints • Business Logic                  │
│  • Data Processing • External API Integration          │
└─────────────────────────────────────────────────────────┘
                        ↕ ORM (SQLAlchemy)
┌─────────────────────────────────────────────────────────┐
│                      DATA LAYER                         │
│              (SQLite Database + JSON Files)             │
│  • trendyol.db (SQLite) • categories/*.json            │
│  • reports/*.json                                      │
└─────────────────────────────────────────────────────────┘
```

## Teknoloji Stack

### Backend
| Teknoloji | Versiyon | Amaç |
|-----------|----------|------|
| Python | 3.8+ | Runtime |
| FastAPI | 0.104.1 | Web framework |
| SQLAlchemy | 2.0.45 | ORM |
| Uvicorn | 0.24.0 | ASGI server |
| Requests | 2.31.0 | HTTP client |

### Frontend
| Teknoloji | Versiyon | Amaç |
|-----------|----------|------|
| React | 19.2.0 | UI library |
| Vite | 7.2.2 | Build tool |
| Recharts | 3.4.1 | Grafikler |
| Tailwind CSS | 4.1.17 | Styling |
| React Router DOM | 7.9.5 | Routing |
| Axios | 1.13.2 | HTTP client |

### Veri Depolama
- **SQLite**: İlişkisel veritabanı (kategoriler, raporlar, snapshots)
- **JSON Files**: Ürün verileri ve raporlar (`categories/`, `reports/`)

## Dashboard Tab Yapısı (7 Tab)

| Tab ID | Tab Adı | Açıklama |
|--------|---------|----------|
| overview | Genel Bakış | KPI kartları, özet grafikler |
| brand | Marka | Marka analizi, pazar payı |
| category | Kategori | Kategori dağılımı |
| origin | Menşei | Ülke bazlı analiz |
| barcode | Barkod | Barkod veri analizi |
| keyword | Keyword Aracı | Anahtar kelime analizi |
| product-finder | Ürün Bulma | Ürün arama/filtreleme |

## Veritabanı Şeması

### Category Model
```python
id: Integer (Primary Key)
name: String
parent_id: Integer (Foreign Key → categories.id)
trendyol_category_id: Integer
trendyol_url: String
is_active: Boolean
created_at: DateTime
```

### Snapshot Model
```python
id: Integer (Primary Key)
category_id: Integer (Foreign Key → categories.id)
snapshot_month: String (örn: "2024-11")
total_products: Integer
avg_price: Integer
json_file_path: String
scraped_at: DateTime
```

### Report Model
```python
id: Integer (Primary Key)
name: String
category_id: Integer (Foreign Key → categories.id)
total_products: Integer
total_subcategories: Integer
json_file_path: String
created_at: DateTime
```

### EnrichmentError Model
```python
id: Integer (Primary Key)
report_id: Integer
product_id: Integer
endpoint: String (reviews | social | questions)
error_type: String (timeout | dns | http | other)
message: String
status_code: Integer
created_at: DateTime
```

### İlişki Diyagramı
```
Category (1) ──< (N) Snapshot
Category (1) ──< (N) Report
Category (1) ──< (N) Category (self-referential)
```

## Veri Akışı

### Rapor Oluşturma Akışı
```
1. POST /api/reports/create → task_id döner
2. BackgroundTask başlar
3. Client: GET /api/reports/progress/{task_id} (polling)
4. Backend: Trendyol API tarama (her alt kategori)
5. JSON dosyası kayıt → reports/
6. DB'ye rapor kaydı
7. Progress: 100%
```

### Dashboard Veri Akışı
```
1. GET /api/dashboard/{report_id}
2. Backend: JSON okur, on-demand işler/toplar
3. Cache kontrolü (BoundedCache)
4. Response: { kpis: {...}, charts: {...}, all_products: [...] }
5. Frontend: Hazır objeleri render eder
```

## API Endpoint Yapısı

### Kategori Endpoints
| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/categories/main` | GET | Ana kategoriler |
| `/categories/{id}` | GET | Kategori detayı |
| `/categories/{id}/subcategories` | GET | Alt kategoriler |

### Rapor Endpoints
| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/reports` | GET | Rapor listesi |
| `/api/reports/create` | POST | Rapor oluştur |
| `/api/reports/progress/{task_id}` | GET | İlerleme durumu |
| `/api/reports/{id}` | GET/DELETE | Rapor detay/sil |

### Dashboard Endpoints
| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/dashboard/{report_id}` | GET | Dashboard verisi |
| `/api/dashboard/{report_id}/keyword-analysis` | GET | Keyword analizi |
| `/api/dashboard/{report_id}/product-finder` | POST | Ürün arama |

## Caching Stratejisi

### Backend Cache (BoundedCache)
```python
maxsize: 100 item
TTL: 3600 saniye (1 saat)
eviction: LRU (Least Recently Used)
thread-safe: Evet
```

### Frontend Cache
- Browser HTTP cache
- API response caching
- React.memo ile component memoization

## Güvenlik Özellikleri

| Özellik | Açıklama |
|---------|----------|
| CORS | Explicit origin whitelisting |
| Input Validation | Pydantic models |
| Path Traversal | Dosya yolu kontrolü |
| Rate Limiting | 2 istek/saniye (sosyal kanıt) |
| Timeout | Tüm external çağrılarda timeout |

## Performans Metrikleri

| Metrik | Değer |
|--------|-------|
| Dashboard yükleme | 2-5 saniye |
| Tab değiştirme | <500ms |
| API response (cached) | <200ms |
| API response (uncached) | 1-5 saniye |
| Rapor oluşturma | 5-30 dakika |

## Performans Optimizasyonları

### Backend
- Request deduplication
- Exponential backoff (%75 istek azaltma)
- Circuit breaker pattern
- Connection pooling

### Frontend
- Lazy loading (%65 bundle azaltma)
- Code splitting
- Debouncing
- React.memo

## Konfigürasyon

### API Timeout Değerleri
| Tip | Süre |
|-----|------|
| STANDARD | 30s |
| DASHBOARD | 180s |
| ENRICHMENT | 120s |
| KEYWORD_ANALYSIS | 300s |

### Environment Variables
**Frontend** (`.env`):
```bash
VITE_API_URL=http://127.0.0.1:8001
```

## Proje Yapısı

```
product_Dashboard/
├── backend/
│   ├── main.py           # Ana API (~4400 satır)
│   ├── database.py       # SQLAlchemy modelleri
│   ├── scraper.py        # Trendyol scraping
│   └── requirements.txt
│
├── admin-panel/
│   └── src/
│       ├── components/
│       │   ├── ReportDashboard.jsx  # 7-tab dashboard
│       │   └── dashboard-tabs/      # Tab componentleri
│       ├── config/api.js
│       └── constants/tabGroups.js
│
├── categories/           # 1842 JSON dosyası
├── reports/              # Oluşturulan raporlar
└── docs/                 # Dokümantasyon
```

## Gelecek Geliştirmeler

- PostgreSQL migration
- WebSocket desteği (real-time updates)
- CI/CD pipeline
- Docker containerization
- Application monitoring

---

**Versiyon**: 2.1.0 | **Son Güncelleme**: Ocak 2025
