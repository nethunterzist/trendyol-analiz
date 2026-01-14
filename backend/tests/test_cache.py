"""
Test BoundedCache thread-safe cache with TTL
Priority: P1 (High) - Memory leak prevention
"""
import pytest
import time
from threading import Thread
from main import BoundedCache


class TestBoundedCache:
    """Test suite for BoundedCache class"""

    def test_basic_get_set(self):
        """Test basic cache get/set operations"""
        cache = BoundedCache(maxsize=3, ttl=10)

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

        # Non-existent key should return None
        assert cache.get("nonexistent") is None

    def test_lru_eviction_on_maxsize(self):
        """Test LRU eviction when maxsize is reached"""
        cache = BoundedCache(maxsize=3, ttl=10)

        # Add 3 items (at capacity)
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # Access key1 to make it most recently used
        cache.get("key1")

        # Add key4, should evict key2 (least recently used)
        cache.set("key4", "value4")

        assert cache.get("key1") == "value1"  # Still exists
        assert cache.get("key2") is None      # Evicted
        assert cache.get("key3") == "value3"  # Still exists
        assert cache.get("key4") == "value4"  # New item

    def test_ttl_expiration(self):
        """Test TTL expiration removes items after timeout"""
        cache = BoundedCache(maxsize=10, ttl=1)  # 1 second TTL

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

        # Wait for TTL to expire
        time.sleep(1.5)

        # Item should be expired and return None
        assert cache.get("key1") is None

    def test_ttl_expiration_with_timestamp_cleanup(self):
        """Test that expired items are removed from both cache and timestamps"""
        cache = BoundedCache(maxsize=10, ttl=1)

        cache.set("key1", "value1")
        cache.set("key2", "value2")

        # Wait for TTL to expire
        time.sleep(1.5)

        # Access expired key should return None and clean up
        assert cache.get("key1") is None

        # Verify timestamp was also cleaned up
        with cache.lock:
            assert "key1" not in cache.timestamps
            assert "key1" not in cache.cache

    def test_move_to_end_on_access(self):
        """Test that accessing a key moves it to end (most recent)"""
        cache = BoundedCache(maxsize=3, ttl=10)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # Access key1 multiple times (moves to end each time)
        cache.get("key1")
        cache.get("key1")

        # Add key4 (should evict key2, not key1)
        cache.set("key4", "value4")

        assert cache.get("key1") == "value1"  # Still exists (recently accessed)
        assert cache.get("key2") is None      # Evicted (least recently used)
        assert cache.get("key3") == "value3"  # Still exists
        assert cache.get("key4") == "value4"  # New item

    def test_update_existing_key(self):
        """Test updating existing key moves it to end"""
        cache = BoundedCache(maxsize=3, ttl=10)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # Update key1 (should move to end)
        cache.set("key1", "updated_value1")

        # Add key4 (should evict key2)
        cache.set("key4", "value4")

        assert cache.get("key1") == "updated_value1"  # Updated and still exists
        assert cache.get("key2") is None              # Evicted
        assert cache.get("key3") == "value3"          # Still exists
        assert cache.get("key4") == "value4"          # New item

    def test_thread_safety_concurrent_writes(self):
        """Test thread safety with concurrent write operations"""
        cache = BoundedCache(maxsize=100, ttl=10)
        errors = []

        def writer(thread_id):
            try:
                for i in range(100):
                    cache.set(f"key_{thread_id}_{i}", f"value_{thread_id}_{i}")
            except Exception as e:
                errors.append(e)

        # Create 10 writer threads
        threads = []
        for i in range(10):
            thread = Thread(target=writer, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # No errors should occur
        assert len(errors) == 0, f"Thread safety errors: {errors}"

    def test_thread_safety_concurrent_reads(self):
        """Test thread safety with concurrent read operations"""
        cache = BoundedCache(maxsize=100, ttl=10)
        errors = []

        # Pre-populate cache
        for i in range(50):
            cache.set(f"key_{i}", f"value_{i}")

        def reader(thread_id):
            try:
                for i in range(50):
                    value = cache.get(f"key_{i}")
                    if value is not None:
                        assert value == f"value_{i}"
            except Exception as e:
                errors.append(e)

        # Create 10 reader threads
        threads = []
        for i in range(10):
            thread = Thread(target=reader, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # No errors should occur
        assert len(errors) == 0, f"Thread safety errors: {errors}"

    def test_thread_safety_mixed_operations(self):
        """Test thread safety with mixed read/write operations"""
        cache = BoundedCache(maxsize=100, ttl=10)
        errors = []

        def mixed_operations(thread_id):
            try:
                for i in range(50):
                    # Write
                    cache.set(f"key_{thread_id}_{i}", f"value_{thread_id}_{i}")

                    # Read
                    value = cache.get(f"key_{thread_id}_{i}")
                    if value is not None:
                        assert value == f"value_{thread_id}_{i}"
            except Exception as e:
                errors.append(e)

        # Create 10 threads with mixed operations
        threads = []
        for i in range(10):
            thread = Thread(target=mixed_operations, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # No errors should occur
        assert len(errors) == 0, f"Thread safety errors: {errors}"

    def test_cache_size_limit_enforcement(self):
        """Test that cache never exceeds maxsize"""
        cache = BoundedCache(maxsize=10, ttl=10)

        # Add 20 items (double the maxsize)
        for i in range(20):
            cache.set(f"key_{i}", f"value_{i}")

        # Verify cache size is at most maxsize
        with cache.lock:
            assert len(cache.cache) <= 10

    def test_empty_cache(self):
        """Test operations on empty cache"""
        cache = BoundedCache(maxsize=10, ttl=10)

        # Get from empty cache
        assert cache.get("any_key") is None

    def test_single_item_cache(self):
        """Test cache with maxsize=1"""
        cache = BoundedCache(maxsize=1, ttl=10)

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

        # Add another item (should evict key1)
        cache.set("key2", "value2")
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"

    def test_zero_ttl_behavior(self):
        """Test cache behavior with very short TTL"""
        cache = BoundedCache(maxsize=10, ttl=0.1)  # 100ms TTL

        cache.set("key1", "value1")

        # Immediately accessible
        assert cache.get("key1") == "value1"

        # Wait for expiration
        time.sleep(0.2)

        # Should be expired
        assert cache.get("key1") is None

    def test_large_value_storage(self):
        """Test storing large values in cache"""
        cache = BoundedCache(maxsize=5, ttl=10)

        # Store large string
        large_value = "x" * 10000
        cache.set("large_key", large_value)

        assert cache.get("large_key") == large_value

    def test_special_characters_in_keys(self):
        """Test cache with special characters in keys"""
        cache = BoundedCache(maxsize=10, ttl=10)

        special_keys = [
            "key/with/slashes",
            "key:with:colons",
            "key.with.dots",
            "key with spaces",
            "key-with-dashes"
        ]

        for key in special_keys:
            cache.set(key, f"value_{key}")
            assert cache.get(key) == f"value_{key}"

    def test_none_value_storage(self):
        """Test storing None as a value (should be allowed)"""
        cache = BoundedCache(maxsize=10, ttl=10)

        cache.set("null_key", None)

        # get() returns None for missing keys, so we need to check differently
        # In this implementation, storing None is allowed but indistinguishable from missing key
        # This is a design consideration - document this behavior
        result = cache.get("null_key")
        # This test documents current behavior: None values are stored but return None
        assert result is None

    def test_timestamp_tracking(self):
        """Test that timestamps are correctly tracked"""
        cache = BoundedCache(maxsize=10, ttl=10)

        before_time = time.time()
        cache.set("key1", "value1")
        after_time = time.time()

        with cache.lock:
            timestamp = cache.timestamps.get("key1")
            assert timestamp is not None
            assert before_time <= timestamp <= after_time
