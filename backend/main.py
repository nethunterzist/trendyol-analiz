"""
FastAPI Backend for Trendyol Admin Panel
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json as json_module
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
from functools import lru_cache
import numpy as np
import random
import requests
import time
import re
from collections import OrderedDict
from threading import Lock
import os

from database import SessionLocal, Category, Snapshot, Report, EnrichmentError, init_db
from google_trends_helper import estimate_traffic_sources, fetch_google_trends

# Initialize database on startup
init_db()

# GS1 Barcode Prefix to Country Mapping (EAN-13 / EAN-8)
# Source: https://www.gs1.org/standards/id-keys/company-prefix
BARCODE_PREFIX_TO_COUNTRY = {
    # Turkey
    "869": "Türkiye",

    # Europe
    "300": "Fransa", "301": "Fransa", "302": "Fransa", "303": "Fransa", "304": "Fransa",
    "305": "Fransa", "306": "Fransa", "307": "Fransa", "308": "Fransa", "309": "Fransa",
    "310": "Fransa", "311": "Fransa", "312": "Fransa", "313": "Fransa", "314": "Fransa",
    "315": "Fransa", "316": "Fransa", "317": "Fransa", "318": "Fransa", "319": "Fransa",
    "320": "Fransa", "321": "Fransa", "322": "Fransa", "323": "Fransa", "324": "Fransa",
    "325": "Fransa", "326": "Fransa", "327": "Fransa", "328": "Fransa", "329": "Fransa",
    "330": "Fransa", "331": "Fransa", "332": "Fransa", "333": "Fransa", "334": "Fransa",
    "335": "Fransa", "336": "Fransa", "337": "Fransa", "338": "Fransa", "339": "Fransa",
    "340": "Fransa", "341": "Fransa", "342": "Fransa", "343": "Fransa", "344": "Fransa",
    "345": "Fransa", "346": "Fransa", "347": "Fransa", "348": "Fransa", "349": "Fransa",
    "350": "Fransa", "351": "Fransa", "352": "Fransa", "353": "Fransa", "354": "Fransa",
    "355": "Fransa", "356": "Fransa", "357": "Fransa", "358": "Fransa", "359": "Fransa",
    "360": "Fransa", "361": "Fransa", "362": "Fransa", "363": "Fransa", "364": "Fransa",
    "365": "Fransa", "366": "Fransa", "367": "Fransa", "368": "Fransa", "369": "Fransa",
    "370": "Fransa", "371": "Fransa", "372": "Fransa", "373": "Fransa", "374": "Fransa",
    "375": "Fransa", "376": "Fransa", "377": "Fransa", "378": "Fransa", "379": "Fransa",
    "380": "Bulgaristan",
    "383": "Slovenya",
    "385": "Hırvatistan",
    "387": "Bosna Hersek",
    "389": "Karadağ",
    "400": "Almanya", "401": "Almanya", "402": "Almanya", "403": "Almanya", "404": "Almanya",
    "405": "Almanya", "406": "Almanya", "407": "Almanya", "408": "Almanya", "409": "Almanya",
    "410": "Almanya", "411": "Almanya", "412": "Almanya", "413": "Almanya", "414": "Almanya",
    "415": "Almanya", "416": "Almanya", "417": "Almanya", "418": "Almanya", "419": "Almanya",
    "420": "Almanya", "421": "Almanya", "422": "Almanya", "423": "Almanya", "424": "Almanya",
    "425": "Almanya", "426": "Almanya", "427": "Almanya", "428": "Almanya", "429": "Almanya",
    "430": "Almanya", "431": "Almanya", "432": "Almanya", "433": "Almanya", "434": "Almanya",
    "435": "Almanya", "436": "Almanya", "437": "Almanya", "438": "Almanya", "439": "Almanya",
    "440": "Almanya",
    "450": "Japonya", "451": "Japonya", "452": "Japonya", "453": "Japonya", "454": "Japonya",
    "455": "Japonya", "456": "Japonya", "457": "Japonya", "458": "Japonya", "459": "Japonya",
    "460": "Rusya", "461": "Rusya", "462": "Rusya", "463": "Rusya", "464": "Rusya",
    "465": "Rusya", "466": "Rusya", "467": "Rusya", "468": "Rusya", "469": "Rusya",
    "470": "Kırgızistan",
    "471": "Tayvan",
    "474": "Estonya",
    "475": "Letonya",
    "476": "Azerbaycan",
    "477": "Litvanya",
    "478": "Özbekistan",
    "479": "Sri Lanka",
    "480": "Filipinler",
    "481": "Belarus",
    "482": "Ukrayna",
    "483": "Türkmenistan",
    "484": "Moldova",
    "485": "Ermenistan",
    "486": "Gürcistan",
    "487": "Kazakistan",
    "488": "Tacikistan",
    "489": "Hong Kong",
    "490": "Japonya", "491": "Japonya", "492": "Japonya", "493": "Japonya", "494": "Japonya",
    "495": "Japonya", "496": "Japonya", "497": "Japonya", "498": "Japonya", "499": "Japonya",

    # Asia Pacific
    "500": "İngiltere", "501": "İngiltere", "502": "İngiltere", "503": "İngiltere", "504": "İngiltere",
    "505": "İngiltere", "506": "İngiltere", "507": "İngiltere", "508": "İngiltere", "509": "İngiltere",
    "520": "Yunanistan", "521": "Yunanistan",
    "528": "Lübnan",
    "529": "Kıbrıs",
    "530": "Arnavutluk",
    "531": "Makedonya",
    "535": "Malta",
    "539": "İrlanda",
    "540": "Belçika", "541": "Belçika", "542": "Belçika", "543": "Belçika", "544": "Belçika",
    "545": "Belçika", "546": "Belçika",
    "560": "Portekiz",
    "569": "İzlanda",
    "570": "Danimarka", "571": "Danimarka", "572": "Danimarka", "573": "Danimarka", "574": "Danimarka",
    "575": "Danimarka", "576": "Danimarka", "577": "Danimarka", "578": "Danimarka", "579": "Danimarka",
    "590": "Polonya",
    "594": "Romanya",
    "599": "Macaristan",
    "600": "Güney Afrika", "601": "Güney Afrika",
    "603": "Gana",
    "604": "Senegal",
    "608": "Bahreyn",
    "609": "Moritanya",
    "611": "Fas",
    "613": "Cezayir",
    "615": "Nijerya",
    "616": "Kenya",
    "618": "Fildişi Sahili",
    "619": "Tunus",
    "620": "Tanzanya",
    "621": "Suriye",
    "622": "Mısır",
    "623": "Brunei",
    "624": "Libya",
    "625": "Ürdün",
    "626": "İran",
    "627": "Kuveyt",
    "628": "Suudi Arabistan",
    "629": "Birleşik Arap Emirlikleri",
    "640": "Finlandiya", "641": "Finlandiya", "642": "Finlandiya", "643": "Finlandiya",
    "644": "Finlandiya", "645": "Finlandiya", "646": "Finlandiya", "647": "Finlandiya",
    "648": "Finlandiya", "649": "Finlandiya",
    "690": "Çin", "691": "Çin", "692": "Çin", "693": "Çin", "694": "Çin",
    "695": "Çin", "696": "Çin", "697": "Çin", "698": "Çin", "699": "Çin",
    "700": "Norveç", "701": "Norveç", "702": "Norveç", "703": "Norveç", "704": "Norveç",
    "705": "Norveç", "706": "Norveç", "707": "Norveç", "708": "Norveç", "709": "Norveç",
    "729": "İsrail",
    "730": "İsveç", "731": "İsveç", "732": "İsveç", "733": "İsveç", "734": "İsveç",
    "735": "İsveç", "736": "İsveç", "737": "İsveç", "738": "İsveç", "739": "İsveç",
    "740": "Guatemala",
    "741": "El Salvador",
    "742": "Honduras",
    "743": "Nikaragua",
    "744": "Kosta Rika",
    "745": "Panama",
    "746": "Dominik Cumhuriyeti",
    "750": "Meksika",
    "754": "Kanada", "755": "Kanada",
    "759": "Venezuela",
    "760": "İsviçre", "761": "İsviçre", "762": "İsviçre", "763": "İsviçre", "764": "İsviçre",
    "765": "İsviçre", "766": "İsviçre", "767": "İsviçre", "768": "İsviçre", "769": "İsviçre",
    "770": "Kolombiya", "771": "Kolombiya",
    "773": "Uruguay",
    "775": "Peru",
    "777": "Bolivya",
    "778": "Arjantin", "779": "Arjantin",
    "780": "Şili",
    "784": "Paraguay",
    "786": "Ekvador",
    "789": "Brezilya", "790": "Brezilya",
    "800": "İtalya", "801": "İtalya", "802": "İtalya", "803": "İtalya", "804": "İtalya",
    "805": "İtalya", "806": "İtalya", "807": "İtalya", "808": "İtalya", "809": "İtalya",
    "810": "İtalya", "811": "İtalya", "812": "İtalya", "813": "İtalya", "814": "İtalya",
    "815": "İtalya", "816": "İtalya", "817": "İtalya", "818": "İtalya", "819": "İtalya",
    "820": "İtalya", "821": "İtalya", "822": "İtalya", "823": "İtalya", "824": "İtalya",
    "825": "İtalya", "826": "İtalya", "827": "İtalya", "828": "İtalya", "829": "İtalya",
    "830": "İtalya", "831": "İtalya", "832": "İtalya", "833": "İtalya", "834": "İtalya",
    "835": "İtalya", "836": "İtalya", "837": "İtalya", "838": "İtalya", "839": "İtalya",
    "840": "İspanya", "841": "İspanya", "842": "İspanya", "843": "İspanya", "844": "İspanya",
    "845": "İspanya", "846": "İspanya", "847": "İspanya", "848": "İspanya", "849": "İspanya",
    "850": "Küba",
    "858": "Slovakya",
    "859": "Çekya",
    "860": "Sırbistan",
    "865": "Moğolistan",
    "867": "Kuzey Kore",
    "868": "Türkiye",
    "870": "Hollanda", "871": "Hollanda", "872": "Hollanda", "873": "Hollanda", "874": "Hollanda",
    "875": "Hollanda", "876": "Hollanda", "877": "Hollanda", "878": "Hollanda", "879": "Hollanda",
    "880": "Güney Kore",
    "884": "Kamboçya",
    "885": "Tayland",
    "888": "Singapur",
    "890": "Hindistan", "891": "Hindistan", "892": "Hindistan", "893": "Hindistan",
    "894": "Hindistan", "895": "Hindistan", "896": "Hindistan", "897": "Hindistan",
    "898": "Hindistan", "899": "Hindistan",
    "900": "Avusturya", "901": "Avusturya", "902": "Avusturya", "903": "Avusturya",
    "904": "Avusturya", "905": "Avusturya", "906": "Avusturya", "907": "Avusturya",
    "908": "Avusturya", "909": "Avusturya",
    "930": "Avustralya", "931": "Avustralya", "932": "Avustralya", "933": "Avustralya",
    "934": "Avustralya", "935": "Avustralya", "936": "Avustralya", "937": "Avustralya",
    "938": "Avustralya", "939": "Avustralya",
    "940": "Yeni Zelanda", "941": "Yeni Zelanda", "942": "Yeni Zelanda", "943": "Yeni Zelanda",
    "944": "Yeni Zelanda", "945": "Yeni Zelanda", "946": "Yeni Zelanda", "947": "Yeni Zelanda",
    "948": "Yeni Zelanda", "949": "Yeni Zelanda",
    "955": "Malezya",
    "958": "Makao",

    # North America
    "000": "ABD/Kanada", "001": "ABD/Kanada", "002": "ABD/Kanada", "003": "ABD/Kanada",
    "004": "ABD/Kanada", "005": "ABD/Kanada", "006": "ABD/Kanada", "007": "ABD/Kanada",
    "008": "ABD/Kanada", "009": "ABD/Kanada", "010": "ABD/Kanada", "011": "ABD/Kanada",
    "012": "ABD/Kanada", "013": "ABD/Kanada", "019": "ABD/Kanada",
    "020": "ABD/Kanada", "021": "ABD/Kanada", "022": "ABD/Kanada", "023": "ABD/Kanada",
    "024": "ABD/Kanada", "025": "ABD/Kanada", "026": "ABD/Kanada", "027": "ABD/Kanada",
    "028": "ABD/Kanada", "029": "ABD/Kanada", "030": "ABD/Kanada", "031": "ABD/Kanada",
    "032": "ABD/Kanada", "033": "ABD/Kanada", "034": "ABD/Kanada", "035": "ABD/Kanada",
    "036": "ABD/Kanada", "037": "ABD/Kanada", "038": "ABD/Kanada", "039": "ABD/Kanada",
    "040": "ABD/Kanada", "041": "ABD/Kanada", "042": "ABD/Kanada", "043": "ABD/Kanada",
    "044": "ABD/Kanada", "045": "ABD/Kanada", "046": "ABD/Kanada", "047": "ABD/Kanada",
    "048": "ABD/Kanada", "049": "ABD/Kanada", "050": "ABD/Kanada", "051": "ABD/Kanada",
    "052": "ABD/Kanada", "053": "ABD/Kanada", "054": "ABD/Kanada", "055": "ABD/Kanada",
    "056": "ABD/Kanada", "057": "ABD/Kanada", "058": "ABD/Kanada", "059": "ABD/Kanada",
    "060": "ABD/Kanada", "061": "ABD/Kanada", "062": "ABD/Kanada", "063": "ABD/Kanada",
    "064": "ABD/Kanada", "065": "ABD/Kanada", "066": "ABD/Kanada", "067": "ABD/Kanada",
    "068": "ABD/Kanada", "069": "ABD/Kanada", "070": "ABD/Kanada", "071": "ABD/Kanada",
    "072": "ABD/Kanada", "073": "ABD/Kanada", "074": "ABD/Kanada", "075": "ABD/Kanada",
    "076": "ABD/Kanada", "077": "ABD/Kanada", "078": "ABD/Kanada", "079": "ABD/Kanada",
    "080": "ABD/Kanada", "081": "ABD/Kanada", "082": "ABD/Kanada", "083": "ABD/Kanada",
    "084": "ABD/Kanada", "085": "ABD/Kanada", "086": "ABD/Kanada", "087": "ABD/Kanada",
    "088": "ABD/Kanada", "089": "ABD/Kanada", "090": "ABD/Kanada", "091": "ABD/Kanada",
    "092": "ABD/Kanada", "093": "ABD/Kanada", "094": "ABD/Kanada", "095": "ABD/Kanada",
    "096": "ABD/Kanada", "097": "ABD/Kanada", "098": "ABD/Kanada", "099": "ABD/Kanada",
    "100": "ABD/Kanada", "101": "ABD/Kanada", "102": "ABD/Kanada", "103": "ABD/Kanada",
    "104": "ABD/Kanada", "105": "ABD/Kanada", "106": "ABD/Kanada", "107": "ABD/Kanada",
    "108": "ABD/Kanada", "109": "ABD/Kanada", "110": "ABD/Kanada", "111": "ABD/Kanada",
    "112": "ABD/Kanada", "113": "ABD/Kanada", "114": "ABD/Kanada", "115": "ABD/Kanada",
    "116": "ABD/Kanada", "117": "ABD/Kanada", "118": "ABD/Kanada", "119": "ABD/Kanada",
    "120": "ABD/Kanada", "121": "ABD/Kanada", "122": "ABD/Kanada", "123": "ABD/Kanada",
    "124": "ABD/Kanada", "125": "ABD/Kanada", "126": "ABD/Kanada", "127": "ABD/Kanada",
    "128": "ABD/Kanada", "129": "ABD/Kanada", "130": "ABD/Kanada", "131": "ABD/Kanada",
    "132": "ABD/Kanada", "133": "ABD/Kanada", "134": "ABD/Kanada", "135": "ABD/Kanada",
    "136": "ABD/Kanada", "137": "ABD/Kanada", "138": "ABD/Kanada", "139": "ABD/Kanada",
}

def get_country_from_barcode(barcode: str) -> str:
    """
    Extract country from barcode prefix (first 3 digits)
    Returns country name or 'Bilinmeyen' if not found
    """
    if not barcode or len(barcode) < 3:
        return "Bilinmeyen"

    prefix = barcode[:3]
    return BARCODE_PREFIX_TO_COUNTRY.get(prefix, "Bilinmeyen")

app = FastAPI(title="Trendyol Admin API", version="1.0.0")

# Base directory for resolving relative paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# File paths - configurable via environment variables for Docker deployment
# Local development: uses relative paths from backend directory
# Docker: uses /data/* directories mounted as volumes
REPORTS_DIR = os.getenv("REPORTS_DIR", os.path.join(BASE_DIR, "..", "reports"))
CATEGORIES_DIR = os.getenv("CATEGORIES_DIR", os.path.join(BASE_DIR, "..", "categories"))
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "trendyol.db"))

# CORS for React admin panel
# Security: Specify exact origins instead of wildcard
# Supports: Local development, Docker Compose, and production deployment
allowed_origins = [
    # Local development (Vite dev server)
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:3000",
    # Docker Compose internal networking
    "http://frontend",
    "http://frontend:80",
    # Docker host access (mapped ports)
    "http://localhost:80",
    "http://localhost:8080",
    "http://127.0.0.1:80",
    "http://127.0.0.1:8080",
    # Production server (Coolify)
    "http://194.187.253.230:3010",
    "http://194.187.253.230",
    # Coolify Traefik proxy (sslip.io)
    "http://trendyol.194.187.253.230.sslip.io",
    "http://trendyol-api.194.187.253.230.sslip.io",
]

# Add production domain from environment variable
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    # Also add https variant if http is provided
    if frontend_url.startswith("http://"):
        allowed_origins.append(frontend_url.replace("http://", "https://"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# HEALTH CHECK ENDPOINT (Docker/Coolify)
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint for Docker HEALTHCHECK and Coolify monitoring.
    Returns service status, database connectivity, and storage availability.
    """
    try:
        # Check database connection
        db_path = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "trendyol.db"))
        db_exists = os.path.exists(db_path)

        # Check data directories
        categories_dir = CATEGORIES_DIR
        reports_dir = os.getenv("REPORTS_DIR", REPORTS_DIR)

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "exists": db_exists,
                "path": db_path
            },
            "storage": {
                "categories": os.path.exists(categories_dir),
                "reports": os.path.exists(reports_dir)
            },
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Health check failed: {str(e)}"
        )


# ============================================================================
# TRENDYOL API HELPER FUNCTIONS
# ============================================================================

TRENDYOL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.trendyol.com/",
    "Connection": "keep-alive"
}

# Bounded cache with TTL to prevent memory leaks
class BoundedCache:
    """Thread-safe cache with size limit and TTL"""
    def __init__(self, maxsize=100, ttl=3600):
        self.cache = OrderedDict()
        self.maxsize = maxsize
        self.ttl = ttl
        self.lock = Lock()
        self.timestamps = {}

    def get(self, key):
        with self.lock:
            if key not in self.cache:
                return None
            # Check TTL
            if time.time() - self.timestamps.get(key, 0) > self.ttl:
                del self.cache[key]
                del self.timestamps[key]
                return None
            # Move to end (LRU)
            self.cache.move_to_end(key)
            return self.cache[key]

    def set(self, key, value):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            self.timestamps[key] = time.time()
            # Evict oldest if over limit
            if len(self.cache) > self.maxsize:
                oldest = next(iter(self.cache))
                del self.cache[oldest]
                del self.timestamps[oldest]

    def __contains__(self, key):
        """Support 'in' operator for cache key checking"""
        with self.lock:
            if key not in self.cache:
                return False
            # Check TTL
            if time.time() - self.timestamps.get(key, 0) > self.ttl:
                del self.cache[key]
                del self.timestamps[key]
                return False
            return True

# Bounded caches for external API aggregations (prevent memory leaks)
reviews_cache = BoundedCache(maxsize=100, ttl=3600)
social_proof_cache = BoundedCache(maxsize=100, ttl=3600)
scraping_progress = BoundedCache(maxsize=50, ttl=7200)
dashboard_cache = BoundedCache(maxsize=50, ttl=3600)
enrichment_progress = BoundedCache(maxsize=50, ttl=7200)

# DISABLED: Questions, similar products, and followers features removed per user request
# questions_cache = {}
# similar_cache = {}
# followers_cache = {}

def _chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

def _safe_int(val):
    try:
        pass
        # Convert abbreviated counts like "10B+" if present
        s = str(val)
        if s.endswith("B+"):
            return int(s[:-2]) * 1_000_000_000
        if s.endswith("M+"):
            return int(s[:-2]) * 1_000_000
        if s.endswith("K+"):
            return int(s[:-2]) * 1_000
        return int(float(s))
    except Exception:
        return 0


# ----------------------------------------------------------------------------
# Path validation helper (security: prevent path traversal)
# ----------------------------------------------------------------------------
import os
from pathlib import Path

# Define safe base directories
BASE_DIR = Path(__file__).parent.parent
SAFE_DIRS = {
    "categories": BASE_DIR / "categories",
    "reports": BASE_DIR / "reports",
    "incoming": BASE_DIR / "incoming"
}

