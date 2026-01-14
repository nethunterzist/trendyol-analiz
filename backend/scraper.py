"""
Trendyol Best Seller Scraper - Backend Integration
Veritabanından kategorileri alıp otomatik çeker
"""

import requests
import json
import time
import math
import os
from typing import Dict, List, Any, Optional
from datetime import datetime


class TrendyolScraper:
    """Trendyol API'den best seller ürünlerini çeker"""

    API_BASE_URL = "https://apigw.trendyol.com/discovery-sfint-browsing-service/api/top-rankings/top-ranking-contents"

    def __init__(self, category_id: int, page_size: int = 20):
        """
        Args:
            category_id: Trendyol kategori ID
            page_size: Sayfa başına ürün sayısı (max 20)
        """
        self.category_id = category_id
        self.page_size = min(page_size, 20)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": "https://www.trendyol.com/"
        }

    def fetch_page(self, page: int) -> Optional[Dict[str, Any]]:
        """Tek sayfa çeker"""
        params = {
            "categoryId": self.category_id,
            "rankingType": "bestSeller",
            "webGenderId": 1,
            "page": page,
            "pageSize": self.page_size,
            "channelId": 1,
            "storefrontId": 1,
            "language": "tr",
            "countryCode": "TR"
        }

        try:
            response = requests.get(
                self.API_BASE_URL,
                params=params,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Sayfa {page} error: {e}")
            return None

    def get_total_count(self) -> int:
        """Toplam ürün sayısını öğrenir"""
        data = self.fetch_page(page=1)

        if not data or not data.get('isSuccess'):
            return 0

        return data.get('totalCount', 0)

    def calculate_total_pages(self, total_count: int, max_pages: int = None) -> int:
        """Kaç sayfa çekeceğimizi hesaplar"""
        total_pages = math.ceil(total_count / self.page_size)

        # Max sayfa limiti varsa uygula
        if max_pages:
            total_pages = min(total_pages, max_pages)

        return total_pages

    def fetch_all_products(self, delay: float = 1.0, max_pages: int = 5) -> List[Dict[str, Any]]:
        """
        Ürünleri çeker

        Args:
            delay: İstekler arası bekleme süresi
            max_pages: Maksimum sayfa sayısı (default: 5 = 100 ürün)

        Returns:
            Ürün listesi
        """
        # Toplam ürün sayısını öğren
        total_count = self.get_total_count()
        if total_count == 0:
            return []

        # Sayfa sayısını hesapla
        total_pages = self.calculate_total_pages(total_count, max_pages)

        print(f"📦 Kategori {self.category_id}: {total_count} ürün, {total_pages} sayfa çekilecek")

        # Sayfaları çek
        all_products = []

        for page in range(1, total_pages + 1):
            data = self.fetch_page(page)

            if not data or not data.get('isSuccess'):
                print(f"⚠️  Sayfa {page} atlandı")
                continue

            products = data.get('products', [])
            all_products.extend(products)

            # Rate limiting
            if page < total_pages:
                time.sleep(delay)

        return all_products

    def save_to_json(self, products: List[Dict[str, Any]], filename: str) -> bool:
        """
        JSON dosyasına kaydeder

        Args:
            products: Ürün listesi
            filename: Dosya yolu

        Returns:
            Başarılı mı?
        """
        try:
            # Dizin yoksa oluştur
            os.makedirs(os.path.dirname(filename), exist_ok=True)

            output = {
                "scraped_at": datetime.now().isoformat(),
                "category_id": self.category_id,
                "total_products": len(products),
                "products": products
            }

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

            return True
        except Exception as e:
            print(f"❌ Dosya kaydetme hatası: {e}")
            return False

    def get_category_info(self) -> Optional[Dict[str, Any]]:
        """Kategori bilgilerini döndürür"""
        data = self.fetch_page(page=1)

        if not data or not data.get('isSuccess'):
            return None

        return data.get('categoryInfo', {})


def scrape_category(category_id: int, category_name: str, output_dir: str = "../categories") -> Dict[str, Any]:
    """
    Tek bir kategoriyi çeker

    Args:
        category_id: Trendyol kategori ID
        category_name: Kategori adı
        output_dir: JSON dosyalarının kaydedileceği dizin

    Returns:
        Scraping sonuçları
    """
    result = {
        "category_id": category_id,
        "category_name": category_name,
        "success": False,
        "total_products": 0,
        "file_path": None,
        "error": None
    }

    try:
        # Scraper oluştur
        scraper = TrendyolScraper(category_id=category_id, page_size=20)

        # Ürünleri çek (max 5 sayfa = 100 ürün)
        products = scraper.fetch_all_products(delay=1.0, max_pages=5)

        if not products:
            result["error"] = "No products found"
            return result

        # JSON'a kaydet
        filename = f"{output_dir}/{category_name}_{category_id}.json"
        success = scraper.save_to_json(products, filename)

        if success:
            result["success"] = True
            result["total_products"] = len(products)
            result["file_path"] = filename
        else:
            result["error"] = "Failed to save JSON"

    except Exception as e:
        result["error"] = str(e)

    return result


def scrape_multiple_categories(categories: List[tuple], delay: float = 2.0) -> Dict[str, Any]:
    """
    Birden fazla kategoriyi çeker

    Args:
        categories: [(category_id, category_name), ...] listesi
        delay: Kategoriler arası bekleme süresi

    Returns:
        Genel sonuçlar
    """
    results = {
        "scraped_at": datetime.now().isoformat(),
        "total_categories": len(categories),
        "successful": 0,
        "failed": 0,
        "total_products": 0,
        "details": []
    }

    for i, (cat_id, cat_name) in enumerate(categories, 1):
        print(f"\n{'='*80}")
        print(f"📂 [{i}/{len(categories)}] {cat_name} (ID: {cat_id})")
        print('='*80)

        result = scrape_category(cat_id, cat_name)
        results["details"].append(result)

        if result["success"]:
            results["successful"] += 1
            results["total_products"] += result["total_products"]
            print(f"✅ Başarılı: {result['total_products']} ürün")
        else:
            results["failed"] += 1
            print(f"❌ Hata: {result['error']}")

        # Kategoriler arası bekleme
        if i < len(categories):
            time.sleep(delay)

    return results
