"""
Pytest configuration and shared fixtures for backend tests
"""
import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, Category, Report, Snapshot
from main import app, get_db
from fastapi.testclient import TestClient


# Create test database
TEST_DATABASE_URL = "sqlite:///./test_trendyol.db"


@pytest.fixture(scope="function")
def test_engine():
    """Create test database engine for each test"""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

    # Clean up test database file
    if os.path.exists("test_trendyol.db"):
        os.remove("test_trendyol.db")


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create test database session for each test"""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(test_db):
    """Create FastAPI test client with test database"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    # Clean up override
    app.dependency_overrides.clear()


# Sample test data fixtures
@pytest.fixture
def sample_categories():
    """Sample category hierarchy for testing"""
    return [
        {
            "name": "Elektronik",
            "parent_id": None,
            "trendyol_category_id": 1000,
            "trendyol_url": "https://www.trendyol.com/elektronik"
        },
        {
            "name": "Telefon",
            "parent_id": 1,  # Will be updated after parent creation
            "trendyol_category_id": 1001,
            "trendyol_url": "https://www.trendyol.com/telefon"
        },
        {
            "name": "Laptop",
            "parent_id": 1,  # Will be updated after parent creation
            "trendyol_category_id": 1002,
            "trendyol_url": "https://www.trendyol.com/laptop"
        }
    ]


@pytest.fixture
def sample_products():
    """Sample product data for testing"""
    return [
        {
            "id": 100001,
            "name": "iPhone 15 Pro Max 256GB",
            "price": 45000,
            "brand": "Apple",
            "category": "Telefon",
            "rating": 4.5,
            "totalReviews": 1200,
            "imageUrl": "https://example.com/iphone.jpg"
        },
        {
            "id": 100002,
            "name": "MacBook Pro M3 14-inch",
            "price": 75000,
            "brand": "Apple",
            "category": "Laptop",
            "rating": 4.8,
            "totalReviews": 850,
            "imageUrl": "https://example.com/macbook.jpg"
        }
    ]


@pytest.fixture
def mock_trendyol_api_response():
    """Mock Trendyol API response for scraper tests"""
    return {
        "isSuccess": True,
        "totalCount": 50,
        "products": [
            {
                "id": 100001,
                "name": "Test Product 1",
                "price": 1000,
                "brand": "Test Brand",
                "rating": 4.5,
                "totalReviews": 100
            },
            {
                "id": 100002,
                "name": "Test Product 2",
                "price": 2000,
                "brand": "Test Brand 2",
                "rating": 4.0,
                "totalReviews": 50
            }
        ]
    }


@pytest.fixture
def mock_social_proof_response():
    """Mock social proof API response"""
    return {
        "result": {
            "100001": {
                "favoriteCount": "1.2B",
                "orderCount": "500B",
                "viewCount": "5.3M",
                "wishlistCount": "800B"
            },
            "100002": {
                "favoriteCount": "800B",
                "orderCount": "300B",
                "viewCount": "3.1M",
                "wishlistCount": "500B"
            }
        }
    }