def validate_safe_path(filepath: str, directory_type: str) -> Path:
    """
    Validate that a file path is within allowed directory.
    Prevents path traversal attacks.

    Args:
        filepath: Relative or absolute file path
        directory_type: One of 'categories', 'reports', 'incoming'

    Returns:
        Resolved Path object

    Raises:
        ValueError: If path is outside allowed directory or invalid type
    """
    base_dir = SAFE_DIRS.get(directory_type)
    if not base_dir:
        raise ValueError(f"Invalid directory type: {directory_type}")

    # Convert to Path and resolve
    if os.path.isabs(filepath):
        resolved_path = Path(filepath).resolve()
    else:
        resolved_path = (base_dir / filepath).resolve()

    # Ensure path is within allowed directory
    try:
        resolved_path.relative_to(base_dir)
    except ValueError:
        raise ValueError(f"Path traversal detected: {filepath}")

    return resolved_path


# ----------------------------------------------------------------------------
# Robust HTTP helper: shared session, retries, rate limiting
# ----------------------------------------------------------------------------
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import threading

_retry_strategy = Retry(
    total=5,  # More retries to handle rate limiting
    connect=3,
    read=3,
    backoff_factor=2.0,  # Longer backoff: 2s, 4s, 8s, 16s, 32s
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "OPTIONS"]
)

_http_adapter = HTTPAdapter(max_retries=_retry_strategy, pool_connections=100, pool_maxsize=200)
_session = requests.Session()
_session.headers.update(TRENDYOL_HEADERS)
_session.mount("https://", _http_adapter)
_DEFAULT_TIMEOUT = 30  # Longer timeout to avoid premature failures


class _RateLimiter:
    def __init__(self, rate_per_sec: float):
        self.min_interval = 1.0 / max(rate_per_sec, 0.1)
        self._lock = threading.Lock()
        self._next_time = 0.0

    def wait(self):
        with self._lock:
            now = time.monotonic()
            if self._next_time <= now:
                self._next_time = now + self.min_interval
                return
            sleep_for = self._next_time - now
            self._next_time += self.min_interval
        # small jitter to avoid bursts
        time.sleep(max(0, sleep_for) + random.uniform(0.0, 0.05))


_trendyol_limiter = _RateLimiter(rate_per_sec=5.0)  # 0.2 seconds between requests (Optimized for localhost - 10x faster!)


# Circuit Breaker for Social Proof endpoint
class _CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, reset_timeout: float = 300.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self._failures = 0
        self._opened_at = None
        self._lock = threading.Lock()

    def is_open(self) -> bool:
        """Check if circuit is open (blocking requests)"""
        with self._lock:
            if self._opened_at is None:
                return False
            # Auto-reset after timeout
            if time.monotonic() - self._opened_at > self.reset_timeout:
                self._failures = 0
                self._opened_at = None
                return False
            return True

    def record_failure(self):
        """Record a failure and potentially open the circuit"""
        with self._lock:
            self._failures += 1
            if self._failures >= self.failure_threshold and self._opened_at is None:
                self._opened_at = time.monotonic()

    def record_success(self):
        """Record a success and reset the circuit"""
        with self._lock:
            self._failures = 0
            self._opened_at = None

    def get_status(self) -> dict:
        """Get current circuit status"""
        with self._lock:
            if self._opened_at is None:
                return {"status": "closed", "failures": self._failures}
            time_since_open = time.monotonic() - self._opened_at
            time_until_reset = max(0, self.reset_timeout - time_since_open)
            return {
                "status": "open",
                "failures": self._failures,
                "time_until_reset": round(time_until_reset, 1)
            }


_social_proof_breaker = _CircuitBreaker(failure_threshold=3, reset_timeout=300.0)


def _http_get(url: str, params: dict) -> requests.Response:
    """GET with shared session, retry, timeout, and rate limiting."""
    _trendyol_limiter.wait()
    return _session.get(url, params=params, timeout=_DEFAULT_TIMEOUT)


from typing import Optional as _Optional

def _log_enrichment_error(db: Session, *, report_id: _Optional[int], product_id: _Optional[int], merchant_id: _Optional[int],
                          endpoint: str, error_type: str, message: str, status_code: _Optional[int] = None, attempt: int = 1):
    try:
        db.add(EnrichmentError(
            report_id=report_id,
            product_id=product_id,
            merchant_id=merchant_id,
            endpoint=endpoint,
            error_type=error_type,
            message=message[:400] if message else None,
            status_code=status_code,
            attempt=attempt
        ))
        db.commit()
    except Exception:
        pass
        # Avoid crashing on logging failures
        db.rollback()

def load_report_products(db: Session, report_id: int):
    """Load all product dicts for a report from stored category JSON files."""
    import json, os
    from collections import defaultdict
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.json_file_path or not os.path.exists(report.json_file_path):
        raise HTTPException(status_code=404, detail="Report data file not found")
    try:
        with open(report.json_file_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading report file: {str(e)}")

    all_products = []
    categories_data = defaultdict(list)
    for detail in report_data.get("details", []):
        if detail.get("success") and detail.get("file_path"):
            file_path = detail["file_path"]
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        cat_data = json.load(f)
                        products = cat_data.get("products", [])
                        file_category_name = cat_data.get("category_name", detail.get("category_name", ""))

                        # Add file-level category_name to each product if product's category is empty
                        for product in products:
                            # Check if product has category field
                            product_category = product.get("category", {})
                            if isinstance(product_category, dict):
                                # If category.name is empty or missing, use file-level category_name
                                if not product_category.get("name"):
                                    product["category"] = {
                                        "id": product_category.get("id", 0),
                                        "name": file_category_name
                                    }
                            elif not product_category:
                                # If category field doesn't exist, create it
                                product["category"] = {
                                    "id": 0,
                                    "name": file_category_name
                                }

                        all_products.extend(products)
                        categories_data[detail["category_name"]].extend(products)
                except Exception:
                    continue
    return all_products, categories_data


# Persistent cache helpers
def _ensure_dir(path: str):
    import os
    os.makedirs(path, exist_ok=True)

def _save_json(path: str, data):
    import json
    _ensure_dir(os.path.dirname(path))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _load_json(path: str):
    import json, os
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def fetch_product_reviews(product_id: int, page: int = 0, page_size: int = 5):
    """Ürün yorumlarını çeker"""
    url = "https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed"

    params = {
        "contentId": product_id,
        "page": page,
        "pageSize": page_size,
        "culture": "tr-TR",
        "showReviewWithSizeFeedback": True,
        "channelId": 1
    }

    try:
        resp = _http_get(url, params)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Review API error for product {product_id}: {e}")
    return None


def fetch_social_proof(product_ids: list):
    """Sosyal kanıt verilerini çeker (görüntülenme, sipariş sayıları)"""
    url = "https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/social-proof/"

    params = {
        "contentIds": ",".join(map(str, product_ids)),
        "culture": "tr-TR",
        "channelId": 1
    }

    try:
        resp = _http_get(url, params)
        if resp.status_code == 200:
            data = resp.json()
            # API doğrudan product ID'leri key olarak döndürüyor
            # Convert to list format for easier processing
            result = []
            for product_id_str, product_data in data.items():
                product_id = int(product_id_str)
                social_proofs = product_data.get("socialProofs", [])

                # Parse social proof metrics
                metrics = {"contentId": product_id}
                for proof in social_proofs:
                    proof_id = proof.get("id", "")
                    count_str = proof.get("count", "0")

                    # Convert count string to integer (e.g., "10B+" -> 10000)
                    count = _parse_social_count(count_str)

                    if proof_id == "page-view-count":
                        metrics["pageViewCount"] = count
                    elif proof_id == "order-count":
                        metrics["orderCount"] = count
                    elif proof_id == "basket-count":
                        metrics["basketCount"] = count
                    elif proof_id == "favorite-count":
                        metrics["favoriteCount"] = count

                result.append(metrics)

            return {"result": result} if result else data
    except Exception as e:
        print(f"Social Proof API error: {e}")
    return None


def _parse_social_count(count_str: str) -> int:
    """Parse social proof count string like '10B+', '75,2B' to integer"""
    if not count_str:
        return 0

    try:
        pass
        # Remove '+' and replace ',' with '.'
        clean = count_str.replace('+', '').replace(',', '.')

        # Check if it has 'B' (bin = thousand in Turkish)
        if 'B' in clean or 'b' in clean:
            pass
            # '10B' -> 10000, '75.2B' -> 75200
            num = float(clean.replace('B', '').replace('b', ''))
            return int(num * 1000)

        # Try to parse as float
        return int(float(clean))
    except:
        return 0


def fetch_merchant_questions(product_id: int, page: int = 0, page_size: int = 4):
    """Satıcı sorularını çeker"""
    url = f"https://apigw.trendyol.com/discovery-pdp-websfxmerchantquestions-santral/{product_id}/questions/answered/filter"

    params = {
        "excludeTag": False,
        "page": page,
        "size": page_size,
        "culture": "tr-TR",
        "channelId": 1
    }

    try:
        resp = _http_get(url, params)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Merchant Questions API error for product {product_id}: {e}")
    return None


def fetch_similar_products(product_id: int, page: int = 0, page_size: int = 8):
    """Benzer ürünleri çeker"""
    url = f"https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/reco-products/{product_id}"

    params = {
        "page": page,
        "size": page_size,
        "stampType": "TypeA",
        "isDynamicRendering": False,
        "culture": "tr-TR",
        "recoType": "similar",
        "channelId": 1
    }

    try:
        resp = _http_get(url, params)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Similar Products API error for product {product_id}: {e}")
    return None


def fetch_merchant_followers(merchant_id: int):
    """Satıcı takipçi sayısını çeker"""
    url = f"https://apigw.trendyol.com/discovery-pdp-websfxsellerstorefollow-santral/{merchant_id}/follower-count"

    params = {
        "culture": "tr-TR",
        "channelId": 1
    }

    try:
        resp = _http_get(url, params)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Merchant Followers API error for merchant {merchant_id}: {e}")
    return None


# Pydantic models for API
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    trendyol_category_id: Optional[int] = None
    trendyol_url: Optional[str] = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    trendyol_category_id: Optional[int] = None
    trendyol_url: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    children_count: int = 0

    class Config:
        from_attributes = True


class SnapshotResponse(BaseModel):
    id: int
    category_id: int
    snapshot_month: str
    total_products: int
    avg_price: int
    json_file_path: Optional[str]
    scraped_at: datetime

    class Config:
        from_attributes = True


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Trendyol Admin API",
        "version": "1.0.0",
        "endpoints": {
            "categories": "/categories",
            "category_detail": "/categories/{id}",
            "category_children": "/categories/{id}/children",
            "main_categories": "/categories/main",
            "snapshots": "/snapshots"
        }
    }


# Get all categories
@app.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), skip: int = 0, limit: int = 200):
    """Get all categories with pagination (OPTIMIZED: single query for children counts)"""
    categories = db.query(Category).offset(skip).limit(limit).all()

    # OPTIMIZATION: Get all children counts in a single query using GROUP BY
    children_counts_query = db.query(
        Category.parent_id,
        func.count(Category.id).label('count')
    ).filter(Category.parent_id.isnot(None)).group_by(Category.parent_id).all()

    # Convert to dict for fast lookup
    children_counts = {parent_id: count for parent_id, count in children_counts_query}

    result = []
    for cat in categories:
        # Fast O(1) lookup instead of N database queries
        children_count = children_counts.get(cat.id, 0)

        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "parent_id": cat.parent_id,
            "trendyol_category_id": cat.trendyol_category_id,
            "trendyol_url": cat.trendyol_url,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "children_count": children_count
        }
        result.append(CategoryResponse(**cat_dict))

    return result


# Get main categories (no parent)
@app.get("/categories/main", response_model=List[CategoryResponse])
def get_main_categories(db: Session = Depends(get_db)):
    """Get only main categories (parent_id is NULL) - OPTIMIZED"""
    categories = db.query(Category).filter(Category.parent_id == None).all()

    # OPTIMIZATION: Get all children counts in a single query
    children_counts_query = db.query(
        Category.parent_id,
        func.count(Category.id).label('count')
    ).filter(Category.parent_id.isnot(None)).group_by(Category.parent_id).all()

    children_counts = {parent_id: count for parent_id, count in children_counts_query}

    result = []
    for cat in categories:
        # Fast O(1) lookup
        children_count = children_counts.get(cat.id, 0)

        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "parent_id": cat.parent_id,
            "trendyol_category_id": cat.trendyol_category_id,
            "trendyol_url": cat.trendyol_url,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "children_count": children_count
        }
        result.append(CategoryResponse(**cat_dict))

    return result


# Get category by ID
@app.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category by ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Count children manually
    children_count = db.query(Category).filter(Category.parent_id == category.id).count()

    cat_dict = {
        "id": category.id,
        "name": category.name,
        "parent_id": category.parent_id,
        "trendyol_category_id": category.trendyol_category_id,
        "trendyol_url": category.trendyol_url,
        "is_active": category.is_active,
        "created_at": category.created_at,
        "children_count": children_count
    }

    return CategoryResponse(**cat_dict)


# Get category children (subcategories)
@app.get("/categories/{category_id}/children", response_model=List[CategoryResponse])
def get_category_children(category_id: int, db: Session = Depends(get_db)):
    """Get all subcategories of a category - OPTIMIZED"""
    # Verify parent exists
    parent = db.query(Category).filter(Category.id == category_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent category not found")

    # Get children
    children = db.query(Category).filter(Category.parent_id == category_id).all()

    # OPTIMIZATION: Get all children counts in a single query
    children_counts_query = db.query(
        Category.parent_id,
        func.count(Category.id).label('count')
    ).filter(Category.parent_id.isnot(None)).group_by(Category.parent_id).all()

    children_counts = {parent_id: count for parent_id, count in children_counts_query}

    result = []
    for cat in children:
        # Fast O(1) lookup
        children_count = children_counts.get(cat.id, 0)

        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "parent_id": cat.parent_id,
            "trendyol_category_id": cat.trendyol_category_id,
            "trendyol_url": cat.trendyol_url,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "children_count": children_count
        }
        result.append(CategoryResponse(**cat_dict))

    return result


# Create new category
@app.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category"""
    # Verify parent exists if parent_id provided
    if category.parent_id:
        parent = db.query(Category).filter(Category.id == category.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")

    # Create new category
    db_category = Category(
        name=category.name,
        parent_id=category.parent_id,
        trendyol_category_id=category.trendyol_category_id,
        trendyol_url=category.trendyol_url,
        is_active=category.is_active
    )

    db.add(db_category)
    db.commit()
    db.refresh(db_category)

    cat_dict = {
        "id": db_category.id,
        "name": db_category.name,
        "parent_id": db_category.parent_id,
        "trendyol_category_id": db_category.trendyol_category_id,
        "trendyol_url": db_category.trendyol_url,
        "is_active": db_category.is_active,
        "created_at": db_category.created_at,
        "children_count": 0
    }

    return CategoryResponse(**cat_dict)


# Update category
@app.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category: CategoryUpdate, db: Session = Depends(get_db)):
    """Update an existing category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Update only provided fields
    if category.name is not None:
        db_category.name = category.name
    if category.parent_id is not None:
        if category.parent_id > 0:
            parent = db.query(Category).filter(Category.id == category.parent_id).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent category not found")
        db_category.parent_id = category.parent_id if category.parent_id > 0 else None
    if category.trendyol_category_id is not None:
        db_category.trendyol_category_id = category.trendyol_category_id
    if category.trendyol_url is not None:
        db_category.trendyol_url = category.trendyol_url
    if category.is_active is not None:
        db_category.is_active = category.is_active

    db.commit()
    db.refresh(db_category)

    # Count children manually
    children_count = db.query(Category).filter(Category.parent_id == db_category.id).count()

    cat_dict = {
        "id": db_category.id,
        "name": db_category.name,
        "parent_id": db_category.parent_id,
        "trendyol_category_id": db_category.trendyol_category_id,
        "trendyol_url": db_category.trendyol_url,
        "is_active": db_category.is_active,
        "created_at": db_category.created_at,
        "children_count": children_count
    }

    return CategoryResponse(**cat_dict)


# Delete category
@app.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if category has children
    children_count = db.query(Category).filter(Category.parent_id == db_category.id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category with subcategories. Delete children first."
        )

    db.delete(db_category)
    db.commit()

    return {"message": "Category deleted successfully", "id": category_id}


# Bulk import categories with hierarchy
class BulkCategoryItem(BaseModel):
    name: str
    parent_name: Optional[str] = None
    trendyol_category_id: Optional[int] = None
    trendyol_url: Optional[str] = None

class BulkCategoryImport(BaseModel):
    categories: List[BulkCategoryItem]
    clear_existing: bool = False

@app.post("/categories/bulk-import")
def bulk_import_categories(data: BulkCategoryImport, db: Session = Depends(get_db)):
    """Bulk import categories with hierarchy support.
    Categories are processed in order: parent categories should come before children.
    Uses parent_name to establish parent-child relationships."""

    if data.clear_existing:
        db.query(Category).delete()
        db.commit()

    name_to_id = {}
    created = 0
    errors = []

    for item in data.categories:
        parent_id = None
        if item.parent_name:
            parent_id = name_to_id.get(item.parent_name)
            if parent_id is None:
                # Try to find by name in DB
                parent = db.query(Category).filter(Category.name == item.parent_name).first()
                if parent:
                    parent_id = parent.id
                    name_to_id[item.parent_name] = parent.id
                else:
                    errors.append(f"Parent '{item.parent_name}' not found for '{item.name}'")
                    continue

        db_cat = Category(
            name=item.name,
            parent_id=parent_id,
            trendyol_category_id=item.trendyol_category_id,
            trendyol_url=item.trendyol_url,
            is_active=True
        )
        db.add(db_cat)
        db.flush()
        name_to_id[item.name] = db_cat.id
        created += 1

    db.commit()
    return {
        "message": f"Imported {created} categories",
        "created": created,
        "errors": errors[:20],
        "error_count": len(errors)
    }


