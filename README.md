# Trendyol Product Dashboard

Trendyol e-ticaret platformu için kategori bazlı ürün analiz sistemi. 7 tab'lı interaktif dashboard, otomatik rapor oluşturma ve detaylı metrikler sunar.

## Özellikler

| Tab | Açıklama |
|-----|----------|
| **Genel Bakış** | KPI kartları, özet grafikler, temel metrikler |
| **Marka** | Marka analizi, pazar payı dağılımı |
| **Kategori** | Kategori bazlı ürün dağılımı |
| **Menşei** | Ülke bazlı ürün analizi |
| **Barkod** | Barkod veri analizi ve dağılımı |
| **Keyword Aracı** | Anahtar kelime trend analizi |
| **Ürün Bulma** | Gelişmiş ürün arama ve filtreleme |

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 19.2.0, Vite 7.2.2, Tailwind CSS 4.1.17, Recharts 3.4.1 |
| **Backend** | FastAPI 0.104.1, SQLAlchemy 2.0.45, Uvicorn 0.24.0 |
| **Database** | SQLite |
| **HTTP Client** | Axios 1.13.2 |

## Hızlı Başlangıç

### Otomatik Başlatma (Önerilen)

```bash
python3 start.py
```

Bu script otomatik olarak:
- Dependency'leri kontrol eder
- Port çakışmalarını çözer
- Backend ve frontend'i başlatır

### Manuel Başlatma

**Terminal 1 - Backend:**
```bash
cd backend
pip install -r requirements.txt
python3 main.py
```

**Terminal 2 - Frontend:**
```bash
cd admin-panel
npm install
npm run dev
```

### Erişim URL'leri

- **Frontend:** http://localhost:5173
- **Backend API:** http://127.0.0.1:8001
- **API Docs:** http://127.0.0.1:8001/docs

## Proje Yapısı

```
product_Dashboard/
├── backend/                     # FastAPI Backend
│   ├── main.py                  # Ana API (~4400 satır, 30+ endpoint)
│   ├── database.py              # SQLAlchemy modelleri
│   ├── scraper.py               # Trendyol veri çekme
│   └── requirements.txt         # Python dependencies
│
├── admin-panel/                 # React Frontend
│   └── src/
│       ├── components/
│       │   ├── CategoryManagement.jsx    # Kategori yönetimi
│       │   ├── ReportGeneration.jsx      # Rapor oluşturma
│       │   ├── ReportList.jsx            # Rapor listesi
│       │   ├── ReportDashboard.jsx       # 7-tab dashboard
│       │   └── dashboard-tabs/           # Tab componentleri
│       ├── config/api.js                 # API konfigürasyonu
│       └── constants/tabGroups.js        # Tab yapılandırması
│
├── categories/                  # Kategori JSON dosyaları (1842 adet)
├── reports/                     # Oluşturulan raporlar
├── docs/                        # Dokümantasyon
│   ├── ARCHITECTURE.md          # Sistem mimarisi (Türkçe)
│   ├── API_DOCUMENTATION.md     # API referansı
│   ├── SETUP_GUIDE.md           # Kurulum kılavuzu
│   └── DASHBOARD_ARCHITECTURE.md # Dashboard geliştirme rehberi
│
├── start.py                     # Otomatik başlatma scripti
├── CLAUDE.md                    # Claude Code rehberi
└── README.md                    # Bu dosya
```

## Docker ile Çalıştırma

```bash
# Build
docker-compose build

# Başlat
docker-compose up -d

# Durdur
docker-compose down
```

**Docker Erişim:**
- Frontend: http://localhost:8080
- Backend: http://localhost:8001

## API Özeti

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/categories/main` | GET | Ana kategoriler |
| `/categories/{id}/subcategories` | GET | Alt kategoriler |
| `/api/reports` | GET | Rapor listesi |
| `/api/reports/create` | POST | Rapor oluştur |
| `/api/reports/progress/{task_id}` | GET | İlerleme durumu |
| `/api/dashboard/{report_id}` | GET | Dashboard verisi |

## Konfigürasyon

### API Timeout Değerleri

| Tip | Süre | Kullanım |
|-----|------|----------|
| STANDARD | 30s | Genel istekler |
| DASHBOARD | 180s | Dashboard yükleme |
| ENRICHMENT | 120s | Sosyal kanıt verisi |
| KEYWORD_ANALYSIS | 300s | Keyword analizi |

### Kaynak Limitleri

| Kaynak | Limit |
|--------|-------|
| Cache | 100 item, 1 saat TTL |
| Frontend pagination | 150 item/sayfa |
| Backend pagination | 200 item/sayfa |
| Rate limit | 2 istek/saniye |

## Sorun Giderme

### Port Çakışması
```bash
# Otomatik çözüm
python3 start.py

# Manuel çözüm
lsof -ti:8001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### CORS Hatası
`backend/main.py` dosyasında frontend portunu CORS listesine ekleyin:
```python
allow_origins=["http://localhost:5173", "http://localhost:5174", ...]
```

### Database Sıfırlama
```bash
cd backend
python3 -c "from database import init_db; init_db()"
```

## Dokümantasyon

| Dosya | Açıklama |
|-------|----------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Sistem mimarisi (Türkçe) |
| [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | API referansı |
| [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) | Kurulum kılavuzu |
| [docs/DASHBOARD_ARCHITECTURE.md](./docs/DASHBOARD_ARCHITECTURE.md) | Dashboard geliştirme |
| [CLAUDE.md](./CLAUDE.md) | Claude Code rehberi |

## Gereksinimler

- Python 3.8+
- Node.js 18+
- npm 9+

---

**Versiyon:** 2.1.0 | **Son Güncelleme:** Ocak 2025
