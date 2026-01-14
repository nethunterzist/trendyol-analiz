"""
Hidden Champion Finder - Gizli şampiyon bulucu
Özelleştirilmiş filtreler ile fırsat ürünlerini bulur
"""
from typing import Dict, List, Any, Optional
from collections import defaultdict
from .metrics import (
    get_rating_value,
    get_review_count,
    calculate_potential_score
)


class HiddenChampionFinder:
    """
    Gizli şampiyonları bulan sınıf
    Parçalı pazarlarda (düşük HHI) özelleştirilmiş filtreler kullanır
    """
    
    def find(
        self,
        products: List[Dict],
        social_data: Dict,
        filters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Gizli şampiyonları bul (async)
        
        Özelleştirilmiş Filtreler:
        - Rating >= 4.6 (yüksek kalite)
        - Review count < 30 (henüz keşfedilmemiş)
        - Social proof (views/baskets) kategorinin 2 katı üzerinde
        
        Args:
            products: Ürün listesi
            social_data: Sosyal kanıt verileri
            filters: Filtreleme kriterleri
        
        Returns:
            Gizli şampiyon listesi
        """
        if filters is None:
            filters = {
                "min_rating": 4.6,
                "max_review_count": 30,
                "social_multiplier": 2.0,  # Kategori ortalamasının 2 katı
                "min_score": 70,
                "limit": 50
            }
        
        # Kategori bazlı ürün sayıları (competition level için)
        category_counts = defaultdict(int)
        category_products = defaultdict(list)
        
        for p in products:
            category = p.get("category", {}).get("name", "Unknown")
            if isinstance(category, dict):
                category = category.get("name", "Unknown")
            category_counts[category] += 1
            category_products[category].append(p)
        
        # Kategori bazlı ortalama social proof hesapla
        category_avg_social = {}
        social_details = social_data.get("details", {})
        
        for category, cat_products in category_products.items():
            total_views = 0
            total_baskets = 0
            count = 0
            
            for product in cat_products:
                pid = str(product.get("id"))
                if pid in social_details:
                    views = social_details[pid].get("page_views", 0) or 0
                    baskets = social_details[pid].get("baskets", 0) or 0
                    if views > 0:
                        total_views += views
                        total_baskets += baskets
                        count += 1
            
            if count > 0:
                category_avg_social[category] = {
                    "avg_views": total_views / count,
                    "avg_baskets": total_baskets / count
                }
            else:
                category_avg_social[category] = {
                    "avg_views": 0,
                    "avg_baskets": 0
                }
        
        hidden_champions = []
        
        for product in products:
            # Temel veriler
            rating = get_rating_value(product)
            review_count = get_review_count(product)
            pid = str(product.get("id"))
            social = social_details.get(pid, {})
            
            page_views = social.get("page_views", 0) or 0
            orders = social.get("orders", 0) or 0
            baskets = social.get("baskets", 0) or 0
            favorites = social.get("favorites", 0) or 0
            
            conversion_rate = (orders / page_views * 100) if page_views > 0 else 0
            
            # Kategori bilgisi
            category = product.get("category", {})
            if isinstance(category, dict):
                category_name = category.get("name", "Unknown")
            else:
                category_name = category if category else "Unknown"
            
            # Competition level
            category_count = category_counts.get(category_name, 0)
            if category_count < 100:
                competition_level = "low"
            elif category_count < 500:
                competition_level = "medium"
            else:
                competition_level = "high"
            
            # Kategori ortalaması ile karşılaştır
            cat_avg = category_avg_social.get(category_name, {"avg_views": 0, "avg_baskets": 0})
            threshold_views = cat_avg["avg_views"] * filters.get("social_multiplier", 2.0)
            threshold_baskets = cat_avg["avg_baskets"] * filters.get("social_multiplier", 2.0)
            
            # Eğer kategori ortalaması 0 veya çok düşükse, minimum threshold kullan
            min_views_threshold = 100  # Minimum görüntülenme
            min_baskets_threshold = 5  # Minimum sepet
            
            # Threshold'ları ayarla
            if threshold_views < min_views_threshold:
                threshold_views = min_views_threshold
            if threshold_baskets < min_baskets_threshold:
                threshold_baskets = min_baskets_threshold
            
            # Minimum Orders kontrolü (satış verisi çok önemli)
            min_orders = filters.get("min_orders", 1)  # Varsayılan: en az 1 satış
            
            # Özelleştirilmiş Filtreleme (daha esnek)
            passes_filter = (
                rating >= filters.get("min_rating", 4.6) and
                review_count < filters.get("max_review_count", 30) and
                review_count >= 1 and  # En az 1 yorum olmalı
                orders >= min_orders and  # EN AZ 1 SATIŞ OLMALI (satış verisi çok önemli)
                (page_views >= threshold_views or page_views >= min_views_threshold) and  # Kategori ortalamasının üzerinde VEYA minimum threshold
                (baskets >= threshold_baskets or baskets >= min_baskets_threshold) and  # Sepet de kategori ortalamasının üzerinde VEYA minimum
                (conversion_rate >= 1.0 or page_views >= 500)  # Minimum %1 conversion VEYA yüksek görüntülenme
            )
            
            if passes_filter:
                # Potential score hesapla
                potential_score = calculate_potential_score(
                    page_views, orders, review_count, conversion_rate, competition_level
                )
                
                # Hidden champion score hesapla
                hidden_champion_score = self._calculate_hidden_champion_score(
                    rating, potential_score, conversion_rate, competition_level,
                    page_views, threshold_views, baskets, threshold_baskets
                )
                
                # Min score kontrolü
                if hidden_champion_score >= filters.get("min_score", 70):
                    # Trendyol linki oluştur
                    product_url = product.get("url", "")
                    if product_url:
                        # URL relative ise (örn: /kumtel/urun-p-123), başına domain ekle
                        if product_url.startswith("/"):
                            product_url = f"https://www.trendyol.com{product_url}"
                        elif not product_url.startswith("http"):
                            product_url = f"https://www.trendyol.com{product_url}"
                    elif product.get("id"):
                        # Eğer url yoksa, product_id'den oluştur
                        product_url = f"https://www.trendyol.com/urun/{product.get('id')}"
                    else:
                        product_url = ""
                    
                    # Görsel URL'i al (imageUrl veya images array'inden ilk eleman)
                    image_url = product.get("imageUrl", "")
                    if not image_url:
                        # images array'inden ilk elemanı al
                        images = product.get("images", [])
                        if images and len(images) > 0:
                            image_url = images[0] if isinstance(images[0], str) else str(images[0])
                    # Eğer hala boşsa, boş string olarak bırak
                    if not image_url:
                        image_url = ""
                    
                    hidden_champions.append({
                        "product_id": product.get("id"),
                        "name": product.get("name", ""),
                        "brand": product.get("brand", {}).get("name", "Unknown"),
                        "category": category_name,
                        "rating": round(rating, 2),
                        "review_count": review_count,
                        "price": product.get("price", {}).get("sellingPrice", 0),
                        "page_views": page_views,
                        "orders": orders,
                        "baskets": baskets,
                        "favorites": favorites,
                        "conversion_rate": round(conversion_rate, 2),
                        "competition_level": competition_level,
                        "potential_score": potential_score,
                        "hidden_champion_score": hidden_champion_score,
                        "image": image_url,  # Sosyal kanıt sekmesiyle uyumlu olması için "image" kullan
                        "image_url": image_url,  # Geriye dönük uyumluluk için
                        "url": product_url,  # Sosyal kanıt sekmesiyle uyumlu olması için "url" kullan
                        "product_url": product_url,  # Geriye dönük uyumluluk için
                        "social_performance": {
                            "views_vs_category_avg": round((page_views / cat_avg["avg_views"]) if cat_avg["avg_views"] > 0 else 0, 2),
                            "baskets_vs_category_avg": round((baskets / cat_avg["avg_baskets"]) if cat_avg["avg_baskets"] > 0 else 0, 2),
                            "category_avg_views": round(cat_avg["avg_views"], 0),
                            "category_avg_baskets": round(cat_avg["avg_baskets"], 0)
                        }
                    })
        
        # Skora göre sırala
        hidden_champions.sort(key=lambda x: x["hidden_champion_score"], reverse=True)
        
        # Limit
        result = hidden_champions[:filters.get("limit", 50)]
        
        return {
            "total_found": len(hidden_champions),
            "hidden_champions": result,
            "summary": {
                "avg_score": round(sum(hc["hidden_champion_score"] for hc in result) / len(result), 2) if result else 0,
                "avg_rating": round(sum(hc["rating"] for hc in result) / len(result), 2) if result else 0,
                "avg_conversion": round(sum(hc["conversion_rate"] for hc in result) / len(result), 2) if result else 0,
                "low_competition_count": len([hc for hc in result if hc["competition_level"] == "low"]),
                "avg_social_performance": round(
                    sum(hc["social_performance"]["views_vs_category_avg"] for hc in result) / len(result), 2
                ) if result else 0
            },
            "filters_applied": filters
        }
    
    def _calculate_hidden_champion_score(
        self,
        rating: float,
        potential_score: float,
        conversion_rate: float,
        competition_level: str,
        page_views: int,
        threshold_views: float,
        baskets: int,
        threshold_baskets: float
    ) -> float:
        """
        Gizli şampiyon skoru hesapla (özelleştirilmiş)
        
        Formül:
        - Rating skoru: 30 puan (4.6+ = 30, 4.8+ = 35)
        - Potential score: 25 puan
        - Conversion rate: 20 puan
        - Social performance bonus: 15 puan (kategori ortalamasının üzerinde)
        - Competition level: 10 puan
        """
        score = 0
        
        # 1. Rating skoru (30 puan)
        if rating >= 4.8:
            score += 35
        elif rating >= 4.6:
            score += 30
        elif rating >= 4.5:
            score += 25
        elif rating >= 4.0:
            score += 15
        else:
            score += 0
        
        # 2. Potansiyel skoru (25 puan)
        score += (potential_score / 100) * 25
        
        # 3. Conversion rate skoru (20 puan)
        if conversion_rate >= 5:
            score += 20
        elif conversion_rate >= 3:
            score += 15
        elif conversion_rate >= 2:
            score += 10
        else:
            score += 5
        
        # 4. Social performance bonus (15 puan)
        # Kategori ortalamasının ne kadar üzerinde?
        views_multiplier = (page_views / threshold_views) if threshold_views > 0 else 0
        baskets_multiplier = (baskets / threshold_baskets) if threshold_baskets > 0 else 0
        avg_multiplier = (views_multiplier + baskets_multiplier) / 2
        
        if avg_multiplier >= 3.0:
            score += 15  # Kategori ortalamasının 3+ katı
        elif avg_multiplier >= 2.5:
            score += 12
        elif avg_multiplier >= 2.0:
            score += 10
        else:
            score += 5
        
        # 5. Rekabet seviyesi skoru (10 puan)
        if competition_level == "low":
            score += 10
        elif competition_level == "medium":
            score += 7
        else:
            score += 3
        
        return min(100, round(score, 2))