# Get all snapshots
@app.get("/snapshots", response_model=List[SnapshotResponse])
def get_snapshots(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    """Get all snapshots with pagination"""
    snapshots = db.query(Snapshot).offset(skip).limit(limit).all()
    return snapshots


# Get snapshots for a category
@app.get("/categories/{category_id}/snapshots", response_model=List[SnapshotResponse])
def get_category_snapshots(category_id: int, db: Session = Depends(get_db)):
    """Get all snapshots for a specific category"""
    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    snapshots = db.query(Snapshot).filter(Snapshot.category_id == category_id).all()
    return snapshots


# Get products for a category from JSON file
@app.get("/categories/{category_id}/products")
def get_category_products(category_id: int, db: Session = Depends(get_db)):
    """Get products from category JSON file"""
    import json
    import os

    # Get category from DB
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Build JSON file path
    trendyol_id = category.trendyol_category_id
    if not trendyol_id:
        raise HTTPException(status_code=400, detail="Category has no Trendyol ID")

    # Search for JSON file in categories folder
    categories_dir = CATEGORIES_DIR
    json_files = [f for f in os.listdir(categories_dir) if f.endswith(f"_{trendyol_id}.json")]

    if not json_files:
        raise HTTPException(status_code=404, detail=f"No JSON file found for category {trendyol_id}")

    json_path = os.path.join(categories_dir, json_files[0])

    # Read JSON file
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return {
            "category_id": category_id,
            "category_name": category.name,
            "trendyol_category_id": trendyol_id,
            "total_products": len(data.get("products", [])),
            "products": data.get("products", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading JSON file: {str(e)}")


# Helper: recursively collect scrapable categories (those with trendyol_category_id)
def collect_scrapable_categories(db: Session, category_ids: list) -> list:
    """
    Given a list of category IDs, collect all categories with valid trendyol_category_id.
    If a category doesn't have trendyol_category_id, recursively check its children.
    Returns list of (trendyol_category_id, name) tuples.
    """
    result = []
    seen = set()

    def _collect(cat_ids):
        if not cat_ids:
            return
        cats = db.query(Category).filter(Category.id.in_(cat_ids)).all()
        for cat in cats:
            if cat.id in seen:
                continue
            seen.add(cat.id)
            if cat.trendyol_category_id:
                result.append((cat.trendyol_category_id, cat.name))
            else:
                # No trendyol_category_id — check children
                children = db.query(Category).filter(Category.parent_id == cat.id).all()
                child_ids = [c.id for c in children]
                _collect(child_ids)

    _collect(category_ids)
    return result


# Scraping endpoint
@app.post("/api/scrape/category/{category_id}")
def scrape_category_data(category_id: int, db: Session = Depends(get_db)):
    """
    Scrape all subcategories of a main category
    """
    from scraper import scrape_multiple_categories

    # Get main category
    main_category = db.query(Category).filter(Category.id == category_id).first()
    if not main_category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Get all subcategories
    sub_categories = db.query(Category).filter(Category.parent_id == category_id).all()

    if not sub_categories:
        raise HTTPException(status_code=404, detail="No subcategories found")

    # Collect scrapable categories (recursively resolve those without trendyol_category_id)
    sub_ids = [sc.id for sc in sub_categories]
    categories_to_scrape = collect_scrapable_categories(db, sub_ids)

    if not categories_to_scrape:
        raise HTTPException(status_code=400, detail="No valid Trendyol IDs found in this category or its subcategories")

    # Start scraping
    results = scrape_multiple_categories(categories_to_scrape, delay=2.0)

    # Create snapshots for successful scrapes
    for detail in results["details"]:
        if detail["success"]:
            pass
            # Find the category in DB
            sub_cat = db.query(Category).filter(
                Category.trendyol_category_id == detail["category_id"]
            ).first()

            if sub_cat:
                pass
                # Create snapshot
                snapshot = Snapshot(
                    category_id=sub_cat.id,
                    snapshot_month=datetime.now().strftime("%Y-%m"),
                    total_products=detail["total_products"],
                    avg_price=0,  # Calculate from products if needed
                    json_file_path=detail["file_path"],
                    scraped_at=datetime.now()
                )
                db.add(snapshot)

    db.commit()

    return {
        "main_category": main_category.name,
        "total_subcategories": len(categories_to_scrape),
        "successful": results["successful"],
        "failed": results["failed"],
        "total_products": results["total_products"],
        "details": results["details"]
    }


# Report Models
class ReportCreate(BaseModel):
    name: str
    category_id: int
    subcategory_ids: Optional[List[int]] = None  # Optional: If provided, create report only for these subcategories


class ReportUpdate(BaseModel):
    name: str  # Only name can be updated


class ReportResponse(BaseModel):
    id: int
    name: str
    category_id: int
    category_name: str
    total_products: int
    total_subcategories: int
    json_file_path: Optional[str]
    html_file_path: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Get all reports
@app.get("/api/reports", response_model=List[ReportResponse])
def get_reports(db: Session = Depends(get_db)):
    """Get all saved reports"""
    from sqlalchemy.orm import joinedload
    reports = db.query(Report).options(joinedload(Report.category)).order_by(Report.created_at.desc()).all()

    result = []
    for report in reports:
        result.append({
            "id": report.id,
            "name": report.name,
            "category_id": report.category_id,
            "category_name": report.category.name if report.category else "Unknown",
            "total_products": report.total_products,
            "total_subcategories": report.total_subcategories,
            "json_file_path": report.json_file_path,
            "html_file_path": report.html_file_path,
            "created_at": report.created_at
        })

    return result


# Get single report
@app.get("/api/reports/create")
async def create_report(
    name: str,
    category_id: int,
    subcategory_ids: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Create a new report with real-time progress streaming (SSE)
    SYNCHRONOUS: Report only saved when 100% complete
    Accepts GET request for EventSource compatibility
    """
    # print(f"🔍 DEBUG - Received request:")
    print(f"  - name: {name}")
    print(f"  - category_id: {category_id}")
    print(f"  - subcategory_ids (raw): {subcategory_ids}")

    # Parse subcategory_ids if provided
    parsed_subcategory_ids = None
    if subcategory_ids:
        try:
            parsed_subcategory_ids = json_module.loads(subcategory_ids)
            print(f"  - subcategory_ids (parsed): {parsed_subcategory_ids}")
        except Exception as e:
            print(f"  - ❌ Error parsing subcategory_ids: {e}")
            parsed_subcategory_ids = None

    # Get main category
    main_category = db.query(Category).filter(Category.id == category_id).first()
    if not main_category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if specific subcategories were requested
    if parsed_subcategory_ids and len(parsed_subcategory_ids) > 0:
        pass
        # Get only the specified subcategories
        sub_categories = db.query(Category).filter(Category.id.in_(parsed_subcategory_ids)).all()

        if len(sub_categories) != len(parsed_subcategory_ids):
            raise HTTPException(status_code=404, detail="One or more subcategories not found")

        # Verify that all subcategories belong to the main category
        for sub_cat in sub_categories:
            if sub_cat.parent_id != category_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Subcategory '{sub_cat.name}' does not belong to the selected main category"
                )
    else:
        pass
        # Get all subcategories
        sub_categories = db.query(Category).filter(Category.parent_id == category_id).all()
        if not sub_categories:
            raise HTTPException(status_code=404, detail="No subcategories found")

    # Collect scrapable categories (recursively resolve those without trendyol_category_id)
    sub_ids = [sc.id for sc in sub_categories]
    categories_to_scrape = collect_scrapable_categories(db, sub_ids)

    if not categories_to_scrape:
        raise HTTPException(status_code=400, detail="No valid Trendyol IDs found in this category or its subcategories")

    # Generate unique task ID
    task_id = str(uuid.uuid4())

    # Stream progress with SSE
    async def progress_stream():
        """Generator that yields real-time progress events"""
        try:
            pass
            # Send initial info
            yield f"data: {json_module.dumps({'type': 'info', 'message': f'📂 {main_category.name} kategorisi seçildi', 'progress': 0})}\n\n"
            await asyncio.sleep(0.1)

            yield f"data: {json_module.dumps({'type': 'info', 'message': f'📊 {len(categories_to_scrape)} alt kategori bulundu', 'progress': 0})}\n\n"
            await asyncio.sleep(0.1)

            yield f"data: {json_module.dumps({'type': 'info', 'message': '🚀 Veri çekimi başlatılıyor...', 'progress': 5})}\n\n"
            await asyncio.sleep(0.5)

            # Start synchronous scraping with progress updates
            from scraper import TrendyolScraper
            import json
            import os
            from datetime import datetime
            import time

            results = {
                "successful": 0,
                "failed": 0,
                "total_products": 0,
                "details": []
            }

            # Scrape each category with real-time updates
            for idx, (cat_id, cat_name) in enumerate(categories_to_scrape, 1):
                progress = int((idx / len(categories_to_scrape)) * 80) + 10

                yield f"data: {json_module.dumps({'type': 'processing', 'message': f'🔍 [{idx}/{len(categories_to_scrape)}] {cat_name} çekiliyor...', 'progress': progress, 'current': idx, 'total': len(categories_to_scrape)})}\n\n"
                await asyncio.sleep(0.1)

                try:
                    pass
                    # API call notification
                    yield f"data: {json_module.dumps({'type': 'api', 'message': f'🌐 API: Trendyol Best Seller - Kategori ID: {cat_id}', 'progress': progress})}\n\n"
                    await asyncio.sleep(0.1)

                    scraper = TrendyolScraper(cat_id)
                    products = scraper.fetch_all_products()

                    if products:
                        pass
                        # Save to file
                        os.makedirs(CATEGORIES_DIR, exist_ok=True)
                        filename = f"{CATEGORIES_DIR}/{cat_name.replace(' ', '_')}_{cat_id}.json"

                        data = {
                            "category_id": cat_id,
                            "category_name": cat_name,
                            "total_products": len(products),
                            "scraped_at": datetime.now().isoformat(),
                            "products": products
                        }

                        with open(filename, 'w', encoding='utf-8') as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)

                        results["successful"] += 1
                        results["total_products"] += len(products)
                        results["details"].append({
                            "category_id": cat_id,
                            "category_name": cat_name,
                            "success": True,
                            "total_products": len(products),
                            "file_path": filename
                        })

                        yield f"data: {json_module.dumps({'type': 'success', 'message': f'✅ {cat_name} tamamlandı - {len(products)} ürün bulundu', 'progress': progress})}\n\n"
                        await asyncio.sleep(0.1)
                    else:
                        results["failed"] += 1
                        results["details"].append({
                            "category_id": cat_id,
                            "category_name": cat_name,
                            "success": False,
                            "total_products": 0,
                            "file_path": None
                        })
                        yield f"data: {json_module.dumps({'type': 'warning', 'message': f'⚠️ {cat_name} - Ürün bulunamadı', 'progress': progress})}\n\n"
                        await asyncio.sleep(0.1)

                except Exception as e:
                    results["failed"] += 1
                    results["details"].append({
                        "category_id": cat_id,
                        "category_name": cat_name,
                        "success": False,
                        "total_products": 0,
                        "file_path": None
                    })
                    yield f"data: {json_module.dumps({'type': 'error', 'message': f'❌ {cat_name} - Hata: {str(e)}', 'progress': progress})}\n\n"
                    await asyncio.sleep(0.1)

                # Rate limiting
                time.sleep(2.0)

            # ============================================
            # Sosyal Kanıt Verilerini Topla
            # ============================================
            # print(f"\n🔍 DEBUG: Sosyal kanıt toplama bölümüne ulaşıldı")
            # print(f"🔍 DEBUG: results['details'] uzunluğu: {len(results.get('details', []))}")

            yield f"data: {json_module.dumps({'type': 'info', 'message': '📊 Sosyal kanıt verileri toplanıyor...', 'progress': 85})}\n\n"
            await asyncio.sleep(0.5)

            # Collect all product IDs from scraped data AND product info
            all_product_ids = []
            product_info_map = {}  # Map product_id to product info (name, image, url, category)
            for detail in results["details"]:
                if detail["success"] and detail["file_path"]:
                    category_name = detail.get("category_name", "Bilinmeyen Kategori")
                    try:
                        with open(detail["file_path"], 'r', encoding='utf-8') as f:
                            cat_data = json.load(f)
                            products = cat_data.get("products", [])
                            # print(f"🔍 DEBUG: {detail['file_path']} dosyasından {len(products)} ürün bulundu")
                            for product in products:
                                product_id = product.get("id")
                                if product_id:
                                    all_product_ids.append(int(product_id))
                                    # Extract rating data
                                    rating_score_obj = product.get("ratingScore", {})
                                    rating = rating_score_obj.get("averageRating", 0) if isinstance(rating_score_obj, dict) else 0
                                    rating_count = rating_score_obj.get("totalCount", 0) if isinstance(rating_score_obj, dict) else 0

                                    # Extract barcode from first variant
                                    barcode = ""
                                    merchant_listings = product.get("merchantListings", [])
                                    if merchant_listings and len(merchant_listings) > 0:
                                        variants = merchant_listings[0].get("variants", [])
                                        if variants and len(variants) > 0:
                                            barcode = variants[0].get("barcode", "")

                                    # Store product info with category, brand, price, rating, and barcode
                                    product_info_map[str(product_id)] = {
                                        "name": product.get("name", ""),
                                        "imageUrl": product.get("imageUrl", ""),
                                        "url": product.get("url", ""),
                                        "category": category_name,
                                        "brand": product.get("brand", {}).get("name", "Bilinmeyen Marka"),
                                        "price": product.get("price", {}).get("sellingPrice", 0),
                                        "rating": round(rating, 2) if rating else 0,
                                        "rating_count": rating_count,
                                        "barcode": barcode,
                                        "barcode_country": get_country_from_barcode(barcode),  # Extract country from barcode prefix
                                        "origin_country": "Bilinmeyen"  # Not available in product data
                                    }
                    except Exception as e:
                        pass
                        # print(f"⚠️ DEBUG: Dosya okuma hatası {detail['file_path']}: {str(e)}")
                        pass

            # Collect social proof data in batches
            social_proof_data = {}
            total_products = len(all_product_ids)
            processed = 0
            batch_size = 5

            # print(f"🔍 DEBUG: Toplam {total_products} ürün ID'si toplandı")
            # print(f"🔍 DEBUG: İlk 5 ürün ID'si: {all_product_ids[:5] if all_product_ids else 'YOK'}")

            if total_products > 0:
                pass
                # print(f"✅ DEBUG: total_products > 0 koşulu sağlandı, sosyal kanıt toplama başlıyor")
                for chunk in _chunked(all_product_ids, batch_size):
                    try:
                        pass
                        # print(f"🔍 DEBUG: {len(chunk)} ürün için sosyal kanıt API'ye istek gönderiliyor: {chunk}")
                        data = fetch_social_proof(chunk)
                        # print(f"🔍 DEBUG: API yanıtı alındı: {type(data)}, 'result' var mı: {'result' in data if data else False}")
                        if data and "result" in data:
                            items = data.get("result", [])
                            # print(f"🔍 DEBUG: {len(items)} adet sonuç bulundu")
                            for item in items:
                                pid = item.get("contentId")
                                if pid:
                                    pid_str = str(pid)
                                    # Get product info from map
                                    product_info = product_info_map.get(pid_str, {})
                                    social_proof_data[pid_str] = {
                                        "page_views": item.get("pageViewCount", 0),
                                        "orders": item.get("orderCount", 0),
                                        "baskets": item.get("basketCount", 0),
                                        "favorites": item.get("favoriteCount", 0),
                                        "name": product_info.get("name", ""),
                                        "imageUrl": product_info.get("imageUrl", ""),
                                        "url": product_info.get("url", ""),
                                        "category": product_info.get("category", "Bilinmeyen Kategori"),
                                        "brand": product_info.get("brand", "Bilinmeyen Marka"),
                                        "price": product_info.get("price", 0),
                                        "rating": product_info.get("rating", 0),
                                        "rating_count": product_info.get("rating_count", 0),
                                        "barcode": product_info.get("barcode", ""),
                                        "origin_country": product_info.get("origin_country", "Bilinmeyen")
                                    }
                    except Exception as e:
                        pass
                        # print(f"❌ DEBUG: Sosyal kanıt API hatası: {str(e)}")
                        pass

                    processed += len(chunk)
                    progress_pct = int((processed / total_products) * 5) + 85  # 85-90%
                    yield f"data: {json_module.dumps({'type': 'info', 'message': f'📊 Sosyal kanıt: {processed}/{total_products} ürün', 'progress': progress_pct})}\n\n"
                    await asyncio.sleep(0.02)
                    time.sleep(0.5)  # Rate limiting

                # print(f"✅ DEBUG: Sosyal kanıt toplama tamamlandı. Toplanan veri: {len(social_proof_data)} ürün")
                yield f"data: {json_module.dumps({'type': 'success', 'message': f'✅ Sosyal kanıt verileri toplandı ({len(social_proof_data)} ürün)', 'progress': 90})}\n\n"
                await asyncio.sleep(0.3)
            else:
                pass
                # print(f"⚠️ DEBUG: total_products = 0, sosyal kanıt toplanmadı")
                pass

            # Generate report file
            yield f"data: {json_module.dumps({'type': 'info', 'message': '📝 Rapor dosyası oluşturuluyor...', 'progress': 92})}\n\n"
            await asyncio.sleep(0.5)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = name.lower().replace(" ", "_").replace("ı", "i").replace("ş", "s").replace("ğ", "g").replace("ü", "u").replace("ö", "o").replace("ç", "c")

            reports_dir = REPORTS_DIR
            os.makedirs(reports_dir, exist_ok=True)

            json_filename = f"{reports_dir}/{safe_name}_{timestamp}.json"
            combined_data = {
                "report_name": name,
                "category": main_category.name,
                "created_at": datetime.now().isoformat(),
                "total_subcategories": len(categories_to_scrape),
                "total_products": results["total_products"],
                "details": results["details"]
            }

            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(combined_data, f, ensure_ascii=False, indent=2)

            # Save to database
            yield f"data: {json_module.dumps({'type': 'info', 'message': '💾 Veritabanına kaydediliyor...', 'progress': 95})}\n\n"
            await asyncio.sleep(0.5)

            new_report = Report(
                name=name,
                category_id=category_id,
                total_products=results["total_products"],
                total_subcategories=len(categories_to_scrape),
                json_file_path=json_filename,
                html_file_path=None,
                created_at=datetime.now()
            )

            db.add(new_report)
            db.commit()
            db.refresh(new_report)

            # Save social proof data to persistent cache
            # print(f"\n🔍 DEBUG: Sosyal kanıt kaydetme bölümü - social_proof_data uzunluğu: {len(social_proof_data)}")
            if social_proof_data:
                enrich_dir = f"{REPORTS_DIR}/enrich_{new_report.id}"
                os.makedirs(enrich_dir, exist_ok=True)
                social_file = f"{enrich_dir}/social.json"

                social_output = {
                    "products": len(all_product_ids),
                    "total": {
                        "page_views": sum(d.get("page_views", 0) for d in social_proof_data.values()),
                        "orders": sum(d.get("orders", 0) for d in social_proof_data.values()),
                        "baskets": sum(d.get("baskets", 0) for d in social_proof_data.values()),
                        "favorites": sum(d.get("favorites", 0) for d in social_proof_data.values())
                    },
                    "missing": total_products - len(social_proof_data),
                    "details": social_proof_data
                }

                # print(f"✅ DEBUG: Sosyal kanıt dosyası kaydediliyor: {social_file}")
                # print(f"🔍 DEBUG: Toplam metrikler: {social_output['total']}")
                with open(social_file, 'w', encoding='utf-8') as f:
                    json.dump(social_output, f, ensure_ascii=False, indent=2)
                # print(f"✅ DEBUG: Sosyal kanıt dosyası başarıyla kaydedildi")
            else:
                pass
                # print(f"⚠️ DEBUG: social_proof_data boş, dosya kaydedilmedi")

            # Final success message with report ID
            yield f"data: {json_module.dumps({'type': 'complete', 'message': '✅ Rapor başarıyla oluşturuldu!', 'progress': 100, 'report_id': new_report.id, 'total_products': results['total_products'], 'successful': results['successful']})}\n\n"
            await asyncio.sleep(0.1)

        except Exception as e:
            yield f"data: {json_module.dumps({'type': 'error', 'message': f'❌ Kritik hata: {str(e)}', 'progress': -1})}\n\n"

    return StreamingResponse(progress_stream(), media_type="text/event-stream")


# Update report

@app.get("/api/reports/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Get a specific report by ID"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    category = db.query(Category).filter(Category.id == report.category_id).first()

    return {
        "id": report.id,
        "name": report.name,
        "category_id": report.category_id,
        "category_name": category.name if category else "Unknown",
        "total_products": report.total_products,
        "total_subcategories": report.total_subcategories,
        "json_file_path": report.json_file_path,
        "html_file_path": report.html_file_path,
        "created_at": report.created_at
    }


# Progress tracking (in-memory)
scraping_progress = {}

# Get scraping progress
@app.get("/api/reports/progress/{task_id}")
def get_scraping_progress(task_id: str):
    """Get real-time scraping progress"""
    if task_id not in scraping_progress:
        raise HTTPException(status_code=404, detail="Task not found")

    return scraping_progress[task_id]

# Background task for scraping
def scrape_in_background(task_id: str, report_name: str, category_id: int, categories_to_scrape: list, category_name: str):
    """Background task that handles scraping with progress updates"""
    from scraper import TrendyolScraper
    import json
    import os
    from datetime import datetime
    import time

    # Initialize progress
    scraping_progress[task_id] = {
        "status": "running",
        "progress": 0,
        "current": 0,
        "total": len(categories_to_scrape),
        "current_category": "",
        "logs": [],
        "successful": 0,
        "failed": 0,
        "total_products": 0
    }

    def add_log(message: str, log_type: str = "info"):
        """Add log to progress"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        scraping_progress[task_id]["logs"].append({
            "timestamp": timestamp,
            "message": message,
            "type": log_type
        })

    add_log(f"📂 {category_name} kategorisi seçildi")
    add_log(f"📊 {len(categories_to_scrape)} alt kategori bulundu")
    add_log("🚀 Veri çekimi başlatılıyor...")

    # Scrape each category
    results = {
        "successful": 0,
        "failed": 0,
        "total_products": 0,
        "details": []
    }

    for idx, (cat_id, cat_name) in enumerate(categories_to_scrape, 1):
        scraping_progress[task_id]["current"] = idx
        scraping_progress[task_id]["current_category"] = cat_name
        scraping_progress[task_id]["progress"] = int((idx / len(categories_to_scrape)) * 80) + 10

        add_log(f"🔍 [{idx}/{len(categories_to_scrape)}] {cat_name} çekiliyor...")

        try:
            scraper = TrendyolScraper(cat_id)
            products = scraper.fetch_all_products()

            if products:
                pass
                # Save to file
                os.makedirs(CATEGORIES_DIR, exist_ok=True)
                filename = f"{CATEGORIES_DIR}/{cat_name.replace(' ', '_')}_{cat_id}.json"

                data = {
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "total_products": len(products),
                    "scraped_at": datetime.now().isoformat(),
                    "products": products
                }

                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                results["successful"] += 1
                results["total_products"] += len(products)
                results["details"].append({
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "success": True,
                    "total_products": len(products),
                    "file_path": filename
                })

                scraping_progress[task_id]["successful"] += 1
                scraping_progress[task_id]["total_products"] += len(products)

                add_log(f"✅ {cat_name} tamamlandı - {len(products)} ürün", "success")
            else:
                results["failed"] += 1
                results["details"].append({
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "success": False,
                    "total_products": 0,
                    "file_path": None
                })
                scraping_progress[task_id]["failed"] += 1
                add_log(f"⚠️  {cat_name} - Ürün bulunamadı", "warning")

        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "category_id": cat_id,
                "category_name": cat_name,
                "success": False,
                "total_products": 0,
                "file_path": None
            })
            scraping_progress[task_id]["failed"] += 1
            add_log(f"❌ {cat_name} - Hata: {str(e)}", "error")

        # Rate limiting
        time.sleep(2.0)

    # Generate report file
    scraping_progress[task_id]["progress"] = 90
    add_log("📝 Rapor dosyası oluşturuluyor...")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = report_name.lower().replace(" ", "_").replace("ı", "i").replace("ş", "s").replace("ğ", "g").replace("ü", "u").replace("ö", "o").replace("ç", "c")

    reports_dir = REPORTS_DIR
    os.makedirs(reports_dir, exist_ok=True)

    json_filename = f"{reports_dir}/{safe_name}_{timestamp}.json"
    combined_data = {
        "report_name": report_name,
        "category": category_name,
        "created_at": datetime.now().isoformat(),
        "total_subcategories": len(categories_to_scrape),
        "total_products": results["total_products"],
        "details": results["details"]
    }

    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(combined_data, f, ensure_ascii=False, indent=2)

    # Save to database
    scraping_progress[task_id]["progress"] = 95
    add_log("💾 Veritabanına kaydediliyor...")

    db = SessionLocal()
    try:
        new_report = Report(
            name=report_name,
            category_id=category_id,
            total_products=results["total_products"],
            total_subcategories=len(categories_to_scrape),
            json_file_path=json_filename,
            html_file_path=None,
            created_at=datetime.now()
        )

        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        # Mark as completed
        scraping_progress[task_id]["status"] = "completed"
        scraping_progress[task_id]["progress"] = 100
        scraping_progress[task_id]["report_id"] = new_report.id
        add_log(f"✅ Rapor başarıyla oluşturuldu!", "success")
        add_log(f"📊 Toplam {results['successful']} kategori, {results['total_products']} ürün", "success")

    except Exception as e:
        scraping_progress[task_id]["status"] = "failed"
        add_log(f"❌ Veritabanı hatası: {str(e)}", "error")
    finally:
        db.close()


