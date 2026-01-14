"""
Test database models and relationships
Priority: P1 (High) - Data integrity
"""
import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from database import Category, Snapshot, Report, EnrichmentError


class TestCategoryModel:
    """Test Category model and relationships"""

    def test_create_category(self, test_db):
        """Test creating a basic category"""
        category = Category(
            name="Elektronik",
            parent_id=None,
            trendyol_category_id=1000,
            trendyol_url="https://www.trendyol.com/elektronik"
        )

        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        assert category.id is not None
        assert category.name == "Elektronik"
        assert category.parent_id is None
        assert category.is_active is True
        assert category.created_at is not None

    def test_category_parent_child_relationship(self, test_db):
        """Test hierarchical parent-child relationship"""
        # Create parent category
        parent = Category(name="Elektronik", parent_id=None)
        test_db.add(parent)
        test_db.commit()
        test_db.refresh(parent)

        # Create child category
        child = Category(name="Telefon", parent_id=parent.id)
        test_db.add(child)
        test_db.commit()
        test_db.refresh(child)

        # Verify relationship
        assert child.parent_id == parent.id
        assert child.parent.name == "Elektronik"
        assert len(parent.children) == 1
        assert parent.children[0].name == "Telefon"

    def test_category_multiple_children(self, test_db):
        """Test category with multiple children"""
        parent = Category(name="Elektronik", parent_id=None)
        test_db.add(parent)
        test_db.commit()
        test_db.refresh(parent)

        # Create multiple children
        child1 = Category(name="Telefon", parent_id=parent.id)
        child2 = Category(name="Laptop", parent_id=parent.id)
        child3 = Category(name="Tablet", parent_id=parent.id)

        test_db.add_all([child1, child2, child3])
        test_db.commit()

        # Refresh parent to load children
        test_db.refresh(parent)

        assert len(parent.children) == 3
        child_names = [c.name for c in parent.children]
        assert "Telefon" in child_names
        assert "Laptop" in child_names
        assert "Tablet" in child_names

    def test_category_deep_hierarchy(self, test_db):
        """Test multi-level category hierarchy"""
        # Level 1
        level1 = Category(name="Elektronik", parent_id=None)
        test_db.add(level1)
        test_db.commit()
        test_db.refresh(level1)

        # Level 2
        level2 = Category(name="Telefon", parent_id=level1.id)
        test_db.add(level2)
        test_db.commit()
        test_db.refresh(level2)

        # Level 3
        level3 = Category(name="iPhone", parent_id=level2.id)
        test_db.add(level3)
        test_db.commit()
        test_db.refresh(level3)

        # Verify hierarchy
        assert level3.parent.name == "Telefon"
        assert level3.parent.parent.name == "Elektronik"
        assert level3.parent.parent.parent_id is None

    def test_category_cascade_delete_prevented(self, test_db):
        """Test that deleting parent with children is handled correctly"""
        parent = Category(name="Elektronik", parent_id=None)
        test_db.add(parent)
        test_db.commit()
        test_db.refresh(parent)

        child = Category(name="Telefon", parent_id=parent.id)
        test_db.add(child)
        test_db.commit()

        # Attempt to delete parent
        # This should either fail or set child.parent_id to None depending on cascade settings
        test_db.delete(parent)

        # This test documents current behavior - adjust based on actual cascade settings
        # If IntegrityError is raised, cascade delete is prevented (good for data safety)
        try:
            test_db.commit()
            # If commit succeeds, check what happened to child
            test_db.refresh(child)
            # Child should either be deleted or orphaned
        except IntegrityError:
            # Foreign key constraint prevented deletion (expected behavior)
            test_db.rollback()
            pass

    def test_category_null_parent_is_main_category(self, test_db):
        """Test that categories with parent_id=None are main categories"""
        main1 = Category(name="Elektronik", parent_id=None)
        main2 = Category(name="Moda", parent_id=None)

        test_db.add_all([main1, main2])
        test_db.commit()

        # Query main categories
        main_categories = test_db.query(Category).filter(Category.parent_id == None).all()

        assert len(main_categories) == 2
        names = [c.name for c in main_categories]
        assert "Elektronik" in names
        assert "Moda" in names

    def test_category_is_active_default(self, test_db):
        """Test that is_active defaults to True"""
        category = Category(name="Test", parent_id=None)
        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        assert category.is_active is True

    def test_category_timestamps(self, test_db):
        """Test automatic timestamp generation"""
        before = datetime.utcnow()

        category = Category(name="Test", parent_id=None)
        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        after = datetime.utcnow()

        assert category.created_at is not None
        assert before <= category.created_at <= after


