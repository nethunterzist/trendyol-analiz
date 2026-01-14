# API Dokümantasyonu

Trendyol Product Dashboard backend API referansı.

## Genel Bilgi

**Base URL:** `http://127.0.0.1:8001`

**Swagger UI:** http://127.0.0.1:8001/docs

**ReDoc:** http://127.0.0.1:8001/redoc

## HTTP Durum Kodları

| Kod | Anlam |
|-----|-------|
| 200 | Başarılı |
| 201 | Oluşturuldu |
| 400 | Geçersiz istek |
| 404 | Bulunamadı |
| 422 | Validasyon hatası |
| 500 | Sunucu hatası |

## Hata Response Formatı

```json
{
  "detail": "Hata mesajı"
}
```

---

## Kategori Endpoints

### Ana Kategorileri Getir

```http
GET /categories/main
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Kozmetik",
    "parent_id": null,
    "trendyol_category_id": 1234,
    "children_count": 42
  }
]
```

### Kategori Detayı

```http
GET /categories/{category_id}
```

### Alt Kategoriler

```http
GET /categories/{category_id}/subcategories
```

### Tüm Kategoriler

```http
GET /categories?skip=0&limit=200
```

| Parametre | Tip | Varsayılan |
|-----------|-----|------------|
| skip | integer | 0 |
| limit | integer | 200 |

---

## Rapor Endpoints

### Rapor Listesi

```http
GET /api/reports
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Kasım Kozmetik Analizi",
    "category_id": 1,
    "total_products": 1523,
    "total_subcategories": 42,
    "created_at": "2024-11-20T14:30:00",
    "category_name": "Kozmetik"
  }
]
```

### Rapor Oluştur

```http
POST /api/reports/create
```

**Query Parameters:**
| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| name | string | Evet | Rapor adı |
| category_id | integer | Evet | Ana kategori ID |
| subcategory_ids | string | Hayır | Virgülle ayrılmış alt kategori ID'leri |

**Response:**
```json
{
  "task_id": "uuid-1234-5678",
  "report_id": 3,
  "status": "processing",
  "message": "Rapor oluşturma başladı"
}
```

### İlerleme Durumu

```http
GET /api/reports/progress/{task_id}
```

**Response (İşlemde):**
```json
{
  "status": "processing",
  "current": 15,
  "total": 42,
  "percentage": 35.7,
  "current_category": "Parfüm"
}
```

**Response (Tamamlandı):**
```json
{
  "status": "completed",
  "percentage": 100,
  "report_id": 3
}
```

### Rapor Detayı

```http
GET /api/reports/{report_id}
```

### Rapor Sil

```http
DELETE /api/reports/{report_id}
```

---

## Dashboard Endpoints

### Dashboard Verisi

```http
GET /api/dashboard/{report_id}
```

**Response:**
```json
{
  "kpis": {
    "total_products": 1523,
    "avg_price": 245.50,
    "avg_rating": 4.2,
    "total_reviews": 45678,
    "barcode_percentage": 81.0
  },
  "charts": {
    "top_brands": [...],
    "top_products": [...],
    "price_distribution": [...],
    "rating_distribution": [...],
    "origin_countries": [...]
  },
  "all_products": [...]
}
```

**Cache:** 1 saat TTL, ilk istek işler ve cache'ler.

### Keyword Analizi

```http
GET /api/dashboard/{report_id}/keyword-analysis
```

**Response:**
```json
{
  "keywords": [
    {"keyword": "parfüm", "count": 234, "avg_price": 189.99},
    {"keyword": "cilt bakım", "count": 156, "avg_price": 245.00}
  ],
  "trends": [...]
}
```

### Ürün Arama

```http
POST /api/dashboard/{report_id}/product-finder
```

**Request Body:**
```json
{
  "query": "parfüm",
  "min_price": 100,
  "max_price": 500,
  "min_rating": 4.0,
  "brands": ["Brand A", "Brand B"],
  "sort_by": "price",
  "sort_order": "asc",
  "limit": 50
}
```

---

## Sosyal Kanıt Endpoints

### Sosyal Kanıt Verisi

```http
GET /api/reports/{report_id}/social-proof?refresh=false
```

| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| refresh | boolean | false | Cache'i yenile |
| batch_size | integer | 5 | Batch başına ürün |

**Response:**
```json
{
  "summary": {
    "total_views": 1234567,
    "total_orders": 45678,
    "total_favorites": 23456,
    "avg_views_per_product": 810.2
  },
  "top_viewed_products": [...]
}
```

### Sosyal Kanıt İlerleme

```http
GET /api/reports/{report_id}/social-proof/progress
```

---

## Enrichment Endpoints

### Zenginleştirme Başlat

```http
POST /api/reports/{report_id}/enrich/start
```

### Zenginleştirme Durumu

```http
GET /api/reports/{report_id}/enrich/status
```

**Response:**
```json
{
  "status": "processing",
  "step": "reviews",
  "progress": 45.2
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Social Proof API | 2 istek/saniye |
| Diğer | Limitsiz (localhost) |

## Timeout Değerleri

| Tip | Frontend | Backend |
|-----|----------|---------|
| STANDARD | 30s | 30s |
| DASHBOARD | 180s | 60s |
| ENRICHMENT | 120s | 60s |
| KEYWORD_ANALYSIS | 300s | 120s |

## CORS Allowed Origins

```
http://localhost:5173
http://localhost:5174
http://localhost:5175
http://127.0.0.1:5173
http://127.0.0.1:5174
http://127.0.0.1:5175
```

---

## curl Örnekleri

```bash
# Ana kategoriler
curl http://127.0.0.1:8001/categories/main

# Rapor oluştur
curl "http://127.0.0.1:8001/api/reports/create?name=Test&category_id=1"

# Dashboard verisi
curl http://127.0.0.1:8001/api/dashboard/1

# İlerleme kontrolü
curl http://127.0.0.1:8001/api/reports/progress/{task_id}
```

---

**Son Güncelleme**: Ocak 2025