# Create report with real-time SSE progress (SYNCHRONOUS)
@app.put("/api/reports/{report_id}")
def update_report(report_id: int, report: ReportUpdate, db: Session = Depends(get_db)):
    """Update report name"""
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")

    db_report.name = report.name
    db.commit()
    db.refresh(db_report)

    return {"message": "Report updated successfully", "id": report_id, "name": report.name}


# Delete report
@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a report"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete files if exist
    import os
    import shutil
    if report.json_file_path and os.path.exists(report.json_file_path):
        os.remove(report.json_file_path)
    if report.html_file_path and os.path.exists(report.html_file_path):
        os.remove(report.html_file_path)

    # Delete enrich directory if exists
    enrich_dir = f"{REPORTS_DIR}/enrich_{report_id}"
    if os.path.exists(enrich_dir):
        shutil.rmtree(enrich_dir)

    db.delete(report)
    db.commit()

    return {"message": "Report deleted successfully", "id": report_id}


# Get dashboard data for a report
# Cache for dashboard data (max 10 reports, 1 hour TTL)
from functools import lru_cache
from datetime import timedelta
import hashlib

dashboard_cache = {}
DASHBOARD_CACHE_TTL = 3600  # 1 hour in seconds

@app.get("/api/reports/{report_id}/dashboard-data")
def get_dashboard_data(report_id: int, db: Session = Depends(get_db)):
    """
    Process report data and return dashboard KPIs and chart data (with caching)
    """
    import json
    import os
    from collections import defaultdict

    # Check cache first
    cache_key = f"dashboard_{report_id}"
    # TEMPORARILY DISABLED FOR DEBUGGING - Re-enable after fixing category sales
    # if cache_key in dashboard_cache:
    #     cached_data, cached_time = dashboard_cache[cache_key]
    #     if time.time() - cached_time < DASHBOARD_CACHE_TTL:
    #         print(f"📊 Cache hit for report {report_id}")
    #         return cached_data
    print(f"📊 Cache bypassed for debugging - recalculating dashboard data for report {report_id}")

    # Get report from database
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Read report JSON file
    if not report.json_file_path or not os.path.exists(report.json_file_path):
        raise HTTPException(status_code=404, detail="Report data file not found")

    try:
        with open(report.json_file_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading report file: {str(e)}")

    # Load all product data from category files
    all_products = []
    categories_data = defaultdict(list)
    brands_data = defaultdict(int)

    for detail in report_data.get("details", []):
        if detail.get("success") and detail.get("file_path"):
            file_path = detail["file_path"]
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        cat_data = json.load(f)
                        products = cat_data.get("products", [])

                        # Enrich products with category name from report details
                        # Clean category name: remove trailing ID pattern (e.g., "Android Cep Telefonu 164461" → "Android Cep Telefonu")
                        cat_name_raw = detail["category_name"]
                        # Remove trailing space + numbers pattern
                        cat_name = re.sub(r'\s+\d+$', '', cat_name_raw)

                        for product in products:
                            # Update category field with actual name
                            if isinstance(product.get("category"), dict):
                                product["category"]["name"] = cat_name
                            else:
                                product["category"] = {"id": 0, "name": cat_name}

                        all_products.extend(products)

                        # Group by category
                        categories_data[cat_name].extend(products)

                        # Count brands
                        for product in products:
                            brand_name = product.get("brand", {}).get("name", "Unknown")
                            brands_data[brand_name] += 1
                except:
                    continue

    # Calculate KPIs
    total_products = len(all_products)
    total_brands = len(brands_data)

    # Price calculations
    prices = [p.get("price", {}).get("sellingPrice", 0) for p in all_products if p.get("price", {}).get("sellingPrice")]
    avg_price = sum(prices) / len(prices) if prices else 0
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0

    # DISABLED: Discount calculations (not needed per user request)
    # discounted_count = sum(1 for p in all_products if p.get("price", {}).get("discountedPrice") and p.get("price", {}).get("discountedPrice") < p.get("price", {}).get("originalPrice", 0))
    # discount_rate = (discounted_count / total_products * 100) if total_products > 0 else 0

    # DISABLED: Stock calculations (not needed per user request)
    # in_stock_count = sum(1 for p in all_products if p.get("inStock", False))
    # out_of_stock_count = total_products - in_stock_count
    # running_out_count = sum(1 for p in all_products if p.get("isRunningOut", False))

    # Rating calculations
    ratings = []
    for p in all_products:
        rating = p.get("rating", 0)
        # Handle if rating is a dict (ratingScore)
        if isinstance(rating, dict):
            rating = rating.get("averageRating", 0)
        if rating:
            ratings.append(rating)
    avg_rating = sum(ratings) / len(ratings) if ratings else 0

    # DISABLED: Flash products and discount calculations (not needed per user request)
    # flash_count = sum(1 for p in all_products if p.get("isFlash", False))

    # Advanced KPIs
    # DISABLED: 1. Discount Depth (average discount percentage for discounted products)
    # discount_depths = []
    # for p in all_products:
    #     original = p.get("price", {}).get("originalPrice", 0)
    #     discounted = p.get("price", {}).get("discountedPrice", 0)
    #     if original > 0 and discounted > 0 and discounted < original:
    #         discount_depths.append((original - discounted) / original * 100)
    # avg_discount_depth = sum(discount_depths) / len(discount_depths) if discount_depths else 0

    # 2. Median Price (for price premium index calculation) - DOĞRU HESAPLAMA
    median_price = float(np.percentile(prices, 50)) if prices else 0

    # DISABLED: 3. Stock Risk Metric (running_out / in_stock ratio) - not needed per user request
    # stock_risk = (running_out_count / in_stock_count * 100) if in_stock_count > 0 else 0

    # 4. Low Rating Products Count (rating < 3.0)
    low_rating_count = sum(1 for r in ratings if r < 3.0)
    low_rating_rate = (low_rating_count / len(ratings) * 100) if ratings else 0

    # KPIs
    kpis = {
        "total_products": total_products,
        "total_subcategories": report.total_subcategories,
        "total_brands": total_brands,
        "avg_price": round(avg_price, 2),
        "median_price": round(median_price, 2),
        # DISABLED: Discount-related KPIs (not needed per user request)
        # "discounted_products": discounted_count,
        # "discount_rate": round(discount_rate, 2),
        # "avg_discount_depth": round(avg_discount_depth, 2),
        # DISABLED: Stock-related KPIs (not needed per user request)
        # "out_of_stock": out_of_stock_count,
        # "in_stock": in_stock_count,
        # "running_out": running_out_count,
        # "stock_risk": round(stock_risk, 2),
        "avg_rating": round(avg_rating, 2),
        "low_rating_count": low_rating_count,
        "low_rating_rate": round(low_rating_rate, 2),
        # DISABLED: Flash products (not needed per user request)
        # "flash_products": flash_count,
        "min_price": round(min_price, 2),
        "max_price": round(max_price, 2)
    }

    # Price distribution (for bar chart)
    price_ranges = {
        "0-100": 0,
        "100-250": 0,
        "250-500": 0,
        "500-1000": 0,
        "1000+": 0
    }
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

    # Top 10 categories by sales (orders from social proof data)
    # First, try to get social proof data to calculate by sales
    category_sales = {}
    try:
        pass
        # Try to get social proof data - check for different batch sizes
        # The social proof cache uses format: {report_id}:b{batch_size}
        # Try common batch sizes: 100, 5 (default), 10, 20
        social_data = None
        for batch_size in [100, 5, 10, 20]:
            social_cache_key = f"{report_id}:b{batch_size}"
            if social_cache_key in social_proof_cache:
                social_data = social_proof_cache.get(social_cache_key)
                if social_data:
                    pass
                    # print(f"[DEBUG] Found social proof cache with batch_size={batch_size}")
                    break

        # If not in cache, try loading from persisted JSON
        if not social_data:
            pass
            # print(f"[DEBUG] No social proof cache found, trying persisted JSON")
            persisted = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/social.json")
            if persisted:
                social_data = {
                    "details": persisted.get("details", {}),
                    "aggregation": {
                        "products": persisted.get("products", 0),
                        "total": persisted.get("total", {}),
                        "missing": persisted.get("missing", 0)
                    }
                }
                # Cache it for future use with batch_size=5 (default)
                social_proof_cache.set(f"{report_id}:b5", social_data)
                # print(f"[DEBUG] Loaded social proof data from JSON with {len(social_data['details'])} products")
            else:
                pass
                # print(f"[DEBUG] No persisted social proof JSON found for report {report_id}")

        if social_data:
            social_details = social_data.get("details", {})
            # print(f"[DEBUG] Found social data with {len(social_details)} products")

            # Calculate sales per category
            for cat_name, cat_products in categories_data.items():
                total_orders = 0
                for product in cat_products:
                    pid = product.get("id")
                    if pid and str(pid) in social_details:
                        product_orders = social_details[str(pid)].get("orders", 0)
                        total_orders += product_orders
                        if product_orders > 0:
                            pass
                            # print(f"[DEBUG] Product {pid} in {cat_name}: {product_orders} orders")

                category_sales[cat_name] = {
                    "name": cat_name,
                    "count": len(cat_products),
                    "total_orders": total_orders
                }
                # print(f"[DEBUG] Category {cat_name}: {total_orders} total orders from {len(cat_products)} products")

            # Sort by total_orders (sales)
            top_categories = sorted(
                category_sales.values(),
                key=lambda x: x["total_orders"],
                reverse=True
            )[:20]
            # print(f"[DEBUG] Top categories sorted by orders: {[(c['name'], c['total_orders']) for c in top_categories[:3]]}")
        else:
            pass
            # Fallback: If no social proof data, sort by product count
            top_categories = sorted(
                [{"name": cat, "count": len(products), "total_orders": 0} for cat, products in categories_data.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:20]
    except Exception as e:
        pass
        # print(f"[DEBUG] Error calculating category sales: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback: If any error, sort by product count
        top_categories = sorted(
            [{"name": cat, "count": len(products), "total_orders": 0} for cat, products in categories_data.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:20]

    # Top 10 brands by product count
    top_brands = sorted(
        [{"name": brand, "count": count} for brand, count in brands_data.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:20]

    # DISABLED: Stock status distribution (for pie chart) - not needed per user request
    # stock_status = {
    #     "in_stock": in_stock_count,
    #     "out_of_stock": out_of_stock_count,
    #     "running_out": running_out_count
    # }

    # Rating distribution
    rating_distribution = {
        "0-1": 0,
        "1-2": 0,
        "2-3": 0,
        "3-4": 0,
        "4-5": 0
    }
    for product in all_products:
        rating = product.get("rating", 0)
        # Handle if rating is a dict (ratingScore)
        if isinstance(rating, dict):
            rating = rating.get("averageRating", 0)

        if rating < 1:
            rating_distribution["0-1"] += 1
        elif rating < 2:
            rating_distribution["1-2"] += 1
        elif rating < 3:
            rating_distribution["2-3"] += 1
        elif rating < 4:
            rating_distribution["3-4"] += 1
        else:
            rating_distribution["4-5"] += 1

    # Boxplot data (brand price statistics) - Top 10 brands
    brand_price_stats = []
    for brand_name in [b["name"] for b in top_brands[:10]]:
        brand_products = [p for p in all_products if p.get("brand", {}).get("name") == brand_name]
        brand_prices = [p.get("price", {}).get("sellingPrice", 0) for p in brand_products if p.get("price", {}).get("sellingPrice")]

        if brand_prices and len(brand_prices) >= 4:  # En az 4 veri noktası gerekli
            # DOĞRU İSTATİSTİK: numpy percentile kullanımı
            percentiles = np.percentile(brand_prices, [0, 25, 50, 75, 100])
            brand_price_stats.append({
                "brand": brand_name,
                "min": round(float(percentiles[0]), 2),
                "q1": round(float(percentiles[1]), 2),
                "median": round(float(percentiles[2]), 2),
                "q3": round(float(percentiles[3]), 2),
                "max": round(float(percentiles[4]), 2),
                "count": len(brand_prices)
            })

    # Scatter plot data (price vs rating) - Sample 500 products for performance
    scatter_data = []
    sample_size = min(500, len(all_products))
    sampled_products = random.sample(all_products, sample_size)

    for p in sampled_products:
        price = p.get("price", {}).get("sellingPrice", 0)
        rating = p.get("rating", 0)
        if isinstance(rating, dict):
            rating = rating.get("averageRating", 0)

        if price > 0 and rating > 0:
            scatter_data.append({
                "price": round(price, 2),
                "rating": round(rating, 2),
                "brand": p.get("brand", {}).get("name", "Unknown"),
                "in_stock": p.get("inStock", False)
            })

    # Low rating products (rating < 3.0) - Top 20
    low_rating_products = []
    for p in all_products:
        rating = p.get("rating", 0)
        if isinstance(rating, dict):
            rating = rating.get("averageRating", 0)

        if rating > 0 and rating < 3.0:
            low_rating_products.append({
                "name": p.get("name", "Unknown")[:50],
                "brand": p.get("brand", {}).get("name", "Unknown"),
                "rating": round(rating, 2),
                "price": round(p.get("price", {}).get("sellingPrice", 0), 2),
                "in_stock": p.get("inStock", False)
            })

    low_rating_products = sorted(low_rating_products, key=lambda x: x["rating"])[:20]

    # Brand strength score (normalized metrics)
    brand_strength_scores = []
    for brand_name in [b["name"] for b in top_brands[:10]]:
        brand_products = [p for p in all_products if p.get("brand", {}).get("name") == brand_name]
        brand_count = len(brand_products)
        brand_share = (brand_count / total_products * 100) if total_products > 0 else 0

        # Brand ratings
        brand_ratings = []
        for p in brand_products:
            rating = p.get("rating", 0)
            if isinstance(rating, dict):
                rating = rating.get("averageRating", 0)
            if rating > 0:
                brand_ratings.append(rating)
        brand_avg_rating = sum(brand_ratings) / len(brand_ratings) if brand_ratings else 0

        # Brand stockout rate
        brand_out_of_stock = sum(1 for p in brand_products if not p.get("inStock", False))
        brand_stockout_rate = (brand_out_of_stock / brand_count * 100) if brand_count > 0 else 0

        # Simple strength score: share + rating - stockout_rate
        strength_score = brand_share + (brand_avg_rating * 5) - brand_stockout_rate

        brand_strength_scores.append({
            "brand": brand_name,
            "share": round(brand_share, 2),
            "avg_rating": round(brand_avg_rating, 2),
            "stockout_rate": round(brand_stockout_rate, 2),
            "strength_score": round(strength_score, 2)
        })

    brand_strength_scores = sorted(brand_strength_scores, key=lambda x: x["strength_score"], reverse=True)

    # Heatmap: Brand × Category Matrix (top 10 brands × top 10 categories)
    # Get top 10 brands by product count
    top_10_brands = [b["name"] for b in top_brands]

    # Get top 10 categories by product count
    top_10_categories = [c["name"] for c in top_categories[:10]]

    # Build matrix: count products for each brand-category combination
    heatmap_data = []
    for cat_name in top_10_categories:
        cat_products = categories_data.get(cat_name, [])
        for brand_name in top_10_brands:
            # Count products for this brand-category pair
            count = sum(1 for p in cat_products
                       if p.get("brand", {}).get("name") == brand_name)

            if count > 0:  # Only include non-zero combinations
                heatmap_data.append({
                    "brand": brand_name,
                    "category": cat_name,
                    "value": count
                })

    # Anomalies (outlier prices using IQR method) - DOĞRU HESAPLAMA
    if len(prices) > 4:
        q1, q3 = np.percentile(prices, [25, 75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        anomalies = []
        for p in all_products:
            price = p.get("price", {}).get("sellingPrice", 0)
            if price > 0 and (price < lower_bound or price > upper_bound):
                anomalies.append({
                    "name": p.get("name", "Unknown")[:50],
                    "brand": p.get("brand", {}).get("name", "Unknown"),
                    "price": round(price, 2),
                    "type": "expensive" if price > upper_bound else "cheap"
                })

        anomalies = sorted(anomalies, key=lambda x: x["price"], reverse=True)[:20]
    else:
        anomalies = []

    # Category-based Price Analysis (Price Premium/Discount relative to overall average)
    category_price_analysis = []
    overall_avg_price = avg_price  # Genel ortalama fiyat

    for cat_name, cat_products in categories_data.items():
        # Her kategorinin ürün fiyatlarını topla
        cat_prices = [p.get("price", {}).get("sellingPrice", 0) for p in cat_products
                     if p.get("price", {}).get("sellingPrice", 0) > 0]

        if cat_prices:
            cat_avg_price = sum(cat_prices) / len(cat_prices)
            cat_median_price = float(np.percentile(cat_prices, 50))

            # Fiyat primi hesaplama: (kategori_ort - genel_ort) / genel_ort * 100
            price_premium = ((cat_avg_price - overall_avg_price) / overall_avg_price * 100) if overall_avg_price > 0 else 0

            category_price_analysis.append({
                "category": cat_name,
                "avg_price": round(cat_avg_price, 2),
                "median_price": round(cat_median_price, 2),
                "price_premium": round(price_premium, 2),
                "product_count": len(cat_prices),
                "min_price": round(min(cat_prices), 2),
                "max_price": round(max(cat_prices), 2)
            })

    # Fiyat primine göre sırala
    category_price_analysis_sorted = sorted(category_price_analysis, key=lambda x: x["price_premium"], reverse=True)

    # En pahalı 10 kategori (pozitif prim)
    most_expensive_categories = [c for c in category_price_analysis_sorted if c["price_premium"] > 0][:10]

    # En ucuz 10 kategori (negatif prim)
    most_affordable_categories = [c for c in category_price_analysis_sorted if c["price_premium"] < 0][-10:]
    most_affordable_categories.reverse()  # En ucuzdan en pahalıya doğru sırala

    # ============================================================================
    # MENŞEİ ÜLKE VE BARKOD ANALİZİ
    # ============================================================================

    # Ülke kodlarını tam isimlere çeviren mapping
    COUNTRY_NAMES = {
        "TR": "Türkiye",
        "CN": "Çin",
        "US": "Amerika",
        "GB": "İngiltere",
        "FR": "Fransa",
        "DE": "Almanya",
        "IT": "İtalya",
        "ES": "İspanya",
        "KR": "Güney Kore",
        "JP": "Japonya",
        "IN": "Hindistan",
        "TW": "Tayvan",
        "HK": "Hong Kong",
        "TH": "Tayland",
        "VN": "Vietnam",
        "PL": "Polonya",
        "CZ": "Çek Cumhuriyeti",
        "RO": "Romanya",
        "BG": "Bulgaristan",
        "GR": "Yunanistan",
        "PT": "Portekiz",
        "NL": "Hollanda",
        "BE": "Belçika",
        "CH": "İsviçre",
        "AT": "Avusturya",
        "SE": "İsveç",
        "NO": "Norveç",
        "DK": "Danimarka",
        "FI": "Finlandiya",
        "RU": "Rusya",
        "UA": "Ukrayna",
        "AE": "Birleşik Arap Emirlikleri",
        "SA": "Suudi Arabistan",
        "IL": "İsrail",
        "EG": "Mısır",
        "ZA": "Güney Afrika",
        "BR": "Brezilya",
        "MX": "Meksika",
        "CA": "Kanada",
        "AU": "Avustralya",
        "NZ": "Yeni Zelanda",
        "SG": "Singapur",
        "MY": "Malezya",
        "ID": "Endonezya",
        "PH": "Filipinler",
        "PK": "Pakistan",
        "BD": "Bangladeş",
        "AZ": "Azerbaycan",
    }

    # Barkod prefix'lerine göre ülke kodu mapping (EAN-13 standardı)
    BARCODE_COUNTRIES = {
        # Trendyol Özel Barkodlar (Harfli)
        "TYB": "Trendyol (İç Barkod)",
        "SGT": "Trendyol Satıcı",
        "KPE": "Trendyol Kampanya",
        "RTN": "Trendyol İade",
        "CDM": "Trendyol Özel",

        # EAN-13 Standart Barkodlar
        "00-13": "ABD & Kanada",
        "190-199": "Rezerve/Özel Kullanım",
        "20-29": "Mağaza İçi Kullanım",
        "30-37": "Fransa",
        "380": "Bulgaristan",
        "383": "Slovenya",
        "370": "Litvanya",
        "372": "Estonya",
        "373": "Moldova",
        "375": "Belarus",
        "377": "Ermenistan",
        "379": "Kazakistan",
        "385": "Hırvatistan",
        "387": "Bosna Hersek",
        "400-440": "Almanya",
        "45-49": "Japonya",
        "50": "İngiltere",
        "520-521": "Yunanistan",
        "528": "Lübnan",
        "529": "Kıbrıs",
        "530": "Arnavutluk",
        "531": "Makedonya",
        "535": "Malta",
        "539": "İrlanda",
        "54": "Belçika & Lüksemburg",
        "560": "Portekiz",
        "569": "İzlanda",
        "57": "Danimarka",
        "590": "Polonya",
        "594": "Romanya",
        "599": "Macaristan",
        "600-601": "Güney Afrika",
        "603": "Gana",
        "608": "Bahreyn",
        "609": "Mauritius",
        "611": "Fas",
        "613": "Cezayir",
        "615": "Nijerya",
        "616": "Kenya",
        "618": "Fildişi Sahili",
        "619": "Tunus",
        "621": "Suriye",
        "622": "Mısır",
        "624": "Libya",
        "625": "Ürdün",
        "626": "İran",
        "627": "Kuveyt",
        "628": "Suudi Arabistan",
        "629": "BAE",
        "630": "Katar",
        "631": "Umman",
        "64": "Finlandiya",
        "690-699": "Çin",
        "70": "Norveç",
        "710-719": "Rezerve/Özel Kullanım",
        "729": "İsrail",
        "73": "İsveç",
        "740": "Guatemala",
        "741": "El Salvador",
        "742": "Honduras",
        "743": "Nikaragua",
        "744": "Kosta Rika",
        "745": "Panama",
        "746": "Dominik Cumhuriyeti",
        "750": "Meksika",
        "754-755": "Kanada",
        "759": "Venezuela",
        "76": "İsviçre",
        "770-771": "Kolombiya",
        "773": "Uruguay",
        "775": "Peru",
        "777": "Bolivya",
        "779": "Arjantin",
        "780": "Şili",
        "784": "Paraguay",
        "786": "Ekvador",
        "789-790": "Brezilya",
        "80-83": "İtalya",
        "84": "İspanya",
        "850": "Küba",
        "858": "Slovakya",
        "859": "Çek Cumhuriyeti",
        "860": "Sırbistan",
        "865": "Moğolistan",
        "867": "Kuzey Kore",
        "868-869": "Türkiye",
        "87": "Hollanda",
        "880": "Güney Kore",
        "884": "Kamboçya",
        "885": "Tayland",
        "888": "Singapur",
        "890": "Hindistan",
        "893": "Vietnam",
        "896": "Pakistan",
        "899": "Endonezya",
        "90-91": "Avusturya",
        "93": "Avustralya",
        "94": "Yeni Zelanda",
        "955": "Malezya",
        "958": "Makao",
        "977": "Süreli Yayınlar (ISSN)",
        "978-979": "Kitaplar (ISBN)",
        "980": "Para İade Kuponları",
        "981-984": "Kuponlar",
        "99": "Kuponlar",
    }

    # Menşei ülke verilerini topla
    origin_countries = []
    barcodes = []
    products_with_origin = 0
    products_with_barcode = 0

    for cat_name, cat_products in categories_data.items():
        for product in cat_products:
            # Menşei ülke bilgisini çıkar
            merchant_listings = product.get("merchantListings", [])
            if merchant_listings and len(merchant_listings) > 0:
                custom_values = merchant_listings[0].get("customValues", [])
                for cv in custom_values:
                    if cv.get("key") == "origin":
                        country_code = cv.get("value", "").upper()
                        if country_code:
                            origin_countries.append(country_code)
                            products_with_origin += 1
                        break

            # Barkod bilgisini çıkar
            if merchant_listings and len(merchant_listings) > 0:
                variants = merchant_listings[0].get("variants", [])
                if variants and len(variants) > 0:
                    barcode = variants[0].get("barcode", "")
                    if barcode:
                        barcodes.append(barcode)
                        products_with_barcode += 1

    # Menşei ülke analizi
    origin_country_counts = {}
    for country_code in origin_countries:
        origin_country_counts[country_code] = origin_country_counts.get(country_code, 0) + 1

    # Ülke kodlarını tam isimlere çevir ve sırala
    origin_country_data = []
    for code, count in origin_country_counts.items():
        country_name = COUNTRY_NAMES.get(code, f"Diğer ({code})")
        percentage = (count / products_with_origin * 100) if products_with_origin > 0 else 0
        origin_country_data.append({
            "country_code": code,
            "country_name": country_name,
            "product_count": count,
            "percentage": round(percentage, 2)
        })

    origin_country_data_sorted = sorted(origin_country_data, key=lambda x: x["product_count"], reverse=True)

    # Barkod prefix analizi (ilk 3 hane)
    barcode_prefixes = {}
    barcode_countries_detected = {}

    for barcode in barcodes:
        if len(barcode) >= 3:
            prefix = barcode[:3]
            barcode_prefixes[prefix] = barcode_prefixes.get(prefix, 0) + 1

            # Prefix'ten ülke tespiti
            detected_country = "Bilinmiyor"
            prefix_num = barcode[:3]

            # Tek prefix kontrolü
            for key, country in BARCODE_COUNTRIES.items():
                if "-" in key:
                    start, end = key.split("-")
                    # Sayısal karşılaştırma yap (aralık uzunluğuna göre prefix'i kırp)
                    try:
                        range_len = len(start)
                        prefix_to_check = prefix_num[:range_len] if len(prefix_num) >= range_len else prefix_num
                        prefix_int = int(prefix_to_check) if prefix_to_check.isdigit() else -1
                        start_int = int(start)
                        end_int = int(end)
                        if prefix_int >= start_int and prefix_int <= end_int:
                            detected_country = country
                            break
                    except ValueError:
                        continue
                elif key == prefix_num[:len(key)]:
                    detected_country = country
                    break

            barcode_countries_detected[detected_country] = barcode_countries_detected.get(detected_country, 0) + 1

    # Barkod prefix'lerini sırala
    barcode_prefix_data = []
    for prefix, count in barcode_prefixes.items():
        percentage = (count / products_with_barcode * 100) if products_with_barcode > 0 else 0

        # Prefix'ten ülke bul
        detected_country = "Bilinmiyor"
        for key, country in BARCODE_COUNTRIES.items():
            if "-" in key:
                start, end = key.split("-")
                # Sayısal karşılaştırma yap (aralık uzunluğuna göre prefix'i kırp)
                try:
                    range_len = len(start)
                    prefix_to_check = prefix[:range_len] if len(prefix) >= range_len else prefix
                    prefix_int = int(prefix_to_check) if prefix_to_check.isdigit() else -1
                    start_int = int(start)
                    end_int = int(end)
                    if prefix_int >= start_int and prefix_int <= end_int:
                        detected_country = country
                        break
                except ValueError:
                    continue
            elif key == prefix[:len(key)]:
                detected_country = country
                break

        barcode_prefix_data.append({
            "prefix": prefix,
            "detected_country": detected_country,
            "product_count": count,
            "percentage": round(percentage, 2)
        })

    barcode_prefix_data_sorted = sorted(barcode_prefix_data, key=lambda x: x["product_count"], reverse=True)[:20]

    # Barkoddan tespit edilen ülkeleri sırala
    barcode_country_data = []
    for country, count in barcode_countries_detected.items():
        percentage = (count / products_with_barcode * 100) if products_with_barcode > 0 else 0
        barcode_country_data.append({
            "country_name": country,
            "product_count": count,
            "percentage": round(percentage, 2)
        })

    barcode_country_data_sorted = sorted(barcode_country_data, key=lambda x: x["product_count"], reverse=True)

    # ============================================================================
    # SATICI ANALİZİ (MERCHANT ANALYSIS)
    # ============================================================================

    merchants_data = {}  # merchant_id -> {total_products, total_price, winner_count}
    total_winners = 0
    products_with_merchant = 0

    for product in all_products:
        merchant_listings = product.get("merchantListings", [])
        if merchant_listings:
            ml = merchant_listings[0]  # İlk satıcı
            merchant = ml.get("merchant", {})
            merchant_id = merchant.get("id")

            if merchant_id:
                products_with_merchant += 1

                # Satıcı verilerini topla
                if merchant_id not in merchants_data:
                    pass
                    # Satıcı ismini al, boşsa officialName'i kullan, o da boşsa ID'yi kullan
                    merchant_name = merchant.get("name") or merchant.get("officialName") or f"Satıcı {merchant_id}"
                    merchants_data[merchant_id] = {
                        "merchant_id": merchant_id,
                        "merchant_name": merchant_name,
                        "product_count": 0,
                        "total_price": 0,
                        "winner_count": 0
                    }

                merchants_data[merchant_id]["product_count"] += 1

                # Fiyat bilgisi
                price = product.get("price", {}).get("sellingPrice", 0)
                if price > 0:
                    merchants_data[merchant_id]["total_price"] += price

                # Kazanan satıcı mı?
                if ml.get("isWinner"):
                    merchants_data[merchant_id]["winner_count"] += 1
                    total_winners += 1

    # Satıcı listesi oluştur
    merchant_list = []
    for merchant_id, data in merchants_data.items():
        avg_price = data["total_price"] / data["product_count"] if data["product_count"] > 0 else 0
        winner_ratio = (data["winner_count"] / data["product_count"] * 100) if data["product_count"] > 0 else 0

        # Satıcı URL'sini oluştur
        merchant_url = f"https://www.trendyol.com/magaza/{data['merchant_name'].lower().replace(' ', '-')}-m-{data['merchant_id']}" if data["merchant_name"] and data["merchant_name"] != f"Satıcı {data['merchant_id']}" else None

        merchant_list.append({
            "merchant_id": data["merchant_id"],
            "merchant_name": data["merchant_name"],
            "merchant_url": merchant_url,
            "product_count": data["product_count"],
            "avg_price": round(avg_price, 2),
            "winner_count": data["winner_count"],
            "winner_ratio": round(winner_ratio, 2)
        })

    # Ürün sayısına göre sırala
    merchant_list_sorted = sorted(merchant_list, key=lambda x: x["product_count"], reverse=True)
    top_merchants = merchant_list_sorted[:20]

    # Genel satıcı istatistikleri
    total_merchants = len(merchants_data)
    winner_percentage = (total_winners / products_with_merchant * 100) if products_with_merchant > 0 else 0

    # ============================================================================
    # STOK MİKTAR ANALİZİ (STOCK QUANTITY ANALYSIS)
    # ============================================================================

    # DISABLED: Stock quantity analysis (not needed per user request)
    # stock_quantities = []
    # category_stocks = {}  # category -> [quantities]
    # products_with_stock_info = 0
    # product_to_category = {}  # product_id -> category_name mapping

    # # Önce ürün-kategori eşleşmesini oluştur
    # for cat_name, cat_products in categories_data.items():
    #     for product in cat_products:
    #         product_id = product.get("id")
    #         if product_id:
    #             product_to_category[product_id] = cat_name

    # for product in all_products:
    #     merchant_listings = product.get("merchantListings", [])
    #     if merchant_listings:
    #         ml = merchant_listings[0]
    #         variants = ml.get("variants", [])
    #         if variants:
    #             quantity = variants[0].get("quantity")
    #             if quantity is not None and quantity > 0:
    #                 stock_quantities.append(quantity)
    #                 products_with_stock_info += 1

    #                 # Kategori bazlı stok - mapping'den al
    #                 product_id = product.get("id")
    #                 cat_name = product_to_category.get(product_id, "Diğer")

    #                 if cat_name not in category_stocks:
    #                     category_stocks[cat_name] = []
    #                 category_stocks[cat_name].append(quantity)

    # # Stok istatistikleri
    # if stock_quantities:
    #     avg_stock = sum(stock_quantities) / len(stock_quantities)
    #     median_stock = float(np.percentile(stock_quantities, 50))
    #     total_stock = sum(stock_quantities)
    #     min_stock = min(stock_quantities)
    #     max_stock = max(stock_quantities)
    # else:
    #     avg_stock = median_stock = total_stock = min_stock = max_stock = 0

    # # Kategori bazlı stok analizi
    # category_stock_analysis = []
    # for cat_name, quantities in category_stocks.items():
    #     cat_avg_stock = sum(quantities) / len(quantities) if quantities else 0
    #     cat_total_stock = sum(quantities)

    #     category_stock_analysis.append({
    #         "category": cat_name,
    #         "avg_stock": round(cat_avg_stock, 2),
    #         "total_stock": cat_total_stock,
    #         "product_count": len(quantities),
    #         "min_stock": min(quantities) if quantities else 0,
    #         "max_stock": max(quantities) if quantities else 0
    #     })

    # # Toplam stoka göre sırala
    # category_stock_sorted = sorted(category_stock_analysis, key=lambda x: x["total_stock"], reverse=True)

    # # Stok dağılımı (binning)
    # stock_distribution = {
    #     "0-100": 0,
    #     "101-500": 0,
    #     "501-1000": 0,
    #     "1001-5000": 0,
    #     "5000+": 0
    # }

    # for qty in stock_quantities:
    #     if qty <= 100:
    #         stock_distribution["0-100"] += 1
    #     elif qty <= 500:
    #         stock_distribution["101-500"] += 1
    #     elif qty <= 1000:
    #         stock_distribution["501-1000"] += 1
    #     elif qty <= 5000:
    #         stock_distribution["1001-5000"] += 1
    #     else:
    #         stock_distribution["5000+"] += 1

    # Basitleştirilmiş ürün listesi (sadece fiyat analizi için)
    # Full products data for Overview tab
    full_products = []

    for product in all_products:
        price = product.get("price", {}).get("sellingPrice")
        category = product.get("categoryName") or product.get("category")
        brand = product.get("brand", {}).get("name") or product.get("brandName") or "Bilinmeyen"

        # Extract category name if it's a dict
        if isinstance(category, dict):
            category_name = category.get("name", "")
        else:
            category_name = category if category else ""

        # Social proof data (orders, views, baskets, favorites, etc.) - socialProofs is an array
        social_proofs = product.get("socialProofs", [])
        orders = 0
        page_views = 0
        baskets = 0
        favorites = 0

        if isinstance(social_proofs, list):
            for proof in social_proofs:
                proof_type = proof.get("type", "")
                value_str = proof.get("value", "0")

                # Parse value (can be string like "208" or "1k")
                try:
                    if "k" in value_str.lower():
                        parsed_value = int(float(value_str.lower().replace("k", "")) * 1000)
                    else:
                        parsed_value = int(value_str)
                except:
                    parsed_value = 0

                # Assign to appropriate field
                if proof_type == "orderCountL3D":
                    orders = parsed_value
                elif proof_type == "pageViewCount":
                    page_views = parsed_value
                elif proof_type == "basketCount":
                    baskets = parsed_value
                elif proof_type == "favoriteCount":
                    favorites = parsed_value

        # Product image and URL
        images = product.get("images", [])
        image_url = images[0] if isinstance(images, list) and len(images) > 0 else ""

        # Trendyol URL
        product_url = product.get("url", "")
        if not product_url:
            content_id = product.get("contentId") or product.get("id")
            if content_id:
                product_url = f"https://www.trendyol.com/p/{content_id}"

        # Extract barcode from winnerVariant
        barcode = ""
        winner_variant = product.get("winnerVariant", {})
        if isinstance(winner_variant, dict):
            barcode = winner_variant.get("barcode", "")

        # Extract country (origin) from merchantListings
        country_code = ""
        country_name = "Bilinmeyen"  # Default value for products without origin data
        merchant_listings_temp = product.get("merchantListings", [])
        if merchant_listings_temp and len(merchant_listings_temp) > 0:
            custom_values = merchant_listings_temp[0].get("customValues", [])
            for cv in custom_values:
                if cv.get("key") == "origin":
                    country_code = cv.get("value", "").upper()
                    country_name = COUNTRY_NAMES.get(country_code, f"Diğer ({country_code})" if country_code else "Bilinmeyen")
                    break

        # Extract review count
        review_count = 0
        try:
            review_count = int(product.get("rating_count", 0) or 0)
        except:
            try:
                rating_obj = product.get("rating", {})
                if isinstance(rating_obj, dict):
                    review_count = int(rating_obj.get("totalComments", 0) or rating_obj.get("totalCount", 0) or 0)
            except:
                review_count = 0

        # Extract rating score
        rating_score = 0.0
        try:
            rating_obj = product.get("rating", {})
            if isinstance(rating_obj, dict):
                rating_score = float(rating_obj.get("averageRating", 0) or rating_obj.get("score", 0) or 0)
        except:
            rating_score = 0.0

        if price and category_name:
            full_products.append({
                "id": product.get("contentId") or product.get("id"),
                "name": product.get("name", ""),
                "brand": brand,
                "price": price,
                "category_name": category_name,
                "orders": orders,
                "page_views": page_views,
                "baskets": baskets,  # Basket/cart additions
                "favorites": favorites,  # Wishlist/favorites count
                "review_count": review_count,  # Review/comment count
                "rating": rating_score,  # Average rating score (0-5)
                "image_url": image_url if image_url else "https://via.placeholder.com/150",
                "url": product_url,
                "barcode": barcode,  # Barcode field added for barcode analysis
                "country_code": country_code,  # Country code (TR, CN, DE, etc.)
                "country": country_name  # Country name (Türkiye, Çin, Almanya, etc.)
            })

    result = {
        "report_id": report_id,
        "report_name": report.name,
        "kpis": kpis,
        "all_products": full_products,  # Full product data with social proof, images, URLs
        "charts": {
            "price_distribution": price_ranges,
            "top_categories": top_categories,
            "top_brands": top_brands,
            # DISABLED: "stock_status": stock_status,  # Not needed per user request
            "rating_distribution": rating_distribution,
            "brand_price_boxplot": brand_price_stats,
            "price_rating_scatter": scatter_data,
            "brand_strength": brand_strength_scores,
            "brand_category_heatmap": heatmap_data,
            "category_price_premium": {
                "all_categories": category_price_analysis_sorted,
                "most_expensive": most_expensive_categories,
                "most_affordable": most_affordable_categories
            },
            "origin_analysis": {
                "countries": origin_country_data_sorted,
                "top_countries": origin_country_data_sorted[:10],
                "total_products_with_origin": products_with_origin,
                "coverage_percentage": round((products_with_origin / total_products * 100), 2) if total_products > 0 else 0
            },
            "barcode_analysis": {
                "prefixes": barcode_prefix_data_sorted,
                "countries_from_barcode": barcode_country_data_sorted,
                "top_countries_from_barcode": barcode_country_data_sorted[:10],
                "total_products_with_barcode": products_with_barcode,
                "coverage_percentage": round((products_with_barcode / total_products * 100), 2) if total_products > 0 else 0
            },
            "merchant_analysis": {
                "merchants": merchant_list_sorted,
                "top_merchants": top_merchants,
                "total_merchants": total_merchants,
                "total_products_with_merchant": products_with_merchant,
                "total_winners": total_winners,
                "winner_percentage": round(winner_percentage, 2),
                "coverage_percentage": round((products_with_merchant / total_products * 100), 2) if total_products > 0 else 0
            }
            # DISABLED: Stock quantity analysis (not needed per user request)
            # "stock_analysis": {
            #     "avg_stock": round(avg_stock, 2),
            #     "median_stock": round(median_stock, 2),
            #     "total_stock": total_stock,
            #     "min_stock": min_stock,
            #     "max_stock": max_stock,
            #     "products_with_stock_info": products_with_stock_info,
            #     "coverage_percentage": round((products_with_stock_info / total_products * 100), 2) if total_products > 0 else 0,
            #     "distribution": stock_distribution,
            #     "category_stocks": category_stock_sorted,
            #     "top_stocked_categories": category_stock_sorted[:10]
            # }
        },
        "insights": {
            "low_rating_products": low_rating_products,
            "anomalies": anomalies
        }
    }

    # Cache the result for 1 hour
    dashboard_cache[cache_key] = (result, time.time())
    print(f"📊 Cached dashboard data for report {report_id}")

    return result


# ============================================================================
# NEW: External API aggregations (Reviews, Social Proof, Q&A, Similar, Followers)
# ============================================================================

class AggregationParams(BaseModel):
    refresh: Optional[bool] = False
    per_product_limit: Optional[int] = None  # None = API default
    batch_size: Optional[int] = 50


# DISABLED: Reviews feature removed per user request
# @app.get("/api/reports/{report_id}/reviews-summary")
def reviews_summary_disabled(report_id: int, refresh: bool = False, db: Session = Depends(get_db)):
    return {"error": "Reviews feature is disabled"}
    # Try persistent cache first
    if not refresh:
        persisted = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/reviews.json")
        if persisted:
            return {"source": "file", **persisted}
    cache_key = f"{report_id}"
    if not refresh and cache_key in reviews_cache:
        return {"source": "cache", **reviews_cache[cache_key]}

    try:
        all_products, _ = load_report_products(db, report_id)
        product_ids = [p.get("id") for p in all_products if p.get("id")]
        total = len(product_ids)

        summary = {
            "total_products": total,
            "processed": 0,
            "total_reviews": 0,
            "rating_histogram": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
            "tags": {},
            "sample_reviews": []
        }

        for pid in product_ids:
            data = fetch_product_reviews(pid, page=0, page_size=5)
            if not data:
                _log_enrichment_error(db, report_id=report_id, product_id=int(pid), merchant_id=None,
                                      endpoint="reviews", error_type="request_failed",
                                      message="reviews request failed or timed out")
                continue
            summary["processed"] += 1
            result = data.get("result", {}) if isinstance(data, dict) else {}
            summary_data = result.get("summary", {})

            # rating histogram - API'de "ratingCounts" olarak geliyor
            rating_counts = summary_data.get("ratingCounts", []) or summary_data.get("ratingHistogram", [])
            for h in rating_counts:
                k = str(h.get("rate", "") or h.get("rating", ""))
                v = h.get("count", 0)
                if k in summary["rating_histogram"]:
                    summary["rating_histogram"][k] += v

            # total reviews
            total_review_count = summary_data.get("totalCommentCount") or summary_data.get("totalCount") or 0
            summary["total_reviews"] += total_review_count

            # tags - API'de "tags" olarak geliyor (tagCloud değil)
            tags = summary_data.get("tags", []) or summary_data.get("tagCloud", [])
            for tag in tags:
                t = tag.get("name") or tag.get("tag")
                c = tag.get("count", 0)
                if t:
                    summary["tags"][t] = summary["tags"].get(t, 0) + c

            # samples - API'de "reviews" olarak geliyor (content değil)
            reviews = result.get("reviews", []) or result.get("content", [])
            for r in reviews[:2]:
                summary["sample_reviews"].append({
                    "product_id": pid,
                    "rating": r.get("rate") or r.get("rating"),
                    "helpful": r.get("likeCount", 0),
                    "with_image": bool(r.get("imageUrls") or r.get("hasImage")),
                    "text": (r.get("comment") or "")[:200]
                })
            # small pacing, limiter already active
            time.sleep(0.01)

        # top tags
        summary["top_tags"] = sorted(
            [{"tag": t, "count": c} for t, c in summary["tags"].items()],
            key=lambda x: x["count"], reverse=True
        )[:30]

        payload = {"source": "live", "summary": summary}
        reviews_cache[cache_key] = payload
        return payload
    except Exception as e:
        return {"error": str(e), "note": "Network or parsing issue", "summary": {}}


@app.get("/api/reports/{report_id}/social-proof/progress")
def social_proof_progress(report_id: int):
    """Check social proof enrichment progress"""
    progress_key = f"social_{report_id}"
    if progress_key in enrichment_progress:
        return enrichment_progress.get(progress_key)
    return {"status": "not_started", "progress": 0}


@app.get("/api/reports/{report_id}/social-proof")
def social_proof(report_id: int, refresh: bool = False, batch_size: int = 5, db: Session = Depends(get_db)):
    # Try persistent cache first
    if not refresh:
        persisted = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/social.json")
        if persisted:
            pass
            # Transform cache data to frontend format
            agg = {
                "products": persisted.get("products", 0),
                "total": persisted.get("total", {}),
                "missing": persisted.get("missing", 0)
            }
            details = persisted.get("details", {})

            # Build ALL products list (not just top 20)
            details_list = [
                {"product_id": int(pid), **vals}
                for pid, vals in details.items()
            ]
            # Sort by page_views (descending) - ALL products
            all_by_views = sorted(details_list, key=lambda x: x.get("page_views", 0), reverse=True)
            # Sort by orders (descending) - ALL products
            all_by_orders = sorted(details_list, key=lambda x: x.get("orders", 0), reverse=True)

            return {
                "source": "file",
                "aggregation": agg,
                "details": details,
                "top_by_views": all_by_views,  # All products sorted by views
                "top_by_orders": all_by_orders  # All products sorted by orders
            }
    cache_key = f"{report_id}:b{batch_size}"
    if not refresh and cache_key in social_proof_cache:
        return {"source": "cache", **social_proof_cache[cache_key]}

    # Initialize progress tracking
    progress_key = f"social_{report_id}"
    enrichment_progress.set(progress_key, {
        "status": "in_progress",
        "progress": 0,
        "total": 0,
        "processed": 0,
        "message": "Sosyal kanıt verileri toplanıyor..."
    })

    try:
        all_products, _ = load_report_products(db, report_id)
        product_ids = [p.get("id") for p in all_products if p.get("id")]
        total_products = len(product_ids)

        # Update total count
        enrichment_progress.set(progress_key, {
            "status": "in_progress",
            "progress": 0,
            "total": total_products,
            "processed": 0,
            "message": f"0 / {total_products} ürün işlendi"
        })
        # Map product id to a short display name
        product_info = {}
        for p in all_products:
            pid = p.get("id")
            if not pid:
                continue
            name = (p.get("name") or "Unknown")
            brand = p.get("brand", {}).get("name")
            if brand:
                display = f"{brand} - {name}"[:80]
            else:
                display = name[:80]
            product_info[int(pid)] = {"name": display}
        agg = {
            "products": len(product_ids),
            "total": {"page_views": 0, "orders": 0, "baskets": 0, "favorites": 0},
            "missing": 0
        }
        details = {}
        processed = 0

        for chunk in _chunked(product_ids, max(1, batch_size)):
            data = fetch_social_proof(chunk)
            if not data:
                agg["missing"] += len(chunk)
                # log per chunk
                _log_enrichment_error(db, report_id=report_id, product_id=None, merchant_id=None,
                                      endpoint="social", error_type="request_failed",
                                      message=f"social-proof batch failed for {len(chunk)} items")
                time.sleep(0.02)
                processed += len(chunk)
                # Update progress
                progress_pct = int((processed / total_products) * 100)
                enrichment_progress.set(progress_key, {
                    "status": "in_progress",
                    "progress": progress_pct,
                    "total": total_products,
                    "processed": processed,
                    "message": f"{processed} / {total_products} ürün işlendi"
                })
                continue

            items = data.get("result") or data.get("items") or []
            for it in items:
                pid = it.get("contentId") or it.get("id")
                pv = _safe_int(it.get("pageViewCount") or it.get("page-view-count") or 0)
                od = _safe_int(it.get("orderCount") or it.get("order-count") or 0)
                bk = _safe_int(it.get("basketCount") or it.get("basket-count") or 0)
                fv = _safe_int(it.get("favoriteCount") or it.get("favorite-count") or 0)
                if pid is None:
                    continue
                details[int(pid)] = {"page_views": pv, "orders": od, "baskets": bk, "favorites": fv}
                agg["total"]["page_views"] += pv
                agg["total"]["orders"] += od
                agg["total"]["baskets"] += bk
                agg["total"]["favorites"] += fv

            processed += len(chunk)
            # Update progress after each chunk
            progress_pct = int((processed / total_products) * 100)
            enrichment_progress.set(progress_key, {
                "status": "in_progress",
                "progress": progress_pct,
                "total": total_products,
                "processed": processed,
                "message": f"{processed} / {total_products} ürün işlendi"
            })
            time.sleep(0.01)

        # Build top lists
        details_list = [
            {"product_id": pid, **vals, **(product_info.get(pid, {}))}
            for pid, vals in details.items()
        ]
        top_by_views = sorted(details_list, key=lambda x: x.get("page_views", 0), reverse=True)[:20]
        top_by_orders = sorted(details_list, key=lambda x: x.get("orders", 0), reverse=True)[:20]

        result = {"aggregation": agg, "details": details, "top_by_views": top_by_views, "top_by_orders": top_by_orders}
        social_proof_cache[cache_key] = result

        # Mark as completed
        enrichment_progress.set(progress_key, {
            "status": "completed",
            "progress": 100,
            "total": total_products,
            "processed": total_products,
            "message": f"Tamamlandı! {total_products} ürün işlendi"
        })

        return result
    except Exception as e:
        pass
        # Mark as failed
        enrichment_progress.set(progress_key, {
            "status": "failed",
            "progress": 0,
            "total": 0,
            "processed": 0,
            "message": f"Hata: {str(e)}"
        })
        return {"error": str(e), "note": "Network or parsing issue", "aggregation": {}, "details": {}}


@app.get("/api/reports/{report_id}/sales-analytics")
def sales_analytics(report_id: int):
    """
    Fast sales analytics endpoint - returns top products by orders
    """
    try:
        # Load social proof data
        social_data = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/social.json")
        if not social_data:
            return {"error": "Social proof data not found"}

        social_details = social_data.get("details", {})

        # Build enriched product list from social proof data
        enriched_products = []
        for pid_str, social_vals in social_details.items():
            # Social data already has name, brand, price
            enriched = {
                "id": int(pid_str),
                "name": social_vals.get("name", ""),
                "brand": social_vals.get("brand", "Unknown"),
                "price": social_vals.get("price", 0),
                "page_views": social_vals.get("page_views", 0),
                "orders": social_vals.get("orders", 0),
                "baskets": social_vals.get("baskets", 0),
                "favorites": social_vals.get("favorites", 0)
            }

            # Calculate conversion rates
            views = enriched["page_views"]
            baskets = enriched["baskets"]
            orders = enriched["orders"]

            enriched["view_to_basket_rate"] = (baskets / views * 100) if views > 0 else 0
            enriched["basket_to_order_rate"] = (orders / baskets * 100) if baskets > 0 else 0
            enriched["view_to_order_rate"] = (orders / views * 100) if views > 0 else 0

            # Calculate performance score (0-100)
            # Weighted: orders (40%), conversion rate (30%), views (20%), favorites (10%)
            max_orders = max([s.get("orders", 0) for s in social_details.values()]) or 1
            max_views = max([s.get("page_views", 0) for s in social_details.values()]) or 1
            max_favs = max([s.get("favorites", 0) for s in social_details.values()]) or 1

            order_score = (orders / max_orders) * 40
            conversion_score = enriched["view_to_order_rate"] * 3  # Scale 0-30
            view_score = (views / max_views) * 20
            fav_score = (enriched["favorites"] / max_favs) * 10

            enriched["performance_score"] = min(100, order_score + conversion_score + view_score + fav_score)

            enriched_products.append(enriched)

        # Return top products by orders
        top_by_orders = sorted(enriched_products, key=lambda x: x.get("orders", 0), reverse=True)[:20]

        return {
            "top_products_by_orders": top_by_orders
        }

    except Exception as e:
        return {"error": str(e), "note": "Failed to generate sales analytics"}


# ============================================================================
# KEYWORD ANALYSIS
# ============================================================================

# Türkçe stop words listesi
TURKISH_STOP_WORDS = {
    've', 'ile', 'için', 'bir', 'bu', 'şu', 'o', 'de', 'da', 'ki',
    'mi', 'mı', 'mu', 'mü', 'ise', 'olan', 'olarak', 'gibi',
    'kadar', 'daha', 'en', 'çok', 'az', 'var', 'yok', 'veya',
    'ile', 'ancak', 'ama', 'fakat', 'lakin', 'çünkü', 'zira',
    'şöyle', 'böyle', 'nasıl', 'ne', 'neden', 'niçin', 'niye',
    'a', 'e', 'i', 'ı', 'o', 'ö', 'u', 'ü'  # Tek harfler
}

def normalize_turkish(text: str) -> str:
    """Türkçe karakterleri normalize eder"""
    replacements = {
        'İ': 'i', 'I': 'ı',
        'Ş': 'ş', 'ş': 'ş',
        'Ğ': 'ğ', 'ğ': 'ğ',
        'Ü': 'ü', 'ü': 'ü',
        'Ö': 'ö', 'ö': 'ö',
        'Ç': 'ç', 'ç': 'ç'
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

def extract_keywords_from_text(text: str, min_length: int = 3, stop_words: set = None) -> list:
    """
    Metinden keyword'leri çıkarır.
    
    Args:
        text: Analiz edilecek metin
        min_length: Minimum keyword uzunluğu
        stop_words: Stop words seti (None ise TURKISH_STOP_WORDS kullanılır)
    
    Returns:
        Keyword listesi
    """
    if not text or not isinstance(text, str):
        return []
    
    if stop_words is None:
        stop_words = TURKISH_STOP_WORDS
    
    # 1. Küçük harfe çevir
    text = text.lower()
    
    # 2. Türkçe karakterleri normalize et
    text = normalize_turkish(text)
    
    # 3. Noktalama işaretlerini temizle
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # 4. Sayıları temizle
    text = re.sub(r'\d+', '', text)
    
    # 5. Fazla boşlukları temizle
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 6. Tokenize
    tokens = text.split()
    
    # 7. Filtrele
    keywords = [
        token for token in tokens
        if len(token) >= min_length
        and token not in stop_words
        and not token.isdigit()
        and token.isalpha()  # Sadece harf içeren
    ]
    
    return keywords

def generate_ngrams(tokens: list, min_n: int = 1, max_n: int = 3) -> list:
    """
    Generate N-grams from a list of tokens.

    Args:
        tokens: List of words (tokens)
        min_n: Minimum N-gram size (default: 1 = single words)
        max_n: Maximum N-gram size (default: 3 = trigrams)

    Returns:
        List of N-grams as strings

    Example:
        tokens = ["mini", "buzdolabı", "beyaz"]
        min_n=1, max_n=3 →
        ["mini", "buzdolabı", "beyaz",                    # 1-grams
         "mini buzdolabı", "buzdolabı beyaz",             # 2-grams
         "mini buzdolabı beyaz"]                          # 3-grams
    """
    ngrams = []

    for n in range(min_n, max_n + 1):
        # Generate all n-grams of size n
        for i in range(len(tokens) - n + 1):
            ngram = ' '.join(tokens[i:i+n])
            ngrams.append(ngram)

    return ngrams

@app.get("/api/reports/{report_id}/keyword-analysis")
def keyword_analysis(
    report_id: int,
    min_frequency: int = 3,
    min_length: int = 3,
    category_filter: Optional[str] = None,
    top_n: int = 50,  # DEPRECATED: Use page/per_page instead
    # Pagination parameters
    page: int = 1,  # Page number (1-indexed)
    per_page: int = 100,  # Keywords per page
    # N-gram (word count) filters
    min_word_count: Optional[int] = 1,  # Minimum number of words in keyword (1-5)
    max_word_count: Optional[int] = 3,  # Maximum number of words in keyword (1-5)
    # Advanced filters
    min_views: Optional[int] = None,
    max_views: Optional[int] = None,
    min_orders: Optional[int] = None,
    max_orders: Optional[int] = None,
    min_reviews: Optional[int] = None,
    max_reviews: Optional[int] = None,
    min_conversion_rate: Optional[float] = None,
    max_conversion_rate: Optional[float] = None,
    min_avg_price: Optional[float] = None,
    max_avg_price: Optional[float] = None,
    sort_by: str = "frequency",  # frequency, views, orders, reviews, conversion_rate
    sort_order: str = "desc",  # asc, desc
    competition_level: Optional[str] = None,  # low, medium, high
    min_potential_score: Optional[float] = None,  # 0-100
    db: Session = Depends(get_db)
):
    """
    Ürün adlarından keyword çıkarır ve N-gram analizi yapar.

    Args:
        report_id: Rapor ID
        min_frequency: Minimum keyword geçme sayısı (default: 3)
        min_length: Minimum karakter uzunluğu (default: 3)
        min_word_count: Minimum kelime sayısı (1-5, default: 1)
        max_word_count: Maximum kelime sayısı (1-5, default: 3)
        category_filter: Belirli kategoriye göre filtreleme (opsiyonel)
        top_n: Top N keyword göster (default: 50)

    N-gram Examples:
        min_word_count=1, max_word_count=1 → "mini", "buzdolabı", "beyaz"
        min_word_count=2, max_word_count=2 → "mini buzdolabı", "buzdolabı beyaz"
        min_word_count=2, max_word_count=3 → "mini buzdolabı", "beyaz buzdolabı", "mini buzdolabı modelleri"

    Returns:
        Keyword analiz sonuçları
    """
    # print(f"🔍 ========== KEYWORD ANALYSIS REQUEST ==========")
    print(f"📋 Report ID: {report_id}")
    print(f"⚙️  Parameters: min_frequency={min_frequency}, min_length={min_length}, word_count={min_word_count}-{max_word_count}, top_n={top_n}, category_filter={category_filter}")
    
    try:
        print(f"📦 Ürünler yükleniyor...")
        # Load products
        all_products, categories_data = load_report_products(db, report_id)
        print(f"✅ {len(all_products) if all_products else 0} ürün yüklendi")
        
        if not all_products:
            print(f"⚠️  Rapor için ürün bulunamadı!")
            return {"error": "No products found for this report"}
        
        # Load social proof data
        print(f"📊 Social proof data yükleniyor...")
        social_json_path = os.path.join(REPORTS_DIR, f"enrich_{report_id}", "social.json")
        social_data = _load_json(social_json_path)
        social_details = social_data.get("details", {}) if social_data else {}
        print(f"✅ Social proof data yüklendi: {len(social_details)} ürün (path: {social_json_path})")
        
        # Filter by category if specified
        if category_filter:
            all_products = [
                p for p in all_products
                if (p.get("category", {}).get("name") if isinstance(p.get("category"), dict) else p.get("category")) == category_filter
            ]
        
        # Step 1: Extract keywords from all product names (OPTIMIZED)
        print(f"🔤 Keyword extraction başlatılıyor... ({len(all_products)} ürün)")
        keyword_to_products = {}  # {keyword: [product_ids]}
        product_keywords_map = {}  # {product_id: [keywords]}
        
        # Pre-compile regex patterns for better performance
        import re
        stop_words = TURKISH_STOP_WORDS
        
        processed_count = 0
        start_time = time.time()
        
        for product in all_products:
            product_id = product.get("id")
            if not product_id:
                continue
            
            product_name = product.get("name", "")
            if not product_name:
                continue
            
            # Extract keywords (optimized inline version)
            text = product_name.lower()
            text = normalize_turkish(text)
            text = re.sub(r'[^\w\s]', ' ', text)
            text = re.sub(r'\d+', '', text)
            text = re.sub(r'\s+', ' ', text).strip()
            
            tokens = text.split()
            # Filter tokens by character length and stop words
            filtered_tokens = [
                token for token in tokens
                if len(token) >= min_length
                and token not in stop_words
                and not token.isdigit()
                and token.isalpha()
            ]

            # Generate N-grams (1-word, 2-word, 3-word, etc.)
            keywords = generate_ngrams(filtered_tokens, min_n=min_word_count, max_n=max_word_count)

            product_keywords_map[product_id] = keywords

            # Group by keyword
            for keyword in keywords:
                if keyword not in keyword_to_products:
                    keyword_to_products[keyword] = []
                keyword_to_products[keyword].append(product_id)
            
            processed_count += 1
            if processed_count % 500 == 0:
                elapsed = time.time() - start_time
                rate = processed_count / elapsed if elapsed > 0 else 0
                remaining = (len(all_products) - processed_count) / rate if rate > 0 else 0
                print(f"⏳ İşlenen ürün: {processed_count}/{len(all_products)} ({rate:.0f} ürün/sn, ~{remaining:.0f}s kaldı)")
        
        elapsed_total = time.time() - start_time
        print(f"✅ Keyword extraction tamamlandı: {len(keyword_to_products)} unique keyword bulundu ({elapsed_total:.2f}s)")

        # Step 2: Separate rare keywords (frequency 1-2) and common keywords (>= min_frequency)
        print(f"🔍 Keyword ayrıştırma: rare (1-2) vs common (>={min_frequency})")
        rare_keywords = {
            kw: product_ids
            for kw, product_ids in keyword_to_products.items()
            if 1 <= len(product_ids) <= 2
        }
        filtered_keywords = {
            kw: product_ids
            for kw, product_ids in keyword_to_products.items()
            if len(product_ids) >= min_frequency
        }
        print(f"✅ Rare keywords: {len(rare_keywords)} | Common keywords: {len(filtered_keywords)}")
        
        # Step 3: Calculate metrics for each keyword (OPTIMIZED)
        print(f"📊 Metrikler hesaplanıyor... ({len(filtered_keywords)} keyword)")
        keyword_metrics = []
        
        # Create product lookup dict for faster access
        product_dict = {p.get("id"): p for p in all_products if p.get("id")}
        
        metric_count = 0
        metric_start_time = time.time()
        for keyword, product_ids in filtered_keywords.items():
            # Get category distribution and metrics
            category_counts = {}
            category_metrics = {}  # {category: {views, orders, reviews, baskets, favorites, product_count}}
            total_views = 0
            total_orders = 0
            total_baskets = 0
            total_favorites = 0
            total_reviews = 0
            keyword_products = []
            
            for pid in product_ids:
                # Find product (using dict lookup for O(1) instead of O(n))
                product = product_dict.get(pid)
                if not product:
                    continue
                
                # Get category
                category = product.get("category", {})
                if isinstance(category, dict):
                    category_name = category.get("name", "Uncategorized")
                else:
                    category_name = category if category else "Uncategorized"
                
                category_counts[category_name] = category_counts.get(category_name, 0) + 1
                
                # Initialize category metrics if not exists
                if category_name not in category_metrics:
                    category_metrics[category_name] = {
                        "views": 0,
                        "orders": 0,
                        "reviews": 0,
                        "baskets": 0,
                        "favorites": 0,
                        "product_count": 0
                    }
                
                # Get social proof
                social = social_details.get(str(pid), {})
                views = social.get("page_views", 0) or 0
                orders = social.get("orders", 0) or 0
                baskets = social.get("baskets", 0) or 0
                favorites = social.get("favorites", 0) or 0
                
                # Get review count from multiple possible locations
                review_count = 0
                # Try rating_count field first
                if product.get("rating_count"):
                    review_count = int(product.get("rating_count", 0) or 0)
                # Try rating object with totalCount or totalComments
                elif product.get("rating"):
                    rating_obj = product.get("rating")
                    if isinstance(rating_obj, dict):
                        review_count = int(rating_obj.get("totalComments", 0) or rating_obj.get("totalCount", 0) or 0)
                    elif isinstance(rating_obj, (int, float)):
                        pass
                        # If rating is just a number, no review count available
                        review_count = 0
                
                # Add to category metrics
                category_metrics[category_name]["views"] += views
                category_metrics[category_name]["orders"] += orders
                category_metrics[category_name]["reviews"] += review_count
                category_metrics[category_name]["baskets"] += baskets
                category_metrics[category_name]["favorites"] += favorites
                category_metrics[category_name]["product_count"] += 1
                
                # Add to totals
                total_views += views
                total_orders += orders
                total_baskets += baskets
                total_favorites += favorites
                total_reviews += review_count
                
                # Store product info
                keyword_products.append({
                    "id": pid,
                    "name": product.get("name", "")[:50],
                    "category": category_name,
                    "brand": product.get("brand", {}).get("name", "Unknown") if isinstance(product.get("brand"), dict) else "Unknown",
                    "views": views,
                    "orders": orders,
                    "reviews": review_count,
                    "price": product.get("price", {}).get("sellingPrice", 0) if isinstance(product.get("price"), dict) else 0,
                    "image_url": product.get("images", [])[0] if product.get("images") else "https://via.placeholder.com/150",
                    "url": product.get("url", "") or f"https://www.trendyol.com/p/{pid}"
                })
            
            product_count = len(product_ids)
            
            # Calculate averages
            avg_views = total_views / product_count if product_count > 0 else 0
            avg_orders = total_orders / product_count if product_count > 0 else 0
            avg_reviews = total_reviews / product_count if product_count > 0 else 0
            conversion_rate = (total_orders / total_views * 100) if total_views > 0 else 0
            
            # Top categories with metrics
            top_categories = []
            for cat, count in category_counts.items():
                cat_metrics = category_metrics.get(cat, {})
                cat_views = cat_metrics.get("views", 0)
                cat_orders = cat_metrics.get("orders", 0)
                cat_reviews = cat_metrics.get("reviews", 0)
                cat_conversion = (cat_orders / cat_views * 100) if cat_views > 0 else 0
                
                top_categories.append({
                    "category": cat,
                    "count": count,
                    "percentage": (count / product_count * 100),
                    "total_views": cat_views,
                    "total_orders": cat_orders,
                    "total_reviews": cat_reviews,
                    "conversion_rate": round(cat_conversion, 2)
                })
            
            top_categories = sorted(
                top_categories,
                key=lambda x: x["count"],
                reverse=True
            )[:10]  # Show top 10 categories

            # Filter products with sales > 0, then sort by orders and take top 10
            products_with_sales = [p for p in keyword_products if p["orders"] > 0]
            top_products = sorted(
                products_with_sales,
                key=lambda x: x["orders"],
                reverse=True
            )[:10]

            keyword_metrics.append({
                "keyword": keyword,
                "frequency": product_count,
                "categories": category_counts,
                "top_categories": top_categories,
                "performance": {
                    "total_views": total_views,
                    "total_orders": total_orders,
                    "total_baskets": total_baskets,
                    "total_favorites": total_favorites,
                    "total_reviews": total_reviews,
                    "avg_views_per_product": round(avg_views, 2),
                    "avg_orders_per_product": round(avg_orders, 2),
                    "avg_reviews_per_product": round(avg_reviews, 2),
                    "conversion_rate": round(conversion_rate, 2)
                },
                "products": top_products  # Top 10 products by sales
            })
            
            metric_count += 1
            if metric_count % 50 == 0:
                elapsed_metric = time.time() - metric_start_time
                rate = metric_count / elapsed_metric if elapsed_metric > 0 else 0
                remaining = (len(filtered_keywords) - metric_count) / rate if rate > 0 else 0
                print(f"⏳ İşlenen keyword: {metric_count}/{len(filtered_keywords)} ({rate:.1f} keyword/sn, ~{remaining:.0f}s kaldı)")
        
        metric_elapsed = time.time() - metric_start_time
        print(f"✅ Metrikler hesaplandı: {len(keyword_metrics)} keyword ({metric_elapsed:.2f}s)")
        
        # Step 4: Apply advanced filters
        # print(f"🔍 Gelişmiş filtreler uygulanıyor...")
        filtered_metrics = keyword_metrics.copy()
        
        # Views filter
        if min_views is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["total_views"] >= min_views]
        if max_views is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["total_views"] <= max_views]
        
        # Orders filter
        if min_orders is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["total_orders"] >= min_orders]
        if max_orders is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["total_orders"] <= max_orders]
        
        # Reviews filter
        if min_reviews is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["total_reviews"] >= min_reviews]
        if max_reviews is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["total_reviews"] <= max_reviews]
        
        # Conversion rate filter
        if min_conversion_rate is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["conversion_rate"] >= min_conversion_rate]
        if max_conversion_rate is not None:
            filtered_metrics = [kw for kw in filtered_metrics if kw["performance"]["conversion_rate"] <= max_conversion_rate]
        
        # Average price filter (calculate from products)
        if min_avg_price is not None or max_avg_price is not None:
            filtered_by_price = []
            for kw in filtered_metrics:
                if kw["products"]:
                    avg_price = sum(p.get("price", 0) for p in kw["products"]) / len(kw["products"])
                    if min_avg_price is not None and avg_price < min_avg_price:
                        continue
                    if max_avg_price is not None and avg_price > max_avg_price:
                        continue
                filtered_by_price.append(kw)
            filtered_metrics = filtered_by_price
        
        # Competition level filter (based on frequency)
        if competition_level:
            total_keywords_count = len(keyword_metrics)
            if total_keywords_count > 0:
                if competition_level == "low":
                    pass
                    # Bottom 33% - low competition
                    sorted_freqs = sorted([kw["frequency"] for kw in keyword_metrics])
                    threshold = sorted_freqs[int(total_keywords_count * 0.33)] if sorted_freqs else 0
                    filtered_metrics = [kw for kw in filtered_metrics if kw["frequency"] <= threshold]
                elif competition_level == "high":
                    pass
                    # Top 33% - high competition
                    sorted_freqs = sorted([kw["frequency"] for kw in keyword_metrics], reverse=True)
                    threshold = sorted_freqs[int(total_keywords_count * 0.33)] if sorted_freqs else float('inf')
                    filtered_metrics = [kw for kw in filtered_metrics if kw["frequency"] >= threshold]
                # medium is between low and high, no filter needed
        
        # Potential score filter (high conversion + low competition)
        if min_potential_score is not None:
            pass
            # Calculate potential score: (conversion_rate * 0.6) + ((100 - normalized_frequency) * 0.4)
            max_freq = max([kw["frequency"] for kw in filtered_metrics]) if filtered_metrics else 1
            for kw in filtered_metrics:
                normalized_freq = (kw["frequency"] / max_freq) * 100 if max_freq > 0 else 0
                potential = (kw["performance"]["conversion_rate"] * 0.6) + ((100 - normalized_freq) * 0.4)
                kw["potential_score"] = round(potential, 2)
            filtered_metrics = [kw for kw in filtered_metrics if kw.get("potential_score", 0) >= min_potential_score]
        
        print(f"✅ Filtreleme sonrası: {len(filtered_metrics)} keyword kaldı")
        
        # Step 5: Sort by selected criteria
        print(f"📈 Sıralama yapılıyor: {sort_by} ({sort_order})...")
        reverse_order = sort_order == "desc"
        
        if sort_by == "frequency":
            filtered_metrics.sort(key=lambda x: x["frequency"], reverse=reverse_order)
        elif sort_by == "views":
            filtered_metrics.sort(key=lambda x: x["performance"]["total_views"], reverse=reverse_order)
        elif sort_by == "orders":
            filtered_metrics.sort(key=lambda x: x["performance"]["total_orders"], reverse=reverse_order)
        elif sort_by == "reviews":
            filtered_metrics.sort(key=lambda x: x["performance"]["total_reviews"], reverse=reverse_order)
        elif sort_by == "conversion_rate":
            filtered_metrics.sort(key=lambda x: x["performance"]["conversion_rate"], reverse=reverse_order)
        elif sort_by == "potential_score":
            pass
            # Calculate if not already calculated
            max_freq = max([kw["frequency"] for kw in filtered_metrics]) if filtered_metrics else 1
            for kw in filtered_metrics:
                if "potential_score" not in kw:
                    normalized_freq = (kw["frequency"] / max_freq) * 100 if max_freq > 0 else 0
                    kw["potential_score"] = round((kw["performance"]["conversion_rate"] * 0.6) + ((100 - normalized_freq) * 0.4), 2)
            filtered_metrics.sort(key=lambda x: x.get("potential_score", 0), reverse=reverse_order)
        
        # Pagination logic
        import math
        total_keywords = len(filtered_metrics)
        total_pages = math.ceil(total_keywords / per_page) if per_page > 0 else 1

        # Calculate offset and limit
        start_index = (page - 1) * per_page
        end_index = start_index + per_page

        # Get paginated keywords
        paginated_keywords = filtered_metrics[start_index:end_index]
        print(f"✅ Sayfa {page}/{total_pages} - {len(paginated_keywords)} keyword seçildi (toplam: {total_keywords})")

        # Step 6: Process rare keywords (frequency 1-2) - Limited to top 100 for performance
        print(f"📊 Rare keywords işleniyor... ({len(rare_keywords)} keyword)")
        rare_metrics = []
        rare_count = 0
        for keyword, product_ids in rare_keywords.items():
            # Get category distribution and metrics (simplified version)
            total_views = 0
            total_orders = 0
            total_baskets = 0

            for pid in product_ids:
                product = product_dict.get(pid)
                if not product:
                    continue

                # Get social proof
                social = social_details.get(str(pid), {})
                total_views += social.get("contentViewCount", 0)
                total_orders += social.get("totalOrder", 0)
                total_baskets += social.get("totalBasket", 0)

            # Only include rare keywords that have actual sales
            if total_orders > 0:
                rare_metrics.append({
                    "keyword": keyword,
                    "frequency": len(product_ids),
                    "performance": {
                        "total_views": total_views,
                        "total_orders": total_orders,
                        "total_baskets": total_baskets,
                        "conversion_rate": round((total_orders / total_views * 100) if total_views > 0 else 0, 2)
                    }
                })

                rare_count += 1
                if rare_count >= 100:  # Limit to 100 rare keywords for performance
                    break

        # Sort rare keywords by orders (most promising first)
        rare_metrics.sort(key=lambda x: x["performance"]["total_orders"], reverse=True)
        print(f"✅ Rare keywords işlendi: {len(rare_metrics)} keyword (top 100)")

        # Step 7: Build category × keyword matrix
        category_keyword_matrix = {}
        for kw_data in paginated_keywords:
            keyword = kw_data["keyword"]
            for cat, count in kw_data["categories"].items():
                if cat not in category_keyword_matrix:
                    category_keyword_matrix[cat] = {}
                category_keyword_matrix[cat][keyword] = count
        
        # Step 7: Calculate insights
        most_frequent = paginated_keywords[:10] if paginated_keywords else []
        best_performing = sorted(
            keyword_metrics,
            key=lambda x: x["performance"]["total_orders"],
            reverse=True
        )[:10]

        result = {
            "total_keywords": total_keywords,
            "total_products_analyzed": len(all_products),
            "keywords": paginated_keywords,
            "rare_keywords": rare_metrics,  # NEW: Rare keywords (frequency 1-2)
            "total_rare_keywords": len(rare_keywords),  # NEW: Total count of rare keywords
            "category_keyword_matrix": category_keyword_matrix,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "total_items": total_keywords,
                "has_next": page < total_pages,
                "has_previous": page > 1
            },
            "insights": {
                "most_frequent_keywords": [{"keyword": kw["keyword"], "frequency": kw["frequency"]} for kw in most_frequent],
                "best_performing_keywords": [{"keyword": kw["keyword"], "total_orders": kw["performance"]["total_orders"]} for kw in best_performing]
            }
        }

        print(f"✅ ========== KEYWORD ANALYSIS COMPLETED ==========")
        print(f"📊 Sonuç: {result['total_keywords']} common keywords, {result['total_rare_keywords']} rare keywords, {result['total_products_analyzed']} ürün")
        print(f"📄 Sayfa {page}/{total_pages} - {len(result['keywords'])} keyword gösteriliyor, {len(result['rare_keywords'])} rare keyword")
        
        return result
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Keyword analysis error: {str(e)}")
        print(f"Traceback: {error_trace}")
        return {"error": str(e), "traceback": error_trace, "note": "Failed to generate keyword analysis"}


