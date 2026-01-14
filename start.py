#!/usr/bin/env python3
"""
Trendyol Analytics Dashboard - Otomatik Başlatma Scripti
Tüm kontrolleri yapar, ayarları düzeltir ve projeyi başlatır.
"""

import os
import sys
import json
import time
import socket
import subprocess
from pathlib import Path
from typing import Optional, Tuple

# Renkli terminal çıktısı
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_status(emoji: str, message: str, color: str = Colors.GREEN):
    """Renkli status mesajı yazdır"""
    print(f"{color}{emoji} {message}{Colors.END}")

def print_header(title: str):
    """Başlık yazdır"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def check_port_available(port: int) -> bool:
    """Port'un kullanılabilir olup olmadığını kontrol et"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) != 0

def find_available_port(start_port: int, max_attempts: int = 10) -> Optional[int]:
    """Kullanılabilir port bul"""
    for port in range(start_port, start_port + max_attempts):
        if check_port_available(port):
            return port
    return None

def kill_process_on_port(port: int):
    """Belirtilen porttaki process'i öldür"""
    try:
        result = subprocess.run(
            f"lsof -ti:{port} | xargs kill -9",
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print_status("🔪", f"Port {port} üzerindeki process sonlandırıldı", Colors.YELLOW)
            time.sleep(1)
            return True
    except Exception:
        pass
    return False

def check_and_fix_env_file(project_root: Path, backend_port: int) -> bool:
    """Environment dosyasını kontrol et ve düzelt"""
    env_file = project_root / "admin-panel" / ".env"
    expected_url = f"VITE_API_URL=http://127.0.0.1:{backend_port}"

    try:
        if env_file.exists():
            content = env_file.read_text().strip()
            if content != expected_url:
                print_status("⚙️", f".env dosyası güncelleniyor: {expected_url}", Colors.YELLOW)
                env_file.write_text(expected_url + "\n")
                return True
            else:
                print_status("✅", ".env dosyası doğru yapılandırılmış")
                return False
        else:
            print_status("📝", ".env dosyası oluşturuluyor", Colors.YELLOW)
            env_file.write_text(expected_url + "\n")
            return True
    except Exception as e:
        print_status("❌", f".env dosyası hatası: {e}", Colors.RED)
        return False

def check_dependencies(project_root: Path) -> Tuple[bool, bool]:
    """Bağımlılıkları kontrol et"""
    print_header("BAĞIMLILIK KONTROLÜ")

    # Python bağımlılıkları
    python_ok = True
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        print_status("✅", "Python bağımlılıkları yüklü")
    except ImportError as e:
        print_status("❌", f"Python bağımlılıkları eksik: {e}", Colors.RED)
        print_status("💡", "Çözüm: cd backend && pip install -r requirements.txt", Colors.YELLOW)
        python_ok = False

    # Node.js bağımlılıkları
    node_modules = project_root / "admin-panel" / "node_modules"
    node_ok = node_modules.exists()

    if node_ok:
        print_status("✅", "Node.js bağımlılıkları yüklü")
    else:
        print_status("❌", "Node.js bağımlılıkları eksik", Colors.RED)
        print_status("💡", "Çözüm: cd admin-panel && npm install", Colors.YELLOW)

    return python_ok, node_ok

def start_backend(project_root: Path, port: int) -> Optional[subprocess.Popen]:
    """Backend'i başlat"""
    backend_dir = project_root / "backend"

    try:
        print_status("🚀", f"Backend başlatılıyor (port {port})...", Colors.BLUE)

        # Backend process'ini başlat
        process = subprocess.Popen(
            [sys.executable, "main.py"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Backend'in başlamasını bekle
        time.sleep(3)

        # Backend'in çalıştığını kontrol et
        if not check_port_available(port):
            print_status("✅", f"Backend başarıyla başlatıldı: http://127.0.0.1:{port}")
            return process
        else:
            print_status("❌", "Backend başlatılamadı", Colors.RED)
            return None

    except Exception as e:
        print_status("❌", f"Backend başlatma hatası: {e}", Colors.RED)
        return None

def start_frontend(project_root: Path) -> Optional[subprocess.Popen]:
    """Frontend'i başlat"""
    frontend_dir = project_root / "admin-panel"

    try:
        print_status("🚀", "Frontend başlatılıyor...", Colors.BLUE)

        # Frontend process'ini başlat
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Frontend'in başlamasını bekle ve port'u yakala
        time.sleep(5)

        # Frontend çıktısını kontrol et
        frontend_port = None
        for _ in range(10):
            line = process.stdout.readline()
            if "Local:" in line and "http://localhost:" in line:
                # Port'u yakala: "Local:   http://localhost:5174/"
                frontend_port = line.split("http://localhost:")[1].split("/")[0]
                break
            time.sleep(0.5)

        if frontend_port:
            print_status("✅", f"Frontend başarıyla başlatıldı: http://localhost:{frontend_port}")
            return process
        else:
            print_status("⚠️", "Frontend başlatıldı ancak port tespit edilemedi", Colors.YELLOW)
            return process

    except Exception as e:
        print_status("❌", f"Frontend başlatma hatası: {e}", Colors.RED)
        return None

def main():
    """Ana başlatma fonksiyonu"""
    project_root = Path(__file__).parent

    print_header("TRENDYOL ANALYTICS DASHBOARD")
    print_status("📁", f"Proje dizini: {project_root}")

    # 1. Bağımlılıkları kontrol et
    python_ok, node_ok = check_dependencies(project_root)

    if not python_ok or not node_ok:
        print_status("❌", "Önce bağımlılıkları yükleyin!", Colors.RED)
        sys.exit(1)

    # 2. Port kontrolü ve yönetimi
    print_header("PORT YÖNETİMİ")

    BACKEND_PORT = 8001
    FRONTEND_PORT = 5173

    # Backend port kontrolü
    if not check_port_available(BACKEND_PORT):
        print_status("⚠️", f"Port {BACKEND_PORT} kullanımda", Colors.YELLOW)
        if input(f"Port {BACKEND_PORT}'i temizlemek ister misiniz? (e/h): ").lower() == 'e':
            kill_process_on_port(BACKEND_PORT)
        else:
            # Alternatif port bul
            BACKEND_PORT = find_available_port(8001)
            if not BACKEND_PORT:
                print_status("❌", "Kullanılabilir port bulunamadı!", Colors.RED)
                sys.exit(1)
            print_status("🔄", f"Alternatif backend portu: {BACKEND_PORT}", Colors.YELLOW)
    else:
        print_status("✅", f"Backend portu {BACKEND_PORT} kullanılabilir")

    # Frontend port kontrolü
    if not check_port_available(FRONTEND_PORT):
        print_status("⚠️", f"Port {FRONTEND_PORT} kullanımda (Vite otomatik alternatif seçecek)", Colors.YELLOW)
    else:
        print_status("✅", f"Frontend portu {FRONTEND_PORT} kullanılabilir")

    # 3. Environment dosyasını kontrol et ve düzelt
    print_header("YAPILANDIRMA KONTROLÜ")
    env_changed = check_and_fix_env_file(project_root, BACKEND_PORT)

    if env_changed:
        print_status("🔄", "Yapılandırma güncellendi, frontend yeniden başlatılacak", Colors.YELLOW)

    # 4. Servisleri başlat
    print_header("SERVİSLERİ BAŞLAT")

    # Backend'i başlat
    backend_process = start_backend(project_root, BACKEND_PORT)
    if not backend_process:
        print_status("❌", "Backend başlatılamadı, çıkılıyor...", Colors.RED)
        sys.exit(1)

    # Frontend'i başlat
    frontend_process = start_frontend(project_root)
    if not frontend_process:
        print_status("❌", "Frontend başlatılamadı", Colors.RED)
        backend_process.terminate()
        sys.exit(1)

    # 5. Özet ve erişim bilgileri
    print_header("✅ BAŞARILI - SİSTEM HAZIR")
    print_status("🌐", f"Backend API: http://127.0.0.1:{BACKEND_PORT}")
    print_status("💻", "Frontend: http://localhost:5173 veya 5174 (konsolu kontrol edin)")
    print_status("📊", "Kategorileri görmek için ana sayfaya gidin")
    print_status("📝", "Rapor oluşturmak için 'Rapor Oluştur' sekmesine gidin")
    print()
    print_status("⚠️", "Durdurmak için: CTRL+C", Colors.YELLOW)

    # Process'leri çalışır durumda tut
    try:
        while True:
            time.sleep(1)

            # Process'lerin hala çalıştığını kontrol et
            if backend_process.poll() is not None:
                print_status("❌", "Backend beklenmedik şekilde durdu!", Colors.RED)
                break

            if frontend_process.poll() is not None:
                print_status("❌", "Frontend beklenmedik şekilde durdu!", Colors.RED)
                break

    except KeyboardInterrupt:
        print()
        print_status("🛑", "Sistem kapatılıyor...", Colors.YELLOW)

        # Process'leri temiz şekilde kapat
        backend_process.terminate()
        frontend_process.terminate()

        time.sleep(2)

        # Hala çalışıyorlarsa zorla kapat
        if backend_process.poll() is None:
            backend_process.kill()
        if frontend_process.poll() is None:
            frontend_process.kill()

        print_status("✅", "Sistem temiz bir şekilde kapatıldı")

if __name__ == "__main__":
    main()
