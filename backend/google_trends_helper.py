#!/usr/bin/env python3
"""
Google Trends Helper Module
Provides Google search trend data for traffic source estimation
"""

from pytrends.request import TrendReq
from typing import Dict, Optional
from datetime import datetime, timedelta
import time
from logging_config import get_logger

log = get_logger("trends")


class GoogleTrendsCache:
    """Simple cache for Google Trends API calls"""

    def __init__(self, cache_hours: int = 6):
        self.cache = {}
        self.cache_hours = cache_hours

    def get(self, key: str) -> Optional[Dict]:
        """Get cached data if not expired"""
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now() - timestamp < timedelta(hours=self.cache_hours):
                return data
        return None

    def set(self, key: str, data: Dict):
        """Store data in cache"""
        self.cache[key] = (data, datetime.now())

    def clear(self):
        """Clear all cache"""
        self.cache = {}


# Global cache instance
trends_cache = GoogleTrendsCache(cache_hours=6)


def fetch_google_trends(product_name: str, retries: int = 3) -> Dict:
    """
    Fetch Google Trends data for a product

    Args:
        product_name: Product name to search
        retries: Number of retry attempts

    Returns:
        Dict with search_volume, trend, status
    """

    # Check cache first
    cache_key = f"trends_{product_name.lower()}"
    cached_data = trends_cache.get(cache_key)
    if cached_data:
        cached_data['from_cache'] = True
        return cached_data

    # Try to fetch from Google Trends
    for attempt in range(retries):
        try:
            # Initialize pytrends
            pytrends = TrendReq(
                hl='tr-TR',  # Turkish
                tz=180,      # GMT+3
                timeout=(10, 30)  # Connection timeout, read timeout
            )

            # Build payload - last 3 months in Turkey
            pytrends.build_payload(
                [product_name],
                timeframe='today 3-m',
                geo='TR'
            )

            # Get interest over time
            interest_df = pytrends.interest_over_time()

            # No data available
            if interest_df.empty or product_name not in interest_df.columns:
                result = {
                    'search_volume': 0,
                    'trend': 'no_data',
                    'recent_avg': 0,
                    'previous_avg': 0,
                    'status': 'no_data',
                    'from_cache': False
                }
                trends_cache.set(cache_key, result)
                return result

            # Calculate total interest score (sum of weekly scores)
            total_interest = int(interest_df[product_name].sum())

            # Trend analysis: last 4 weeks vs previous 4 weeks
            recent_avg = float(interest_df[product_name][-4:].mean())
            previous_avg = float(interest_df[product_name][-8:-4].mean())

            # Determine trend direction
            if previous_avg == 0:
                trend = 'stable'
            elif recent_avg > previous_avg * 1.2:
                trend = 'rising'
            elif recent_avg < previous_avg * 0.8:
                trend = 'falling'
            else:
                trend = 'stable'

            # Prepare timeseries data for chart
            timeseries = []
            if not interest_df.empty:
                # Reset index to get date as a column
                df_reset = interest_df.reset_index()
                for _, row in df_reset.iterrows():
                    timeseries.append({
                        'date': row['date'].strftime('%Y-%m-%d'),
                        'value': int(row[product_name])
                    })

            result = {
                'search_volume': total_interest,
                'trend': trend,
                'recent_avg': round(recent_avg, 2),
                'previous_avg': round(previous_avg, 2),
                'timeseries': timeseries,
                'status': 'success',
                'from_cache': False
            }

            # Cache the result
            trends_cache.set(cache_key, result)

            return result

        except Exception as e:
            error_msg = str(e)
            log.warning(f"Google Trends API Error (attempt {attempt + 1}/{retries}): {error_msg}")

            # Rate limit error - wait longer
            if '429' in error_msg or 'rate' in error_msg.lower():
                wait_time = 5 * (attempt + 1)  # 5, 10, 15 seconds
                log.warning(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue

            # Other errors - retry with exponential backoff
            if attempt < retries - 1:
                wait_time = 2 ** attempt  # 1, 2, 4 seconds
                time.sleep(wait_time)
                continue

            # All retries failed
            result = {
                'search_volume': 0,
                'trend': 'unknown',
                'status': 'error',
                'error': error_msg,
                'from_cache': False
            }
            return result

    # Should not reach here, but just in case
    return {
        'search_volume': 0,
        'trend': 'unknown',
        'status': 'error',
        'error': 'Max retries exceeded',
        'from_cache': False
    }


def estimate_traffic_sources(
    product_name: str,
    instagram_views: int = 0,
    tiktok_views: int = 0,
    twitter_shares: int = 0
) -> Dict:
    """
    Get Google Trends search volume for a product
    NOTE: Only uses Google Trends data, social media parameters are ignored

    Args:
        product_name: Product name for Google Trends lookup
        instagram_views: Ignored (kept for API compatibility)
        tiktok_views: Ignored (kept for API compatibility)
        twitter_shares: Ignored (kept for API compatibility)

    Returns:
        Dict with Google Trends search volume and trend
    """

    # Get Google Trends data
    trends_data = fetch_google_trends(product_name)
    google_score = trends_data['search_volume']

    # No data available
    if google_score == 0 or trends_data['status'] != 'success':
        return {
            'sources': {
                'Google': 0
            },
            'raw_scores': {
                'google': 0,
                'total': 0
            },
            'google_trend': trends_data.get('trend', 'unknown'),
            'method': 'google_trends_only',
            'disclaimer': 'Google Trends verisi bulunamadı',
            'from_cache': trends_data.get('from_cache', False)
        }

    # Only show Google search volume (100%)
    sources = {
        'Google': 100.0
    }

    return {
        'sources': sources,
        'raw_scores': {
            'google': google_score,
            'total': google_score
        },
        'google_trend': trends_data['trend'],
        'recent_avg': trends_data.get('recent_avg', 0),
        'previous_avg': trends_data.get('previous_avg', 0),
        'timeseries': trends_data.get('timeseries', []),
        'method': 'google_trends_only',
        'disclaimer': 'Google Trends arama hacmi verisi',
        'from_cache': trends_data.get('from_cache', False)
    }


# Test function
if __name__ == "__main__":
    # Test with a sample product
    test_product = "Casio Edifice Kol Saati"

    print(f"Testing Google Trends for: {test_product}")
    print("=" * 80)

    # Test fetch_google_trends
    trends_data = fetch_google_trends(test_product)
    print("\n📊 Google Trends Data:")
    print(f"  Search Volume: {trends_data['search_volume']}")
    print(f"  Trend: {trends_data['trend']}")
    print(f"  Status: {trends_data['status']}")
    print(f"  From Cache: {trends_data.get('from_cache', False)}")

    # Test estimate_traffic_sources
    print("\n🎯 Google Trends Analysis:")
    traffic_estimate = estimate_traffic_sources(product_name=test_product)

    print(f"\n  Search Volume: {traffic_estimate['raw_scores']['google']}")
    print(f"  Google Trend: {traffic_estimate['google_trend']}")
    print(f"  Recent Average: {traffic_estimate.get('recent_avg', 'N/A')}")
    print(f"  Previous Average: {traffic_estimate.get('previous_avg', 'N/A')}")
    print(f"  Method: {traffic_estimate['method']}")
    print(f"  From Cache: {traffic_estimate.get('from_cache', False)}")
    print(f"  Disclaimer: {traffic_estimate['disclaimer']}")

    print("\n" + "=" * 80)
    print("✅ Test completed!")