# ============================================================================
# PRODUCT FINDER
# ============================================================================

@app.get("/api/reports/{report_id}/product-finder")
def product_finder(
    report_id: int,
    keywords: Optional[str] = None,
    keyword_logic: str = "and",  # and, or, not
    min_views: Optional[int] = None,
    max_views: Optional[int] = None,
    min_orders: Optional[int] = None,
    max_orders: Optional[int] = None,
    min_reviews: Optional[int] = None,
    max_reviews: Optional[int] = None,
    min_conversion_rate: Optional[float] = None,
    max_conversion_rate: Optional[float] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    min_rating_count: Optional[int] = None,
    max_rating_count: Optional[int] = None,
    categories: Optional[str] = None,  # comma-separated
    brands: Optional[str] = None,  # comma-separated
    origin_countries: Optional[str] = None,  # comma-separated
    competition_level: Optional[str] = None,
    min_potential_score: Optional[float] = None,
    sort_by: str = "orders",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db)
):
    """
    Gelişmiş filtrelerle ürün arama ve bulma.
    
    Args:
        report_id: Rapor ID
        keywords: Virgülle ayrılmış keyword listesi
        keyword_logic: "and", "or", "not"
        ... (diğer filtreler)
        page: Sayfa numarası
        per_page: Sayfa başına ürün sayısı
    
    Returns:
        Filtrelenmiş ürün listesi
    """
    # print(f"🔍 ========== PRODUCT FINDER REQUEST ==========")
    print(f"📋 Report ID: {report_id}, Page: {page}, Per Page: {per_page}")
    
    try:
        pass
        # Load products
        all_products, categories_data = load_report_products(db, report_id)
        print(f"✅ {len(all_products)} ürün yüklendi")
        
        if not all_products:
            return {
                "total_products": 0,
                "page": page,
                "per_page": per_page,
                "total_pages": 0,
                "products": []
            }
        
        # Load social proof data
        social_data = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/social.json")
        social_details = social_data.get("details", {}) if social_data else {}
        print(f"✅ Social proof data yüklendi: {len(social_details)} ürün")
        
        # Create product lookup dict
        product_dict = {p.get("id"): p for p in all_products if p.get("id")}
        
        # Filter products
        filtered_products = []
        
        # Parse filter lists
        category_list = [c.strip() for c in categories.split(",")] if categories else []
        brand_list = [b.strip() for b in brands.split(",")] if brands else []
        origin_list = [o.strip() for o in origin_countries.split(",")] if origin_countries else []
        keyword_list = [k.strip().lower() for k in keywords.split(",")] if keywords else []
        
        # Calculate competition levels (category-based)
        category_product_counts = {}
        for product in all_products:
            category = product.get("category", {})
            if isinstance(category, dict):
                cat_name = category.get("name", "Uncategorized")
            else:
                cat_name = category if category else "Uncategorized"
            category_product_counts[cat_name] = category_product_counts.get(cat_name, 0) + 1
        
        for product in all_products:
            product_id = product.get("id")
            if not product_id:
                continue
            
            # Get social proof
            social = social_details.get(str(product_id), {})
            views = social.get("page_views", 0) or 0
            orders = social.get("orders", 0) or 0
            baskets = social.get("baskets", 0) or 0
            favorites = social.get("favorites", 0) or 0
            
            # Get review count
            review_count = 0
            if product.get("rating_count"):
                review_count = int(product.get("rating_count", 0) or 0)
            elif product.get("rating"):
                rating_obj = product.get("rating")
                if isinstance(rating_obj, dict):
                    review_count = int(rating_obj.get("totalComments", 0) or rating_obj.get("totalCount", 0) or 0)
            
            # Get rating
            rating = 0
            if product.get("rating"):
                rating_obj = product.get("rating")
                if isinstance(rating_obj, dict):
                    rating = float(rating_obj.get("averageRating", 0) or 0)
                elif isinstance(rating_obj, (int, float)):
                    rating = float(rating_obj)
            
            # Get price
            price = 0
            if product.get("price"):
                price_obj = product.get("price")
                if isinstance(price_obj, dict):
                    price = float(price_obj.get("sellingPrice", 0) or 0)
                elif isinstance(price_obj, (int, float)):
                    price = float(price_obj)
            
            # Get category
            category = product.get("category", {})
            if isinstance(category, dict):
                category_name = category.get("name", "Uncategorized")
            else:
                category_name = category if category else "Uncategorized"
            
            # Get brand
            brand = product.get("brand", {})
            if isinstance(brand, dict):
                brand_name = brand.get("name", "Unknown")
            else:
                brand_name = brand if brand else "Unknown"
            
            # Get origin country
            origin_country = product.get("origin_country", "Unknown")
            
            # Calculate conversion rate
            conversion_rate = (orders / views * 100) if views > 0 else 0
            
            # Keyword filter
            if keyword_list:
                product_name = (product.get("name", "") or "").lower()
                if keyword_logic == "and":
                    if not all(kw in product_name for kw in keyword_list):
                        continue
                elif keyword_logic == "or":
                    if not any(kw in product_name for kw in keyword_list):
                        continue
                elif keyword_logic == "not":
                    if any(kw in product_name for kw in keyword_list):
                        continue
            
            # Views filter
            if min_views is not None and views < min_views:
                continue
            if max_views is not None and views > max_views:
                continue
            
            # Orders filter
            if min_orders is not None and orders < min_orders:
                continue
            if max_orders is not None and orders > max_orders:
                continue
            
            # Reviews filter
            if min_reviews is not None and review_count < min_reviews:
                continue
            if max_reviews is not None and review_count > max_reviews:
                continue
            
            # Conversion rate filter
            if min_conversion_rate is not None and conversion_rate < min_conversion_rate:
                continue
            if max_conversion_rate is not None and conversion_rate > max_conversion_rate:
                continue
            
            # Price filter
            if min_price is not None and price < min_price:
                continue
            if max_price is not None and price > max_price:
                continue
            
            # Rating filter
            if min_rating is not None and rating < min_rating:
                continue
            if max_rating is not None and rating > max_rating:
                continue
            
            # Rating count filter
            if min_rating_count is not None and review_count < min_rating_count:
                continue
            if max_rating_count is not None and review_count > max_rating_count:
                continue
            
            # Category filter
            if category_list and category_name not in category_list:
                continue
            
            # Brand filter
            if brand_list and brand_name not in brand_list:
                continue
            
            # Origin country filter
            if origin_list and origin_country not in origin_list:
                continue
            
            # Competition level filter
            if competition_level:
                cat_count = category_product_counts.get(category_name, 0)
                total_cat_count = len(category_product_counts)
                if total_cat_count > 0:
                    sorted_counts = sorted(category_product_counts.values())
                    low_threshold = sorted_counts[int(total_cat_count * 0.33)] if sorted_counts else 0
                    high_threshold = sorted_counts[int(total_cat_count * 0.67)] if sorted_counts else float('inf')
                    
                    if competition_level == "low" and cat_count > low_threshold:
                        continue
                    elif competition_level == "high" and cat_count < high_threshold:
                        continue
            
            # Potential score filter
            if min_potential_score is not None:
                max_cat_count = max(category_product_counts.values()) if category_product_counts else 1
                normalized_competition = (cat_count / max_cat_count) * 100 if max_cat_count > 0 else 0
                potential = (conversion_rate * 0.6) + ((100 - normalized_competition) * 0.4)
                if potential < min_potential_score:
                    continue
            
            # Add product to results
            filtered_products.append({
                "id": product_id,
                "name": product.get("name", ""),
                "category": category_name,
                "brand": brand_name,
                "price": round(price, 2),
                "rating": round(rating, 2),
                "rating_count": review_count,
                "views": views,
                "orders": orders,
                "reviews": review_count,
                "baskets": baskets,
                "favorites": favorites,
                "conversion_rate": round(conversion_rate, 2),
                "origin_country": origin_country,
                "image_url": product.get("imageUrl", ""),
                "barcode": product.get("barcode", "")
            })
        
        print(f"✅ Filtreleme sonrası: {len(filtered_products)} ürün kaldı")
        
        # Sort products
        reverse_order = sort_order == "desc"
        if sort_by == "views":
            filtered_products.sort(key=lambda x: x["views"], reverse=reverse_order)
        elif sort_by == "orders":
            filtered_products.sort(key=lambda x: x["orders"], reverse=reverse_order)
        elif sort_by == "reviews":
            filtered_products.sort(key=lambda x: x["reviews"], reverse=reverse_order)
        elif sort_by == "conversion_rate":
            filtered_products.sort(key=lambda x: x["conversion_rate"], reverse=reverse_order)
        elif sort_by == "price":
            filtered_products.sort(key=lambda x: x["price"], reverse=reverse_order)
        elif sort_by == "rating":
            filtered_products.sort(key=lambda x: x["rating"], reverse=reverse_order)
        
        # Pagination
        total_products = len(filtered_products)
        total_pages = (total_products + per_page - 1) // per_page
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_products = filtered_products[start_idx:end_idx]
        
        print(f"✅ Sayfalama: {len(paginated_products)} ürün gösteriliyor (sayfa {page}/{total_pages})")
        
        return {
            "total_products": total_products,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "products": paginated_products
        }
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Product finder error: {str(e)}")
        print(f"Traceback: {error_trace}")
        return {
            "error": str(e),
            "total_products": 0,
            "page": page,
            "per_page": per_page,
            "total_pages": 0,
            "products": []
        }


