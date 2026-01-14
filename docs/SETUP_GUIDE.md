# Kurulum Kılavuzu

Trendyol Product Dashboard localhost kurulum rehberi.

## Gereksinimler

### Yazılım
- Python 3.8+
- Node.js 18+
- npm 9+

### Donanım
- RAM: 4GB minimum (8GB önerilen)
- Disk: 2GB boş alan
- Internet bağlantısı

### Versiyon Kontrolü

```bash
python3 --version  # 3.8+
node --version     # v18+
npm --version      # 9+
```

## Hızlı Kurulum

### 1. Dependency Kurulumu

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd admin-panel
npm install
```

### 2. Uygulamayı Başlat

**Otomatik (Önerilen):**
```bash
python3 start.py
```

**Manuel:**
```bash
# Terminal 1
cd backend && python3 main.py

# Terminal 2
cd admin-panel && npm run dev
```

### 3. Erişim

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://127.0.0.1:8001 |
| API Docs | http://127.0.0.1:8001/docs |

## Environment Yapılandırması

### Frontend (.env)

```bash
cd admin-panel
echo "VITE_API_URL=http://127.0.0.1:8001" > .env
```

### Backend

Port ve CORS konfigürasyonu `backend/main.py` içinde hardcoded:
- Port: 8001
- CORS: localhost:5173, 5174, 5175

## Database

SQLite otomatik oluşturulur. Manuel başlatma:

```bash
cd backend
python3 -c "from database import init_db; init_db()"
```

### Database Yedekleme

```bash
cp backend/trendyol.db backend/trendyol.db.backup
```

## Sorun Giderme

### Port Çakışması

```bash
# Otomatik çözüm
python3 start.py

# Manuel çözüm
lsof -ti:8001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### "Failed to fetch" Hatası

1. Backend'in çalıştığını kontrol et:
```bash
curl http://127.0.0.1:8001/
```

2. `.env` dosyasını kontrol et:
```bash
cat admin-panel/.env
# VITE_API_URL=http://127.0.0.1:8001 olmalı
```

### CORS Hatası

`backend/main.py` içinde frontend portunu ekle:
```python
allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",  # Yeni port
    "http://127.0.0.1:5173",
    ...
]
```

### ModuleNotFoundError

```bash
cd backend
pip install -r requirements.txt
```

### Node.js Modül Hatası

```bash
cd admin-panel
rm -rf node_modules package-lock.json
npm install
```

### Database Locked

```bash
pkill -f "python.*main.py"
cd backend
python3 main.py
```

## Platform-Specific

### macOS

```bash
brew install python@3.11 node@18
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install python3.11 python3-pip python3-venv
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Windows (WSL2)

```powershell
wsl --install
```
Sonra Ubuntu talimatlarını takip edin.

## Geliştirme Modu

**Backend (auto-reload):**
```bash
cd backend
uvicorn main:app --reload --log-level debug --port 8001
```

**Frontend (debug):**
```bash
cd admin-panel
npm run dev -- --debug
```

## Doğrulama

```bash
# Backend test
curl http://127.0.0.1:8001/categories/main

# Frontend
# http://localhost:5173 tarayıcıda aç
```

## Bakım

### Haftalık
- Cache temizliği: `rm -rf reports/enrich_*/`
- Disk kontrolü: `df -h`

### Aylık
- Database yedekleme
- Dependency güncelleme (test ettikten sonra)

### Temizlik

```bash
# Python cache
find . -type d -name __pycache__ -exec rm -rf {} +

# npm cache
npm cache clean --force

# Eski raporlar
find reports/ -name "*.json" -mtime +30 -delete
```

---

**Son Güncelleme**: Ocak 2025
