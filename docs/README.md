# Dokümantasyon

Trendyol Product Dashboard teknik dokümantasyon dizini.

## Dokümantasyon İndeksi

| Dosya | Açıklama | Öncelik |
|-------|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Sistem mimarisi ve tasarım (Türkçe) | Referans |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API endpoint referansı | Referans |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Kurulum ve sorun giderme | Başlangıç |
| **[DASHBOARD_ARCHITECTURE.md](./DASHBOARD_ARCHITECTURE.md)** | **Dashboard geliştirme rehberi** | **KRİTİK** |
| **[bug-fixes/ORIGINTAB_BUG_FIX.md](./bug-fixes/ORIGINTAB_BUG_FIX.md)** | **Alan adı uyumsuzluk pattern'i** | **KRİTİK** |

## Hızlı Başlangıç

### Yeni Geliştiriciler İçin

1. [../README.md](../README.md) - Proje genel bakış
2. [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Kurulum
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - Mimari
4. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API referansı

### Dashboard/Frontend Çalışması

**KRİTİK**: Dashboard koduna dokunmadan önce:

1. [DASHBOARD_ARCHITECTURE.md](./DASHBOARD_ARCHITECTURE.md) oku
2. [bug-fixes/ORIGINTAB_BUG_FIX.md](./bug-fixes/ORIGINTAB_BUG_FIX.md) oku
3. `admin-panel/src/components/ReportDashboard.jsx` incele

### Backend/API Çalışması

1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) referans al
2. [ARCHITECTURE.md](./ARCHITECTURE.md) incele
3. `backend/main.py` kodunu incele

## Klasör Yapısı

```
docs/
├── README.md                      # Bu dosya
├── ARCHITECTURE.md                # Sistem mimarisi (Türkçe)
├── API_DOCUMENTATION.md           # API referansı
├── SETUP_GUIDE.md                 # Kurulum kılavuzu
├── DASHBOARD_ARCHITECTURE.md      # Dashboard geliştirme rehberi
└── bug-fixes/
    └── ORIGINTAB_BUG_FIX.md       # Bug fix pattern referansı
```

## Dashboard Kuralları (Özet)

**YAPMA**:
- `all_products`'tan hesaplama yapma (`charts` varsa)
- Backend'i kontrol etmeden alan adı uydurma
- Console.log debugging'i atlama

**YAP**:
- Backend'in `charts` ve `kpis` objelerini kullan
- `ReportDashboard.jsx`'teki pattern'leri takip et
- Alan adlarını producer-consumer arası doğrula
- Dönüşümler için mapping layer pattern kullan

## İlgili Dosyalar

- [../README.md](../README.md) - Ana proje README
- [../CLAUDE.md](../CLAUDE.md) - Claude Code rehberi
- `../admin-panel/` - Frontend kaynak kodu
- `../backend/` - Backend kaynak kodu

---

**Son Güncelleme**: Ocak 2025