# DISABLED: Questions feature removed per user request
# @app.get("/api/reports/{report_id}/questions-summary")
# def questions_summary(report_id: int, refresh: bool = False, db: Session = Depends(get_db)):
#     # Try persistent cache first
#     if not refresh:
#         persisted = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/questions.json")
#         if persisted:
#             return {"source": "file", **persisted}
#     cache_key = f"{report_id}"
#     if not refresh and cache_key in questions_cache:
#         return {"source": "cache", **questions_cache[cache_key]}
#
#     try:
#         all_products, _ = load_report_products(db, report_id)
#         product_ids = [p.get("id") for p in all_products if p.get("id")]
#         summary = {"total_products": len(product_ids), "processed": 0, "total_questions": 0, "top_topics": {}, "sample": []}
#
#         for pid in product_ids:
#             data = fetch_merchant_questions(pid, page=0, page_size=5)
#             if not data:
#                 _log_enrichment_error(db, report_id=report_id, product_id=int(pid), merchant_id=None,
#                                       endpoint="questions", error_type="request_failed",
#                                       message="questions request failed or timed out")
#                 continue
#             summary["processed"] += 1
#             res = data.get("result") or {}
#             summary_data = res.get("summary", {})
#
#             # Total questions - API'de summary.totalCount olarak geliyor
#             total_q = summary_data.get("totalCount") or res.get("totalElements") or res.get("total") or 0
#             summary["total_questions"] += total_q
#
#             # Questions - API'de "questions" olarak geliyor (content değil)
#             questions = res.get("questions", []) or res.get("content", [])
#             for q in questions[:2]:
#                 # Question text - API'de "text" ve "originalText" var
#                 title = q.get("text") or q.get("originalText") or q.get("title") or q.get("question") or ""
#
#                 # Answer - API'de nested answer object var
#                 answer_obj = q.get("answer", {})
#                 if isinstance(answer_obj, dict):
#                     answer = answer_obj.get("text") or answer_obj.get("originalText") or ""
#                 else:
#                     answer = str(answer_obj) if answer_obj else ""
#
#                 # Topic - demo'da tag'ler var ama her soru için yok
#                 topic = q.get("topic") or q.get("category") or "Genel"
#                 summary["top_topics"][topic] = summary["top_topics"].get(topic, 0) + 1
#                 summary["sample"].append({"product_id": pid, "title": title[:120], "answer": answer[:160]})
#             time.sleep(0.01)
#
#         top_topics = sorted([{ "topic": k, "count": v } for k, v in summary["top_topics"].items()], key=lambda x: x["count"], reverse=True)[:30]
#         result = {"summary": {**summary, "top_topics": top_topics}}
#         questions_cache[cache_key] = result
#         return result
#     except Exception as e:
#         return {"error": str(e), "note": "Network or parsing issue", "summary": {}}


