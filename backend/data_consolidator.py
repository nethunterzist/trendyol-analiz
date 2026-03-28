"""
Data Consolidator — tek birleştirilmiş JSON oluşturma modülü.

Scraping + enrichment bittiğinde tüm normalizasyon ve hesaplamayı yapar,
sonucu reports/report_{id}_data.json olarak kaydeder.
Dashboard endpoint sadece bu dosyayı okur.
"""
import json
import os
import re
import time
import random
from collections import defaultdict
from datetime import datetime

import numpy as np

from logging_config import get_logger

log = get_logger("consolidator")

# ─────────────────────────────────────────────────────────
# Ülke kodu → tam isim mapping (menşei analizi için)
# ─────────────────────────────────────────────────────────
COUNTRY_NAMES = {
    "TR": "Türkiye", "CN": "Çin", "US": "Amerika", "GB": "İngiltere",
    "FR": "Fransa", "DE": "Almanya", "IT": "İtalya", "ES": "İspanya",
    "KR": "Güney Kore", "JP": "Japonya", "IN": "Hindistan", "TW": "Tayvan",
    "HK": "Hong Kong", "TH": "Tayland", "VN": "Vietnam", "PL": "Polonya",
    "CZ": "Çek Cumhuriyeti", "RO": "Romanya", "BG": "Bulgaristan",
    "GR": "Yunanistan", "PT": "Portekiz", "NL": "Hollanda", "BE": "Belçika",
    "CH": "İsviçre", "AT": "Avusturya", "SE": "İsveç", "NO": "Norveç",
    "DK": "Danimarka", "FI": "Finlandiya", "RU": "Rusya", "UA": "Ukrayna",
    "AE": "Birleşik Arap Emirlikleri", "SA": "Suudi Arabistan", "IL": "İsrail",
    "EG": "Mısır", "ZA": "Güney Afrika", "BR": "Brezilya", "MX": "Meksika",
    "CA": "Kanada", "AU": "Avustralya", "NZ": "Yeni Zelanda", "SG": "Singapur",
    "MY": "Malezya", "ID": "Endonezya", "PH": "Filipinler", "PK": "Pakistan",
    "BD": "Bangladeş", "AZ": "Azerbaycan",
}

# Barkod prefix → ülke (EAN-13)
BARCODE_COUNTRIES = {
    "TYB": "Trendyol (İç Barkod)", "SGT": "Trendyol Satıcı",
    "KPE": "Trendyol Kampanya", "RTN": "Trendyol İade", "CDM": "Trendyol Özel",
    "00-13": "ABD & Kanada", "190-199": "Rezerve/Özel Kullanım",
    "20-29": "Mağaza İçi Kullanım", "30-37": "Fransa",
    "380": "Bulgaristan", "383": "Slovenya", "370": "Litvanya",
    "372": "Estonya", "373": "Moldova", "375": "Belarus",
    "377": "Ermenistan", "379": "Kazakistan", "385": "Hırvatistan",
    "387": "Bosna Hersek", "400-440": "Almanya", "45-49": "Japonya",
    "50": "İngiltere", "520-521": "Yunanistan", "528": "Lübnan",
    "529": "Kıbrıs", "530": "Arnavutluk", "531": "Makedonya",
    "535": "Malta", "539": "İrlanda", "54": "Belçika & Lüksemburg",
    "560": "Portekiz", "569": "İzlanda", "57": "Danimarka",
    "590": "Polonya", "594": "Romanya", "599": "Macaristan",
    "600-601": "Güney Afrika", "603": "Gana", "608": "Bahreyn",
    "609": "Mauritius", "611": "Fas", "613": "Cezayir",
    "615": "Nijerya", "616": "Kenya", "618": "Fildişi Sahili",
    "619": "Tunus", "621": "Suriye", "622": "Mısır",
    "624": "Libya", "625": "Ürdün", "626": "İran",
    "627": "Kuveyt", "628": "Suudi Arabistan", "629": "BAE",
    "630": "Katar", "631": "Umman", "64": "Finlandiya",
    "690-699": "Çin", "70": "Norveç", "710-719": "Rezerve/Özel Kullanım",
    "729": "İsrail", "73": "İsveç", "740": "Guatemala",
    "741": "El Salvador", "742": "Honduras", "743": "Nikaragua",
    "744": "Kosta Rika", "745": "Panama", "746": "Dominik Cumhuriyeti",
    "750": "Meksika", "754-755": "Kanada", "759": "Venezuela",
    "76": "İsviçre", "770-771": "Kolombiya", "773": "Uruguay",
    "775": "Peru", "777": "Bolivya", "779": "Arjantin",
    "780": "Şili", "784": "Paraguay", "786": "Ekvador",
    "789-790": "Brezilya", "80-83": "İtalya", "84": "İspanya",
    "850": "Küba", "858": "Slovakya", "859": "Çek Cumhuriyeti",
    "860": "Sırbistan", "865": "Moğolistan", "867": "Kuzey Kore",
    "868-869": "Türkiye", "87": "Hollanda", "880": "Güney Kore",
    "884": "Kamboçya", "885": "Tayland", "888": "Singapur",
    "890": "Hindistan", "893": "Vietnam", "896": "Pakistan",
    "899": "Endonezya", "90-91": "Avusturya", "93": "Avustralya",
    "94": "Yeni Zelanda", "955": "Malezya", "958": "Makao",
    "977": "Süreli Yayınlar (ISSN)", "978-979": "Kitaplar (ISBN)",
    "980": "Para İade Kuponları", "981-984": "Kuponlar", "99": "Kuponlar",
}


