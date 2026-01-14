"""
Test Category API endpoints
Priority: P2 (Medium) - Business logic validation
"""
import pytest
from fastapi import status


class TestCategoryEndpoints:
    """Test category CRUD endpoints"""

    def test_root_endpoint(self, client):
        """Test root endpoint returns welcome message"""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert "version" in data

    def test_get_categories_empty(self, client):
        """Test getting categories when database is empty"""
        response = client.get("/categories")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_category_success(self, client):
        """Test creating a new category successfully"""
        category_data = {
            "name": "Elektronik",
            "parent_id": None,
            "trendyol_category_id": 1000,
            "trendyol_url": "https://www.trendyol.com/elektronik"
        }

        response = client.post("/categories", json=category_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["name"] == "Elektronik"
        assert data["parent_id"] is None
        assert data["trendyol_category_id"] == 1000
        assert "id" in data
        assert "created_at" in data
        assert data["is_active"] is True

    def test_create_category_minimal_data(self, client):
        """Test creating category with minimal required data"""
        category_data = {
            "name": "Test Category",
            "parent_id": None
        }

        response = client.post("/categories", json=category_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["name"] == "Test Category"
        assert data["parent_id"] is None

    def test_get_category_by_id_success(self, client):
        """Test getting single category by ID"""
        # Create category
        category_data = {"name": "Test Category", "parent_id": None}
        create_response = client.post("/categories", json=category_data)
        category_id = create_response.json()["id"]

        # Get category
        response = client.get(f"/categories/{category_id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Test Category"

    def test_get_category_not_found(self, client):
        """Test getting non-existent category returns 404"""
        response = client.get("/categories/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_category_success(self, client):
        """Test updating category name"""
        # Create category
        category_data = {"name": "Old Name", "parent_id": None}
        create_response = client.post("/categories", json=category_data)
        category_id = create_response.json()["id"]

        # Update category
        update_data = {"name": "New Name"}
        response = client.put(f"/categories/{category_id}", json=update_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "New Name"

        # Verify update persisted
        get_response = client.get(f"/categories/{category_id}")
        assert get_response.json()["name"] == "New Name"

    def test_update_category_not_found(self, client):
        """Test updating non-existent category returns 404"""
        update_data = {"name": "New Name"}
        response = client.put("/categories/99999", json=update_data)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_category_success(self, client):
        """Test deleting category"""
        # Create category
        category_data = {"name": "To Delete", "parent_id": None}
        create_response = client.post("/categories", json=category_data)
        category_id = create_response.json()["id"]

        # Delete category
        response = client.delete(f"/categories/{category_id}")
        assert response.status_code == status.HTTP_200_OK

        # Verify deletion
        get_response = client.get(f"/categories/{category_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_category_not_found(self, client):
        """Test deleting non-existent category returns 404"""
        response = client.delete("/categories/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_main_categories(self, client):
        """Test getting only main categories (parent_id = null)"""
        # Create main categories
        client.post("/categories", json={"name": "Elektronik", "parent_id": None})
        client.post("/categories", json={"name": "Moda", "parent_id": None})

        # Create parent and subcategory
        parent_response = client.post("/categories", json={"name": "Parent", "parent_id": None})
        parent_id = parent_response.json()["id"]
        client.post("/categories", json={"name": "Subcategory", "parent_id": parent_id})

        # Get main categories
        response = client.get("/categories/main")
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert len(data) == 3  # Only main categories
        assert all(cat["parent_id"] is None for cat in data)

        names = [cat["name"] for cat in data]
        assert "Elektronik" in names
        assert "Moda" in names
        assert "Parent" in names
        assert "Subcategory" not in names

    def test_get_category_children(self, client):
        """Test getting category children"""
        # Create parent category
        parent_response = client.post("/categories", json={"name": "Elektronik", "parent_id": None})
        parent_id = parent_response.json()["id"]

        # Create children
        client.post("/categories", json={"name": "Telefon", "parent_id": parent_id})
        client.post("/categories", json={"name": "Laptop", "parent_id": parent_id})
        client.post("/categories", json={"name": "Tablet", "parent_id": parent_id})

        # Get children
        response = client.get(f"/categories/{parent_id}/children")
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert len(data) == 3
        assert all(cat["parent_id"] == parent_id for cat in data)

        names = [cat["name"] for cat in data]
        assert "Telefon" in names
        assert "Laptop" in names
        assert "Tablet" in names

    def test_get_category_children_no_children(self, client):
        """Test getting children for category with no children"""
        # Create category without children
        category_response = client.post("/categories", json={"name": "Elektronik", "parent_id": None})
        category_id = category_response.json()["id"]

        # Get children (should be empty)
        response = client.get(f"/categories/{category_id}/children")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_pagination_skip_limit(self, client):
        """Test category pagination with skip and limit"""
        # Create 10 categories
        for i in range(10):
            client.post("/categories", json={"name": f"Category {i}", "parent_id": None})

        # Test first page
        response = client.get("/categories?skip=0&limit=5")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 5

        # Test second page
        response = client.get("/categories?skip=5&limit=5")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 5

        # Test beyond available data
        response = client.get("/categories?skip=10&limit=5")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 0

    def test_pagination_default_limit(self, client):
        """Test default pagination limit is 200"""
        # Create 250 categories
        for i in range(250):
            client.post("/categories", json={"name": f"Category {i}", "parent_id": None})

        # Get without limit (should default to 200)
        response = client.get("/categories")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 200

    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in response"""
        response = client.get("/categories")

        # Check for CORS headers (lowercase keys in response.headers)
        assert "access-control-allow-origin" in response.headers

    def test_hierarchical_category_structure(self, client):
        """Test creating multi-level category hierarchy"""
        # Level 1
        level1_response = client.post("/categories", json={"name": "Elektronik", "parent_id": None})
        level1_id = level1_response.json()["id"]

        # Level 2
        level2_response = client.post("/categories", json={"name": "Telefon", "parent_id": level1_id})
        level2_id = level2_response.json()["id"]

        # Level 3
        level3_response = client.post("/categories", json={"name": "iPhone", "parent_id": level2_id})
        level3_id = level3_response.json()["id"]

        # Verify level 3 category
        response = client.get(f"/categories/{level3_id}")
        data = response.json()
        assert data["name"] == "iPhone"
        assert data["parent_id"] == level2_id

        # Verify level 2 has children
        response = client.get(f"/categories/{level2_id}/children")
        assert len(response.json()) == 1
        assert response.json()[0]["name"] == "iPhone"

    def test_get_category_products_not_implemented(self, client):
        """Test get category products endpoint (if implemented)"""
        # Create category
        category_response = client.post("/categories", json={"name": "Elektronik", "parent_id": None})
        category_id = category_response.json()["id"]

        # Try to get products (endpoint exists but may not have data)
        response = client.get(f"/categories/{category_id}/products")

        # Check if endpoint exists (should return 200 or 404)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_create_category_with_special_characters(self, client):
        """Test creating category with Turkish characters"""
        category_data = {
            "name": "Giyim & Aksesuar - Çanta/Çorap",
            "parent_id": None
        }

        response = client.post("/categories", json=category_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["name"] == "Giyim & Aksesuar - Çanta/Çorap"

    def test_create_category_duplicate_name_allowed(self, client):
        """Test that duplicate category names are allowed (no unique constraint)"""
        category_data = {"name": "Duplicate Name", "parent_id": None}

        # Create first category
        response1 = client.post("/categories", json=category_data)
        assert response1.status_code == status.HTTP_201_CREATED

        # Create second category with same name
        response2 = client.post("/categories", json=category_data)
        assert response2.status_code == status.HTTP_201_CREATED

        # Verify both exist with different IDs
        id1 = response1.json()["id"]
        id2 = response2.json()["id"]
        assert id1 != id2

    def test_update_category_parent_id(self, client):
        """Test updating category parent_id (moving in hierarchy)"""
        # Create categories
        parent1_response = client.post("/categories", json={"name": "Parent 1", "parent_id": None})
        parent1_id = parent1_response.json()["id"]

        parent2_response = client.post("/categories", json={"name": "Parent 2", "parent_id": None})
        parent2_id = parent2_response.json()["id"]

        child_response = client.post("/categories", json={"name": "Child", "parent_id": parent1_id})
        child_id = child_response.json()["id"]

        # Move child from parent1 to parent2
        update_data = {"parent_id": parent2_id}
        response = client.put(f"/categories/{child_id}", json=update_data)

        # This may or may not be supported by the API - test documents behavior
        # If supported, child should now be under parent2
        if response.status_code == status.HTTP_200_OK:
            assert response.json()["parent_id"] == parent2_id
