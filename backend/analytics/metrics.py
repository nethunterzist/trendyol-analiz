"""
Metrics Utilities - Genel metrik hesaplama fonksiyonları
Performance optimized with Counter and NumPy
"""
from typing import List, Dict
from collections import Counter, defaultdict
import numpy as np


def calculate_hhi_index(products: List[Dict]) -> float:
    """
    HHI (Herfindahl-Hirschman Index) hesapla
    Pazar konsantrasyonunu ölçer (0-10000 arası)
    
    PERFORMANCE: Counter kullanarak optimize edildi
    
    Args:
        products: Ürün listesi
    
    Returns:
        HHI Index (0-10000)
    """
    # Counter kullanarak marka sayılarını topla (O(n) complexity)
    brand_names = [
        p.get("brand", {}).get("name", "Unknown")
        for p in products
        if p.get("brand", {}).get("name")
    ]
    
    if not brand_names:
        return 0
    
    # Counter ile hızlı sayım
    brand_counts = Counter(brand_names)
    total = len(products)
    
    if total == 0:
        return 0
    
    # NumPy array ile hızlı hesaplama
    counts_array = np.array(list(brand_counts.values()))
    market_shares = counts_array / total
    hhi = np.sum(market_shares ** 2) * 10000
    
    return round(float(hhi), 2)


def calculate_market_concentration(brand_counts: Dict[str, int]) -> Dict[str, float]:
    """
    Pazar konsantrasyonu hesapla (marka payları)
    
    PERFORMANCE: NumPy ile optimize edildi
    
    Args:
        brand_counts: Marka bazlı ürün sayıları
    
    Returns:
        Marka payları (yüzde)
    """
    if not brand_counts:
        return {}
    
    total = sum(brand_counts.values())
    if total == 0:
        return {}
    
    # NumPy ile hızlı hesaplama
    counts_array = np.array(list(brand_counts.values()))
    shares = (counts_array / total) * 100
    
    return {
        brand: round(float(share), 2)
        for brand, share in zip(brand_counts.keys(), shares)
    }


def calculate_price_premium(category_avg_price: float, overall_avg_price: float) -> float:
    """
    Fiyat primi hesapla
    Kategori ortalamasının genel ortalamaya göre farkı
    
    Args:
        category_avg_price: Kategori ortalama fiyatı
        overall_avg_price: Genel ortalama fiyat
    
    Returns:
        Fiyat primi (yüzde)
    """
    if overall_avg_price == 0:
        return 0
    premium = ((category_avg_price / overall_avg_price) - 1) * 100
    return round(premium, 2)


def calculate_conversion_rates(social_data: Dict) -> Dict[str, float]:
    """
    Conversion rate'leri hesapla
    Görüntülenme → Sepet → Sipariş dönüşüm oranları
    
    Args:
        social_data: Sosyal kanıt verileri
    
    Returns:
        Conversion rate'ler (yüzde)
    """
    details = social_data.get("details", {})
    
    total_views = sum(
        data.get("page_views", 0)
        for data in details.values()
    )
    total_baskets = sum(
        data.get("baskets", 0)
        for data in details.values()
    )
    total_orders = sum(
        data.get("orders", 0)
        for data in details.values()
    )
    
    return {
        "view_to_basket": round((total_baskets / total_views * 100) if total_views > 0 else 0, 2),
        "basket_to_order": round((total_orders / total_baskets * 100) if total_baskets > 0 else 0, 2),
        "view_to_order": round((total_orders / total_views * 100) if total_views > 0 else 0, 2),
        "total_views": total_views,
        "total_baskets": total_baskets,
        "total_orders": total_orders
    }