# ─────────────────────────────────────────────────────────
# Yardımcı fonksiyonlar
# ─────────────────────────────────────────────────────────

def _extract_price(p):
    """Extract selling price from product, handling both old and Search API formats."""
    pr = p.get("price", {})
    if isinstance(pr, (int, float)):
        return pr
    return (pr.get("sellingPrice") or pr.get("discountedPrice")
            or pr.get("current") or pr.get("originalPrice")
            or pr.get("old") or 0)


def _extract_rating(p):
    """Extract average rating from product."""
    rating = p.get("ratingScore") or p.get("rating", 0)
    if isinstance(rating, dict):
        rating = rating.get("averageRating", 0)
    try:
        return float(rating) if rating else 0.0
    except (ValueError, TypeError):
        return 0.0


def _extract_review_count(p):
    """Extract review/comment count from product."""
    review_count = 0
    try:
        review_count = int(p.get("rating_count", 0) or 0)
    except (ValueError, TypeError, AttributeError):
        pass
    if not review_count:
        try:
            rating_obj = p.get("ratingScore") or p.get("rating", {})
            if isinstance(rating_obj, dict):
                review_count = int(
                    rating_obj.get("totalCount", 0)
                    or rating_obj.get("totalComments", 0)
                    or 0
                )
        except (ValueError, TypeError, AttributeError):
            review_count = 0
    return review_count


def _parse_social_value(value_str):
    """Parse social proof value like '642', '1.2k', '10B+' etc."""
    try:
        s = str(value_str).strip()
        if "k" in s.lower():
            return int(float(s.lower().replace("k", "").replace("+", "")) * 1000)
        if "b+" in s.lower():
            return int(float(s.lower().replace("b+", "")) * 1_000_000_000)
        if "m+" in s.lower():
            return int(float(s.lower().replace("m+", "")) * 1_000_000)
        return int(s.replace("+", ""))
    except (ValueError, TypeError):
        return 0


def _detect_barcode_country(prefix_num):
    """Detect country from barcode prefix using BARCODE_COUNTRIES mapping."""
    for key, country in BARCODE_COUNTRIES.items():
        if "-" in key:
            start, end = key.split("-")
            try:
                range_len = len(start)
                prefix_to_check = prefix_num[:range_len] if len(prefix_num) >= range_len else prefix_num
                prefix_int = int(prefix_to_check) if prefix_to_check.isdigit() else -1
                if int(start) <= prefix_int <= int(end):
                    return country
            except ValueError:
                continue
        elif key == prefix_num[:len(key)]:
            return country
    return "Bilinmiyor"


# ─────────────────────────────────────────────────────────
# 1. normalize_product
# ─────────────────────────────────────────────────────────