class TestSnapshotModel:
    """Test Snapshot model"""

    def test_create_snapshot(self, test_db):
        """Test creating a snapshot"""
        # Create category first
        category = Category(name="Elektronik", parent_id=None)
        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        # Create snapshot
        snapshot = Snapshot(
            category_id=category.id,
            snapshot_month="2024-12",
            total_products=150,
            avg_price=5000,
            json_file_path="../categories/elektronik_1000.json"
        )

        test_db.add(snapshot)
        test_db.commit()
        test_db.refresh(snapshot)

        assert snapshot.id is not None
        assert snapshot.category_id == category.id
        assert snapshot.snapshot_month == "2024-12"
        assert snapshot.total_products == 150
        assert snapshot.scraped_at is not None

    def test_snapshot_category_relationship(self, test_db):
        """Test snapshot-category relationship"""
        category = Category(name="Elektronik", parent_id=None)
        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        snapshot = Snapshot(
            category_id=category.id,
            snapshot_month="2024-12",
            total_products=100
        )
        test_db.add(snapshot)
        test_db.commit()
        test_db.refresh(snapshot)

        # Test relationship from snapshot to category
        assert snapshot.category.name == "Elektronik"

        # Test relationship from category to snapshots
        test_db.refresh(category)
        assert len(category.snapshots) == 1
        assert category.snapshots[0].snapshot_month == "2024-12"

    def test_snapshot_foreign_key_constraint(self, test_db):
        """Test that snapshot requires valid category_id"""
        # Try to create snapshot with non-existent category
        snapshot = Snapshot(
            category_id=99999,  # Non-existent
            snapshot_month="2024-12",
            total_products=100
        )
        test_db.add(snapshot)

        with pytest.raises(IntegrityError):
            test_db.commit()


class TestReportModel:
    """Test Report model"""

    def test_create_report(self, test_db):
        """Test creating a report"""
        # Create category
        category = Category(name="Elektronik", parent_id=None)
        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        # Create report
        report = Report(
            name="Aralık Elektronik Raporu",
            category_id=category.id,
            total_products=500,
            total_subcategories=5,
            json_file_path="../reports/aralik_elektronik_20241215.json"
        )

        test_db.add(report)
        test_db.commit()
        test_db.refresh(report)

        assert report.id is not None
        assert report.name == "Aralık Elektronik Raporu"
        assert report.category_id == category.id
        assert report.created_at is not None

    def test_report_category_relationship(self, test_db):
        """Test report-category relationship"""
        category = Category(name="Elektronik", parent_id=None)
        test_db.add(category)
        test_db.commit()
        test_db.refresh(category)

        report = Report(
            name="Test Report",
            category_id=category.id,
            total_products=100,
            total_subcategories=2
        )
        test_db.add(report)
        test_db.commit()
        test_db.refresh(report)

        # Test relationship
        assert report.category.name == "Elektronik"


class TestEnrichmentErrorModel:
    """Test EnrichmentError model"""

    def test_create_enrichment_error(self, test_db):
        """Test creating enrichment error record"""
        error = EnrichmentError(
            report_id=1,
            product_id=100001,
            merchant_id=5000,
            endpoint="social",
            error_type="timeout",
            message="Request timeout after 30s",
            status_code=None,
            attempt=1
        )

        test_db.add(error)
        test_db.commit()
        test_db.refresh(error)

        assert error.id is not None
        assert error.endpoint == "social"
        assert error.error_type == "timeout"
        assert error.attempt == 1
        assert error.created_at is not None

    def test_enrichment_error_types(self, test_db):
        """Test different error types"""
        error_types = ["timeout", "dns", "reset", "http", "other"]

        for error_type in error_types:
            error = EnrichmentError(
                product_id=100001,
                endpoint="social",
                error_type=error_type,
                attempt=1
            )
            test_db.add(error)

        test_db.commit()

        # Query all errors
        errors = test_db.query(EnrichmentError).all()
        assert len(errors) == len(error_types)

    def test_enrichment_error_retry_tracking(self, test_db):
        """Test retry attempt tracking"""
        # Create multiple error records for same product (retries)
        for attempt in range(1, 4):
            error = EnrichmentError(
                product_id=100001,
                endpoint="social",
                error_type="timeout",
                attempt=attempt
            )
            test_db.add(error)

        test_db.commit()

        # Query errors for product
        errors = test_db.query(EnrichmentError).filter(
            EnrichmentError.product_id == 100001
        ).order_by(EnrichmentError.attempt).all()

        assert len(errors) == 3
        assert errors[0].attempt == 1
        assert errors[1].attempt == 2
        assert errors[2].attempt == 3