# DISABLED: Similar products feature removed per user request
# @app.get("/api/reports/{report_id}/similar-summary")
# def similar_summary(report_id: int, refresh: bool = False, db: Session = Depends(get_db)):
#     # Try persistent cache first
#     if not refresh:
#         persisted = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/similar.json")
#         if persisted:
#             return {"source": "file", **persisted}
#     cache_key = f"{report_id}"
#     if not refresh and cache_key in similar_cache:
#         return {"source": "cache", **similar_cache[cache_key]}
#
#     try:
#         all_products, _ = load_report_products(db, report_id)
#         product_ids = [p.get("id") for p in all_products if p.get("id")]
#         counter = {}
#         examples = []
#         for pid in product_ids:
#             data = fetch_similar_products(pid, page=0, page_size=8)
#             if not data:
#                 _log_enrichment_error(db, report_id=report_id, product_id=int(pid), merchant_id=None,
#                                       endpoint="similar", error_type="request_failed",
#                                       message="similar request failed or timed out")
#                 continue
#             res = data.get("result") or data
#             items = res.get("products") or res.get("items") or []
#             sim_ids = []
#             for it in items:
#                 sid = it.get("id") or it.get("productId")
#                 if sid:
#                     sidi = int(sid)
#                     sim_ids.append(sidi)
#                     counter[sidi] = counter.get(sidi, 0) + 1
#             if sim_ids:
#                 examples.append({"product_id": pid, "similar": sim_ids[:5]})
#             time.sleep(0.01)
#
#         top_similars = sorted([{ "product_id": k, "count": v } for k, v in counter.items()], key=lambda x: x["count"], reverse=True)[:50]
#         result = {"top_similar_products": top_similars, "examples": examples[:50]}
#         similar_cache[cache_key] = result
#         return result
#     except Exception as e:
#         return {"error": str(e), "note": "Network or parsing issue", "top_similar_products": []}