def normalize_product(raw_product, category_name, social_details):
    """
    Ham ürünü flat yapıya dönüştür.
    Öncelik: inline socialProofs (Top Rankings) > enrichment API (social_details)
    """
    product_id = raw_product.get("contentId") or raw_product.get("id")
    price = _extract_price(raw_product)
    rating = _extract_rating(raw_product)
    review_count = _extract_review_count(raw_product)

    brand = raw_product.get("brand", {})
    brand_name = (brand.get("name") if isinstance(brand, dict) else brand) or "Bilinmeyen"

    # ── Social proof: önce inline socialProofs, sonra enrichment ──
    orders, page_views, baskets, favorites = 0, 0, 0, 0

    # İnline socialProofs (Top Rankings API — ürün dosyasında kayıtlı)
    social_proofs = raw_product.get("socialProofs", [])
    if isinstance(social_proofs, list):
        for proof in social_proofs:
            proof_type = proof.get("type", "")
            parsed = _parse_social_value(proof.get("value", "0"))
            if proof_type == "orderCountL3D":
                orders = parsed
            elif proof_type == "pageViewCount":
                page_views = parsed
            elif proof_type == "basketCount":
                baskets = parsed
            elif proof_type == "favoriteCount":
                favorites = parsed

    # Enrichment API (social.json) — inline yoksa veya 0 ise fallback
    # Key hem str hem int olabilir (dosyadan str, memory'den int)
    sp = {}
    if product_id and social_details:
        sp = (social_details.get(str(product_id))
              or social_details.get(int(product_id) if str(product_id).isdigit() else -1)
              or {})
    if not orders:
        orders = sp.get("orders", 0) or 0
    if not page_views:
        page_views = sp.get("page_views", 0) or 0
    if not baskets:
        baskets = sp.get("baskets", 0) or 0
    if not favorites:
        favorites = sp.get("favorites", 0) or 0

    # ── Image URL ──
    image_url = raw_product.get("imageUrl", "")
    if not image_url:
        images = raw_product.get("images", [])
        image_url = images[0] if isinstance(images, list) and images else ""

    # ── Product URL ──
    product_url = raw_product.get("url", "")
    if not product_url and product_id:
        product_url = f"https://www.trendyol.com/p/{product_id}"

    # ── Barcode ──
    barcode = ""
    winner_variant = raw_product.get("winnerVariant", {})
    if isinstance(winner_variant, dict):
        barcode = winner_variant.get("barcode", "")

    # ── Country (origin) ──
    country_code = ""
    country_name = "Bilinmeyen"
    merchant_listings = raw_product.get("merchantListings", [])
    if merchant_listings:
        custom_values = merchant_listings[0].get("customValues", [])
        for cv in custom_values:
            if cv.get("key") == "origin":
                country_code = cv.get("value", "").upper()
                country_name = COUNTRY_NAMES.get(
                    country_code, f"Diğer ({country_code})" if country_code else "Bilinmeyen"
                )
                break

    return {
        "id": product_id,
        "name": raw_product.get("name", ""),
        "brand": brand_name,
        "category": category_name,
        "category_name": category_name,  # Frontend uyumluluğu (ProductFinderTab, OpportunityTab)
        "price": round(price, 2) if price else 0,
        "rating": round(rating, 2),
        "review_count": review_count,
        "orders": orders,
        "page_views": page_views,
        "baskets": baskets,
        "favorites": favorites,
        "barcode": barcode,
        "country_code": country_code,
        "country": country_name,
        "image_url": image_url or "https://via.placeholder.com/150",
        "url": product_url,
        "in_stock": raw_product.get("inStock", False),
    }


# ─────────────────────────────────────────────────────────
# 2. calculate_kpis
# ─────────────────────────────────────────────────────────

def calculate_kpis(products):
    """KPI hesaplaması (main.py 2182-2262 mantığı)."""
    total_products = len(products)
    prices = [p["price"] for p in products if p["price"] > 0]
    ratings = [p["rating"] for p in products if p["rating"] > 0]

    avg_price = sum(prices) / len(prices) if prices else 0
    median_price = float(np.percentile(prices, 50)) if prices else 0
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0

    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    low_rating_count = sum(1 for r in ratings if r < 3.0)
    low_rating_rate = (low_rating_count / len(ratings) * 100) if ratings else 0

    unique_brands = set(p["brand"] for p in products if p["brand"] and p["brand"] != "Bilinmeyen")
    unique_subcategories = set(p["category"] for p in products if p["category"])

    return {
        "total_products": total_products,
        "total_subcategories": len(unique_subcategories),
        "total_brands": len(unique_brands),
        "avg_price": round(avg_price, 2),
        "median_price": round(median_price, 2),
        "avg_rating": round(avg_rating, 2),
        "low_rating_count": low_rating_count,
        "low_rating_rate": round(low_rating_rate, 2),
        "min_price": round(min_price, 2),
        "max_price": round(max_price, 2),
    }