def calculate_brand_strength(
    brand_products: List[Dict],
    total_products: int,
    social_data: Dict = None
) -> float:
    """
    Marka güç skoru hesapla
    
    Formül: brand_share + (avg_rating * 5) - stockout_rate
    
    Args:
        brand_products: Markaya ait ürünler
        total_products: Toplam ürün sayısı
        social_data: Sosyal kanıt verileri (opsiyonel)
    
    Returns:
        Marka güç skoru
    """
    brand_count = len(brand_products)
    brand_share = (brand_count / total_products * 100) if total_products > 0 else 0
    
    # Rating ortalaması
    ratings = []
    for p in brand_products:
        rating = p.get("rating", 0)
        if isinstance(rating, dict):
            rating = rating.get("averageRating", 0)
        if rating and rating > 0:
            ratings.append(rating)
    
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    
    # Stockout rate
    out_of_stock = sum(1 for p in brand_products if not p.get("inStock", False))
    stockout_rate = (out_of_stock / brand_count * 100) if brand_count > 0 else 0
    
    # Güç skoru
    strength_score = brand_share + (avg_rating * 5) - stockout_rate
    
    return round(strength_score, 2)


def calculate_potential_score(
    page_views: int,
    orders: int,
    review_count: int,
    conversion_rate: float,
    competition_level: str
) -> float:
    """
    Potential score hesapla (0-100)
    Ürünün büyüme potansiyelini ölçer
    
    Args:
        page_views: Görüntülenme sayısı
        orders: Sipariş sayısı
        review_count: Yorum sayısı
        conversion_rate: Dönüşüm oranı (yüzde)
        competition_level: Rekabet seviyesi (low/medium/high)
    
    Returns:
        Potential score (0-100)
    """
    score = 0
    
    # 1. Görüntülenme skoru (30 puan)
    if page_views >= 10000:
        score += 30
    elif page_views >= 5000:
        score += 20
    elif page_views >= 1000:
        score += 10
    
    # 2. Conversion rate skoru (25 puan)
    if conversion_rate >= 5:
        score += 25
    elif conversion_rate >= 3:
        score += 20
    elif conversion_rate >= 2:
        score += 15
    else:
        score += 10
    
    # 3. Rekabet seviyesi skoru (25 puan)
    if competition_level == "low":
        score += 25
    elif competition_level == "medium":
        score += 15
    else:
        score += 5
    
    # 4. Yorum sayısı skoru (20 puan) - Az yorum = henüz keşfedilmemiş
    if 1 <= review_count <= 10:
        score += 20  # Çok az yorum, büyüme potansiyeli
    elif 11 <= review_count <= 20:
        score += 15
    elif 21 <= review_count <= 50:
        score += 10
    else:
        score += 5
    
    return min(100, round(score, 2))


def get_rating_value(product: Dict) -> float:
    """
    Ürün rating'ini al (dict veya number olabilir)
    
    Args:
        product: Ürün dict'i
    
    Returns:
        Rating değeri (0-5)
    """
    rating = product.get("rating", 0)
    if isinstance(rating, dict):
        return rating.get("averageRating", 0) or 0
    return float(rating) if rating else 0


def get_review_count(product: Dict) -> int:
    """
    Ürün yorum sayısını al
    
    Args:
        product: Ürün dict'i
    
    Returns:
        Yorum sayısı
    """
    review_count = product.get("rating_count", 0)
    if not review_count:
        rating = product.get("rating", {})
        if isinstance(rating, dict):
            review_count = rating.get("totalComments", 0) or rating.get("totalCount", 0) or 0
    return int(review_count) if review_count else 0


def calculate_competition_score_from_hhi(hhi: float) -> float:
    """
    HHI Index'ten rekabet skoru hesapla (0-100)
    
    Args:
        hhi: HHI Index değeri
    
    Returns:
        Rekabet skoru (0-100)
    """
    if hhi < 1500:
        # Düşük konsantrasyon (rekabetçi pazar) → YÜKSEK SKOR
        return round(100 - (hhi / 15), 2)
    elif hhi < 2500:
        # Orta konsantrasyon → ORTA SKOR
        return round(70 - ((hhi - 1500) / 10), 2)
    else:
        # Yüksek konsantrasyon (tekelci pazar) → DÜŞÜK SKOR
        return round(max(0, 55 - ((hhi - 2500) / 50)), 2)