# DISABLED: Followers feature removed per user request
# @app.get("/api/reports/{report_id}/merchants/followers")
# def merchant_followers(report_id: int, refresh: bool = False, db: Session = Depends(get_db)):
#     # Try persistent cache first
#     if not refresh:
#         persisted = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/followers.json")
#         if persisted:
#             return {"source": "file", **persisted}
#     cache_key = f"{report_id}"
#     if not refresh and cache_key in followers_cache:
#         return {"source": "cache", **followers_cache[cache_key]}
#
#     try:
#         all_products, _ = load_report_products(db, report_id)
#         merchant_ids = []
#         for p in all_products:
#             merchant_listings = p.get("merchantListings", [])
#             if merchant_listings:
#                 merchant = merchant_listings[0].get("merchant", {})
#                 mid = merchant.get("id")
#                 if mid:
#                     merchant_ids.append(int(mid))
#         merchant_ids = sorted(list(set(merchant_ids)))
#
#         details = {}
#         for mid in merchant_ids:
#             data = fetch_merchant_followers(mid)
#             count = 0
#             if data:
#                 res = data.get("result") or data
#                 count = res.get("followerCount") or res.get("count") or 0
#             else:
#                 _log_enrichment_error(db, report_id=report_id, product_id=None, merchant_id=int(mid),
#                                       endpoint="followers", error_type="request_failed",
#                                       message="followers request failed or timed out")
#             details[mid] = {"followers": _safe_int(count)}
#             time.sleep(0.01)
#
#         # top merchants by followers
#         top_merchants = sorted([
#             {"merchant_id": mid, "followers": info["followers"]}
#             for mid, info in details.items()
#         ], key=lambda x: x["followers"], reverse=True)[:50]
#
#         result = {"total_merchants": len(merchant_ids), "details": details, "top_merchants": top_merchants}
#         followers_cache[cache_key] = result
#         return result
#     except Exception as e:
#         return {"error": str(e), "note": "Network or parsing issue", "details": {}, "top_merchants": []}


# ============================================================================
# ENRICHMENT MOTORU (Arka Plan Toplama + Kalıcı Cache)
# ============================================================================

# enrichment_progress already defined at line 343 as BoundedCache

def _enrich_build_product_info(all_products):
    info = {}
    for p in all_products:
        pid = p.get("id")
        if not pid:
            continue
        name = (p.get("name") or "Unknown")
        brand = p.get("brand", {}).get("name")
        display = f"{brand} - {name}" if brand else name
        info[int(pid)] = {"name": display[:120]}
    return info


def _enrich_report_task(report_id: int):
    import time
    db = SessionLocal()
    try:
        enrichment_progress[report_id] = {"status": "running", "step": "init", "done": 0, "total": 2}
        all_products, _ = load_report_products(db, report_id)
        product_ids = [p.get("id") for p in all_products if p.get("id")]
        product_info = _enrich_build_product_info(all_products)

        base_dir = f"{REPORTS_DIR}/enrich_{report_id}"
        _ensure_dir(base_dir)

        # DISABLED: Reviews feature removed per user request
        # 1) Reviews - REMOVED
        # enrichment_progress[report_id] = {"status": "running", "step": "reviews", "done": 0, "total": 2}
        # rev_payload = reviews_summary(report_id, refresh=True, db=db) or {}
        # _save_json(f"{base_dir}/reviews.json", rev_payload)
        # time.sleep(0.1)

        # 2) Social Proof
        enrichment_progress[report_id] = {"status": "running", "step": "social", "done": 0, "total": 1}
        soc_payload = social_proof(report_id, refresh=True, db=db) or {}
        # ürün isimlerini detaylara iliştir
        if soc_payload and soc_payload.get("details"):
            details = soc_payload["details"]
            enriched_details = {int(pid): {**vals, **product_info.get(int(pid), {})} for pid, vals in details.items()}
            soc_payload["details"] = enriched_details
        _save_json(f"{base_dir}/social.json", soc_payload)
        time.sleep(0.1)

        # DISABLED: Questions, similar products, and followers removed per user request
        # # 3) Questions
        # enrichment_progress[report_id] = {"status": "running", "step": "questions", "done": 2, "total": 5}
        # q_payload = questions_summary(report_id, refresh=True, db=db) or {}
        # _save_json(f"{base_dir}/questions.json", q_payload)
        # time.sleep(0.1)
        #
        # # 4) Similar
        # enrichment_progress[report_id] = {"status": "running", "step": "similar", "done": 3, "total": 5}
        # s_payload = similar_summary(report_id, refresh=True, db=db) or {}
        # _save_json(f"{base_dir}/similar.json", s_payload)
        # time.sleep(0.1)
        #
        # # 5) Followers
        # enrichment_progress[report_id] = {"status": "running", "step": "followers", "done": 4, "total": 5}
        # f_payload = merchant_followers(report_id, refresh=True, db=db) or {}
        # _save_json(f"{base_dir}/followers.json", f_payload)
        # time.sleep(0.1)

        enrichment_progress[report_id] = {"status": "completed", "step": "done", "done": 2, "total": 2}
    except Exception as e:
        enrichment_progress[report_id] = {"status": "error", "error": str(e)}
    finally:
        db.close()


@app.post("/api/reports/{report_id}/enrich/start")
def start_enrichment(report_id: int, background: BackgroundTasks):
    enrichment_progress[report_id] = {"status": "queued", "step": "queued"}
    background.add_task(_enrich_report_task, report_id)
    return {"status": "started", "report_id": report_id}


@app.get("/api/reports/{report_id}/enrich/status")
def enrichment_status(report_id: int):
    return enrichment_progress.get(report_id, {"status": "unknown"})


# ============================================================================
# HIDDEN CHAMPIONS ENDPOINT
# ============================================================================

@app.get("/api/reports/{report_id}/hidden-champions")
def get_hidden_champions(
    report_id: int,
    min_rating: float = 4.5,
    max_review_count: int = 50,
    social_multiplier: float = 1.5,
    min_score: int = 60,
    min_orders: int = 1,  # Minimum satış sayısı (satış verisi çok önemli)
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Gizli şampiyonları bul (özelleştirilmiş filtreler)
    Rating >= 4.5, Yorum < 50, Orders >= 1, Social Proof kategorinin 1.5 katı üzerinde
    """
    try:
        from analytics.champion_finder import HiddenChampionFinder
        
        all_products, categories_data = load_report_products(db, report_id)
        social_data = _load_json(f"{REPORTS_DIR}/enrich_{report_id}/social.json") or {}
        
        finder = HiddenChampionFinder()
        
        filters = {
            "min_rating": min_rating,
            "max_review_count": max_review_count,
            "social_multiplier": social_multiplier,
            "min_score": min_score,
            "min_orders": min_orders,  # Minimum satış kontrolü
            "limit": limit
        }
        
        # Sync olarak çalıştır
        result = finder.find(all_products, social_data, filters)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "total_found": 0,
            "hidden_champions": []
        }


# ============================================================================
# ANALYTICS TEST ENDPOINT
# ============================================================================

@app.get("/api/reports/{report_id}/test-analytics")
def test_analytics(report_id: int, db: Session = Depends(get_db)):
    """
    Test endpoint: HHI Index ve Risk Skoru hesaplama testi
    Mevcut bir raporun analytics metriklerini test eder
    """
    from analytics.metrics import (
        calculate_hhi_index,
        calculate_competition_score_from_hhi,
        get_rating_value,
        get_review_count
    )
    import os
    import json
    
    try:
        pass
        # 1. Raporu yükle
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # 2. Ürünleri yükle
        all_products, categories_data = load_report_products(db, report_id)
        
        if not all_products:
            return {
                "error": "No products found in report",
                "report_id": report_id,
                "report_name": report.name
            }
        
        # 3. HHI Index hesapla
        hhi_index = calculate_hhi_index(all_products)
        
        # 4. Rekabet skoru hesapla
        competition_score = calculate_competition_score_from_hhi(hhi_index)
        
        # 5. Marka dağılımı (Counter ile optimize edildi)
        from collections import Counter
        brand_names = [
            p.get("brand", {}).get("name", "Unknown")
            for p in all_products
            if p.get("brand", {}).get("name")
        ]
        brand_counts = Counter(brand_names)
        
        top_brands = brand_counts.most_common(10)
        
        # 6. Basit risk skoru (sadece rekabet bazlı)
        # Bu basit bir test, tam risk skoru için risk_analyzer.py gerekli
        risk_level = "DÜŞÜK" if competition_score >= 70 else "ORTA" if competition_score >= 50 else "YÜKSEK"
        
        # 7. Ek metrikler
        total_products = len(all_products)
        total_brands = len(brand_counts)
        
        # Ortalama rating
        ratings = [get_rating_value(p) for p in all_products if get_rating_value(p) > 0]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Ortalama fiyat
        prices = [
            p.get("price", {}).get("sellingPrice", 0)
            for p in all_products
            if p.get("price", {}).get("sellingPrice", 0) > 0
        ]
        avg_price = sum(prices) / len(prices) if prices else 0
        
        # 8. HHI yorumu ve stratejik tavsiye
        if hhi_index < 1500:
            hhi_comment = "Düşük konsantrasyon (rekabetçi pazar)"
            strategic_advice = "Marka sadakati yok, SEO ve doğru fiyatlama ile pazar payı kapma potansiyeli yüksek!"
            market_opportunity_score = round(100 - (hhi_index / 15), 2)
        elif hhi_index < 2500:
            hhi_comment = "Orta konsantrasyon"
            strategic_advice = "Orta seviye rekabet var, marka gücü ve fiyat stratejisi önemli."
            market_opportunity_score = round(70 - ((hhi_index - 1500) / 10), 2)
        else:
            hhi_comment = "Yüksek konsantrasyon (tekelci pazar)"
            strategic_advice = "Güçlü markalar hakim, giriş için yüksek yatırım gerekli."
            market_opportunity_score = round(max(0, 55 - ((hhi_index - 2500) / 50)), 2)
        
        # Top 10 marka toplam payı
        top_10_total_share = sum((count / total_products) * 100 for _, count in top_brands)
        
        # Stratejik yorum (HHI düşükse)
        if hhi_index < 100 and top_10_total_share < 20:
            strategic_advice = f"Marka sadakati yok, SEO ve doğru fiyatlama ile pazar payı kapma potansiyeli %{market_opportunity_score:.0f}!"
        
        return {
            "success": True,
            "report_id": report_id,
            "report_name": report.name,
            "metrics": {
                "total_products": total_products,
                "total_brands": total_brands,
                "avg_rating": round(avg_rating, 2),
                "avg_price": round(avg_price, 2)
            },
            "hhi_analysis": {
                "hhi_index": hhi_index,
                "comment": hhi_comment,
                "competition_score": round(competition_score, 2),
                "risk_level": risk_level,
                "strategic_advice": strategic_advice,
                "market_opportunity_score": market_opportunity_score,
                "top_10_market_share": round(top_10_total_share, 2)
            },
            "top_brands": [
                {
                    "brand": brand,
                    "product_count": count,
                    "market_share": round((count / total_products) * 100, 2)
                }
                for brand, count in top_brands
            ],
            "market_share_validation": {
                "top_10_total_share": round(sum((count / total_products) * 100 for _, count in top_brands), 2),
                "all_brands_total_share": 100.0,  # Doğrulama için
                "total_brands_count": total_brands
            },
            "test_result": {
                "hhi_calculated": hhi_index > 0,
                "competition_score_calculated": competition_score >= 0,
                "status": "✅ Test başarılı" if hhi_index > 0 and competition_score >= 0 else "❌ Test başarısız"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "report_id": report_id
        }


# ============================================================================
# GOOGLE TRENDS & TRAFFIC SOURCES ENDPOINTS
# ============================================================================

@app.get("/api/products/traffic-sources")
async def get_traffic_sources_bulk(product_names: str):
    """
    Get estimated traffic sources for multiple products

    Args:
        product_names: Comma-separated product names

    Returns:
        Dict with traffic source estimates for each product
    """
    try:
        # Split product names
        names_list = [name.strip() for name in product_names.split(',')]

        results = {}
        for product_name in names_list[:10]:  # Limit to 10 products at once
            if not product_name:
                continue

            # Use default social proof values (will be replaced with real data in frontend)
            traffic_data = estimate_traffic_sources(
                product_name=product_name,
                instagram_views=0,
                tiktok_views=0,
                twitter_shares=0
            )

            results[product_name] = traffic_data

        return {
            'success': True,
            'results': results,
            'total': len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/products/traffic-sources/estimate")
async def estimate_product_traffic_sources(request_data: dict):
    """
    Estimate traffic sources for a single product with social proof data

    Request Body:
        {
            "product_name": "Casio Edifice Kol Saati",
            "instagram_views": 10000,
            "tiktok_views": 5000,
            "twitter_shares": 500
        }

    Returns:
        Traffic source percentage distribution
    """
    try:
        product_name = request_data.get('product_name', '')
        instagram_views = request_data.get('instagram_views', 0)
        tiktok_views = request_data.get('tiktok_views', 0)
        twitter_shares = request_data.get('twitter_shares', 0)

        if not product_name:
            raise HTTPException(status_code=400, detail="product_name is required")

        # Estimate traffic sources
        traffic_data = estimate_traffic_sources(
            product_name=product_name,
            instagram_views=instagram_views,
            tiktok_views=tiktok_views,
            twitter_shares=twitter_shares
        )

        return {
            'success': True,
            'product_name': product_name,
            'traffic_sources': traffic_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/google-trends/test")
async def test_google_trends(product_name: str = "iPhone 15"):
    """
    Test endpoint for Google Trends API

    Args:
        product_name: Product name to search (default: iPhone 15)

    Returns:
        Google Trends data
    """
    try:
        trends_data = fetch_google_trends(product_name)

        return {
            'success': True,
            'product_name': product_name,
            'trends_data': trends_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