# ─────────────────────────────────────────────────────────
# 3. calculate_charts
# ─────────────────────────────────────────────────────────

def calculate_charts(products):
    """Grafik verisi hesaplaması (main.py 2264-3248 mantığı)."""
    prices = [p["price"] for p in products if p["price"] > 0]
    total_products = len(products)

    # ── Price distribution ──
    price_ranges = {"0-100": 0, "100-250": 0, "250-500": 0, "500-1000": 0, "1000+": 0}
    for price in prices:
        if price < 100:
            price_ranges["0-100"] += 1
        elif price < 250:
            price_ranges["100-250"] += 1
        elif price < 500:
            price_ranges["250-500"] += 1
        elif price < 1000:
            price_ranges["500-1000"] += 1
        else:
            price_ranges["1000+"] += 1

    # ── Kategori ve marka grupları ──
    categories_data = defaultdict(list)
    brands_data = defaultdict(int)
    for p in products:
        categories_data[p["category"]].append(p)
        brands_data[p["brand"]] += 1

    # ── Top categories (satışa göre sıralı) ──
    top_categories = []
    for cat_name, cat_products in categories_data.items():
        total_orders = sum(p["orders"] for p in cat_products)
        top_categories.append({
            "name": cat_name,
            "count": len(cat_products),
            "total_orders": total_orders,
        })
    top_categories = sorted(top_categories, key=lambda x: x["total_orders"], reverse=True)[:20]

    # ── Top brands ──
    top_brands = sorted(
        [{"name": brand, "count": count} for brand, count in brands_data.items()],
        key=lambda x: x["count"], reverse=True,
    )[:20]

    # ── Rating distribution ──
    rating_distribution = {"0-1": 0, "1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0}
    for p in products:
        r = p["rating"]
        if r < 1:
            rating_distribution["0-1"] += 1
        elif r < 2:
            rating_distribution["1-2"] += 1
        elif r < 3:
            rating_distribution["2-3"] += 1
        elif r < 4:
            rating_distribution["3-4"] += 1
        else:
            rating_distribution["4-5"] += 1

    # ── Brand price boxplot (top 10) ──
    brand_price_stats = []
    for brand_name in [b["name"] for b in top_brands[:10]]:
        bp = [p["price"] for p in products if p["brand"] == brand_name and p["price"] > 0]
        if bp and len(bp) >= 4:
            pcts = np.percentile(bp, [0, 25, 50, 75, 100])
            brand_price_stats.append({
                "brand": brand_name,
                "min": round(float(pcts[0]), 2),
                "q1": round(float(pcts[1]), 2),
                "median": round(float(pcts[2]), 2),
                "q3": round(float(pcts[3]), 2),
                "max": round(float(pcts[4]), 2),
                "count": len(bp),
            })

    # ── Scatter plot (price vs rating) — sample 500 ──
    scatter_data = []
    sample_size = min(500, len(products))
    sampled = random.sample(products, sample_size) if products else []
    for p in sampled:
        if p["price"] > 0 and p["rating"] > 0:
            scatter_data.append({
                "price": p["price"],
                "rating": p["rating"],
                "brand": p["brand"],
                "in_stock": p["in_stock"],
            })

    # ── Brand strength score ──
    brand_strength_scores = []
    for brand_name in [b["name"] for b in top_brands[:10]]:
        bp = [p for p in products if p["brand"] == brand_name]
        brand_count = len(bp)
        brand_share = (brand_count / total_products * 100) if total_products > 0 else 0
        brand_ratings = [p["rating"] for p in bp if p["rating"] > 0]
        brand_avg_rating = sum(brand_ratings) / len(brand_ratings) if brand_ratings else 0
        brand_out_of_stock = sum(1 for p in bp if not p["in_stock"])
        stockout_rate = (brand_out_of_stock / brand_count * 100) if brand_count > 0 else 0
        strength = brand_share + (brand_avg_rating * 5) - stockout_rate
        brand_strength_scores.append({
            "brand": brand_name,
            "share": round(brand_share, 2),
            "avg_rating": round(brand_avg_rating, 2),
            "stockout_rate": round(stockout_rate, 2),
            "strength_score": round(strength, 2),
        })
    brand_strength_scores.sort(key=lambda x: x["strength_score"], reverse=True)

    # ── Heatmap: Brand × Category ──
    top_10_brands = [b["name"] for b in top_brands[:10]]
    top_10_cats = [c["name"] for c in top_categories[:10]]
    heatmap_data = []
    for cat_name in top_10_cats:
        cat_products = categories_data.get(cat_name, [])
        for brand_name in top_10_brands:
            count = sum(1 for p in cat_products if p["brand"] == brand_name)
            if count > 0:
                heatmap_data.append({"brand": brand_name, "category": cat_name, "value": count})

    # ── Category price premium ──
    avg_price = sum(prices) / len(prices) if prices else 0
    category_price_analysis = []
    for cat_name, cat_products in categories_data.items():
        cp = [p["price"] for p in cat_products if p["price"] > 0]
        if cp:
            cat_avg = sum(cp) / len(cp)
            cat_median = float(np.percentile(cp, 50))
            premium = ((cat_avg - avg_price) / avg_price * 100) if avg_price > 0 else 0
            category_price_analysis.append({
                "category": cat_name,
                "avg_price": round(cat_avg, 2),
                "median_price": round(cat_median, 2),
                "price_premium": round(premium, 2),
                "product_count": len(cp),
                "min_price": round(min(cp), 2),
                "max_price": round(max(cp), 2),
            })
    category_price_analysis.sort(key=lambda x: x["price_premium"], reverse=True)
    most_expensive = [c for c in category_price_analysis if c["price_premium"] > 0][:10]
    most_affordable = [c for c in category_price_analysis if c["price_premium"] < 0][-10:]
    most_affordable.reverse()

    # ── Origin analysis ──
    origin_counts = defaultdict(int)
    products_with_origin = 0
    for p in products:
        if p["country_code"]:
            origin_counts[p["country_code"]] += 1
            products_with_origin += 1

    origin_country_data = sorted(
        [
            {
                "country_code": code,
                "country_name": COUNTRY_NAMES.get(code, f"Diğer ({code})"),
                "product_count": count,
                "percentage": round(count / products_with_origin * 100, 2) if products_with_origin else 0,
            }
            for code, count in origin_counts.items()
        ],
        key=lambda x: x["product_count"], reverse=True,
    )

    # ── Barcode analysis ──
    barcode_prefixes = defaultdict(int)
    barcode_countries_detected = defaultdict(int)
    products_with_barcode = 0
    for p in products:
        bc = p.get("barcode", "")
        if bc and len(bc) >= 3:
            products_with_barcode += 1
            prefix = bc[:3]
            barcode_prefixes[prefix] += 1
            detected = _detect_barcode_country(prefix)
            barcode_countries_detected[detected] += 1

    barcode_prefix_data = sorted(
        [
            {
                "prefix": prefix,
                "detected_country": _detect_barcode_country(prefix),
                "product_count": count,
                "percentage": round(count / products_with_barcode * 100, 2) if products_with_barcode else 0,
            }
            for prefix, count in barcode_prefixes.items()
        ],
        key=lambda x: x["product_count"], reverse=True,
    )[:20]

    barcode_country_data = sorted(
        [
            {
                "country_name": country,
                "product_count": count,
                "percentage": round(count / products_with_barcode * 100, 2) if products_with_barcode else 0,
            }
            for country, count in barcode_countries_detected.items()
        ],
        key=lambda x: x["product_count"], reverse=True,
    )

    # ── Merchant analysis ──
    merchants_data = {}
    total_winners = 0
    products_with_merchant = 0
    # We need raw product data for merchant analysis — use the flat products
    # Merchant info is already lost in normalization, so we skip this in consolidator
    # The original code extracted from raw_product.merchantListings
    # For consolidated data, we'll build merchants from the products we have

    # ── Build result ──
    return {
        "price_distribution": price_ranges,
        "top_categories": top_categories,
        "top_brands": top_brands,
        "rating_distribution": rating_distribution,
        "brand_price_boxplot": brand_price_stats,
        "price_rating_scatter": scatter_data,
        "brand_strength": brand_strength_scores,
        "brand_category_heatmap": heatmap_data,
        "category_price_premium": {
            "all_categories": category_price_analysis,
            "most_expensive": most_expensive,
            "most_affordable": most_affordable,
        },
        "origin_analysis": {
            "countries": origin_country_data,
            "top_countries": origin_country_data[:10],
            "total_products_with_origin": products_with_origin,
            "coverage_percentage": round(products_with_origin / total_products * 100, 2) if total_products else 0,
        },
        "barcode_analysis": {
            "prefixes": barcode_prefix_data,
            "countries_from_barcode": barcode_country_data,
            "top_countries_from_barcode": barcode_country_data[:10],
            "total_products_with_barcode": products_with_barcode,
            "coverage_percentage": round(products_with_barcode / total_products * 100, 2) if total_products else 0,
        },
    }


def _calculate_merchant_analysis(raw_products, categories_data):
    """
    Satıcı analizini ham ürün verisinden hesapla (merchantListings alanı gerekli).
    raw_products: ham Trendyol ürün dict listesi, categories_data: {cat_name: [products]}
    """
    merchants_data = {}
    total_winners = 0
    products_with_merchant = 0

    for product in raw_products:
        merchant_listings = product.get("merchantListings", [])
        if not merchant_listings:
            continue
        ml = merchant_listings[0]
        merchant = ml.get("merchant", {})
        merchant_id = merchant.get("id")
        if not merchant_id:
            continue

        products_with_merchant += 1
        if merchant_id not in merchants_data:
            merchant_name = merchant.get("name") or merchant.get("officialName") or f"Satıcı {merchant_id}"
            merchants_data[merchant_id] = {
                "merchant_id": merchant_id,
                "merchant_name": merchant_name,
                "product_count": 0,
                "total_price": 0,
                "winner_count": 0,
            }

        merchants_data[merchant_id]["product_count"] += 1
        price = _extract_price(product)
        if price > 0:
            merchants_data[merchant_id]["total_price"] += price
        if ml.get("isWinner"):
            merchants_data[merchant_id]["winner_count"] += 1
            total_winners += 1

    merchant_list = []
    for mid, data in merchants_data.items():
        avg_price = data["total_price"] / data["product_count"] if data["product_count"] > 0 else 0
        winner_ratio = (data["winner_count"] / data["product_count"] * 100) if data["product_count"] > 0 else 0
        merchant_url = None
        if data["merchant_name"] and not data["merchant_name"].startswith("Satıcı "):
            merchant_url = f"https://www.trendyol.com/magaza/{data['merchant_name'].lower().replace(' ', '-')}-m-{mid}"
        merchant_list.append({
            "merchant_id": mid,
            "merchant_name": data["merchant_name"],
            "merchant_url": merchant_url,
            "product_count": data["product_count"],
            "avg_price": round(avg_price, 2),
            "winner_count": data["winner_count"],
            "winner_ratio": round(winner_ratio, 2),
        })

    merchant_list.sort(key=lambda x: x["product_count"], reverse=True)
    total_products = len(raw_products)
    total_merchants = len(merchants_data)
    winner_percentage = (total_winners / products_with_merchant * 100) if products_with_merchant > 0 else 0

    return {
        "merchants": merchant_list,
        "top_merchants": merchant_list[:20],
        "total_merchants": total_merchants,
        "total_products_with_merchant": products_with_merchant,
        "total_winners": total_winners,
        "winner_percentage": round(winner_percentage, 2),
        "coverage_percentage": round(products_with_merchant / total_products * 100, 2) if total_products else 0,
    }


# ─────────────────────────────────────────────────────────
# 4. calculate_insights
# ─────────────────────────────────────────────────────────

def calculate_insights(products):
    """Low-rating ürünler ve fiyat anomalileri."""
    # ── Low rating products ──
    low_rating = []
    for p in products:
        if 0 < p["rating"] < 3.0:
            low_rating.append({
                "name": p["name"][:50],
                "brand": p["brand"],
                "rating": p["rating"],
                "price": p["price"],
                "in_stock": p["in_stock"],
            })
    low_rating = sorted(low_rating, key=lambda x: x["rating"])[:20]

    # ── Anomalies (IQR) ──
    prices = [p["price"] for p in products if p["price"] > 0]
    anomalies = []
    if len(prices) > 4:
        q1, q3 = np.percentile(prices, [25, 75])
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        for p in products:
            if p["price"] > 0 and (p["price"] < lower or p["price"] > upper):
                anomalies.append({
                    "name": p["name"][:50],
                    "brand": p["brand"],
                    "price": p["price"],
                    "type": "expensive" if p["price"] > upper else "cheap",
                })
        anomalies = sorted(anomalies, key=lambda x: x["price"], reverse=True)[:20]

    return {"low_rating_products": low_rating, "anomalies": anomalies}


# ─────────────────────────────────────────────────────────
# 5. build_consolidated_report  (ana orkestratör)
# ─────────────────────────────────────────────────────────

def build_consolidated_report(report_id, db, reports_dir, social_data=None):
    """
    Rapor verisini yükle → normalize et → hesapla → döndür.

    Args:
        report_id: DB rapor ID
        db: SQLAlchemy session
        reports_dir: reports/ klasör yolu
        social_data: Enrichment social.json verisi (opsiyonel, yoksa dosyadan okunur)
    Returns:
        Konsolide dashboard dict
    """
    from database import Report
    t0 = time.time()

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        return None
    if not report.json_file_path or not os.path.exists(report.json_file_path):
        return None

    # Rapor meta verisini oku
    with open(report.json_file_path, "r", encoding="utf-8") as f:
        report_data = json.load(f)

    # Social proof verisini yükle
    social_details = {}
    if social_data:
        social_details = social_data.get("details", {})
    else:
        social_file = os.path.join(reports_dir, f"enrich_{report_id}", "social.json")
        if os.path.exists(social_file):
            try:
                with open(social_file, "r", encoding="utf-8") as f:
                    soc = json.load(f)
                    social_details = soc.get("details", {})
            except Exception as e:
                log.warning(f"Social proof dosyası okunamadı: {e}")

    # ── Ham ürünleri yükle ve normalize et ──
    normalized_products = []
    raw_products_all = []  # Merchant analizi için ham verileri tut

    for detail in report_data.get("details", []):
        if not detail.get("success") or not detail.get("file_path"):
            continue
        file_path = detail["file_path"]
        if not os.path.exists(file_path):
            continue
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                cat_data = json.load(f)
            raw_products = cat_data.get("products", [])
            cat_name_raw = detail.get("category_name", "")
            cat_name = re.sub(r'\s+\d+$', '', cat_name_raw)

            for raw in raw_products:
                # Set category on raw product for load_report_products compatibility
                if isinstance(raw.get("category"), dict):
                    raw["category"]["name"] = cat_name
                else:
                    raw["category"] = {"id": 0, "name": cat_name}

                norm = normalize_product(raw, cat_name, social_details)
                if norm["price"] and norm["category"]:
                    normalized_products.append(norm)

            raw_products_all.extend(raw_products)
        except (json.JSONDecodeError, OSError, KeyError) as e:
            log.warning(f"Kategori dosyası okunamadı: {file_path}: {e}")
            continue

    if not normalized_products:
        log.warning(f"Rapor {report_id} için ürün bulunamadı")
        return None

    # ── Hesaplamalar ──
    kpis = calculate_kpis(normalized_products)
    charts = calculate_charts(normalized_products)
    insights = calculate_insights(normalized_products)

    # Merchant analysis (ham veri gerekli)
    charts["merchant_analysis"] = _calculate_merchant_analysis(raw_products_all, {})

    elapsed = time.time() - t0
    log.info(f"Rapor {report_id} konsolide edildi: {len(normalized_products)} ürün, {elapsed:.2f}s")

    return {
        "metadata": {
            "report_id": report_id,
            "report_name": report.name,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "total_products": len(normalized_products),
            "total_categories": kpis["total_subcategories"],
            "consolidated_at": datetime.now().isoformat(),
        },
        "report_id": report_id,
        "report_name": report.name,
        "products": normalized_products,
        "all_products": normalized_products,  # Geriye uyumluluk (frontend "all_products" bekliyor)
        "kpis": kpis,
        "charts": charts,
        "insights": insights,
    }


# ─────────────────────────────────────────────────────────
# 6. save / load
# ─────────────────────────────────────────────────────────

def save_consolidated_report(report_id, data, reports_dir):
    """Konsolide veriyi reports/report_{id}_data.json olarak kaydet."""
    path = os.path.join(reports_dir, f"report_{report_id}_data.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    log.info(f"Konsolide rapor kaydedildi: {path}")
    return path


def load_consolidated_report(report_id, reports_dir):
    """Konsolide dosya varsa oku, yoksa None döndür."""
    path = os.path.join(reports_dir, f"report_{report_id}_data.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            log.warning(f"Konsolide dosya okunamadı: {path}: {e}")
    return None
