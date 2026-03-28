"""
Category Seeder - Trendyol categories JSON'dan DB'ye aktarma
Kaynak: /Users/furkanyigit/Desktop/trendyol_categories.json
3 seviye hiyerarşi: Segment (Kadın) → Grup (Giyim) → Yaprak (Elbise)
"""
import json
import re
import os
from database import SessionLocal, Category, Snapshot, Report, EnrichmentError
from logging_config import get_logger

log = get_logger("seeder")

DEFAULT_JSON_PATH = os.path.expanduser("~/Desktop/trendyol_categories.json")


def parse_url(url: str) -> dict:
    """URL'den path_model ve trendyol_category_id çıkar.

    Örnekler:
        /elbise-x-c56           → path_model="elbise-x-c56",     category_id=56
        /kanvas-canta-y-s20972  → path_model="kanvas-canta-y-s20972", category_id=None
        /kadin-giyim-x-g1-c82  → path_model="kadin-giyim-x-g1-c82", category_id=82
    """
    # Strip leading slash
    path_model = url.lstrip("/")

    # Try to extract -c{id} from the end
    m = re.search(r"-c(\d+)$", path_model)
    category_id = int(m.group(1)) if m else None

    return {
        "path_model": path_model,
        "trendyol_category_id": category_id,
    }


def seed_from_json(json_path: str = None, clear_existing: bool = True) -> dict:
    """JSON dosyasını okuyup DB'ye yazar.

    Returns:
        {"segments": int, "groups": int, "leaves": int, "total": int}
    """
    json_path = json_path or DEFAULT_JSON_PATH

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    db = SessionLocal()
    try:
        if clear_existing:
            # FK constraint nedeniyle referans veren tabloları önce temizle
            db.query(EnrichmentError).delete(synchronize_session=False)
            db.query(Report).delete(synchronize_session=False)
            db.query(Snapshot).delete(synchronize_session=False)
            db.query(Category).filter(Category.parent_id != None).delete(synchronize_session=False)  # noqa: E711
            db.query(Category).delete(synchronize_session=False)
            db.commit()
            log.info("Mevcut kategoriler ve bağlı veriler silindi")

        stats = {"segments": 0, "groups": 0, "leaves": 0, "total": 0}

        for segment_name, groups in data.items():
            # Seviye 1: Segment (Kadın, Erkek, ...)
            segment = Category(
                name=segment_name,
                parent_id=None,
                trendyol_category_id=None,
                trendyol_url=None,
                path_model=None,
                is_active=True,
            )
            db.add(segment)
            db.flush()  # ID'yi al
            stats["segments"] += 1
            stats["total"] += 1

            for group_item in groups:
                group_name = group_item["name"]
                group_url = group_item.get("url", "")
                group_parsed = parse_url(group_url) if group_url else {"path_model": None, "trendyol_category_id": None}

                children = group_item.get("children", [])

                if children:
                    # Seviye 2: Grup (Giyim, Ayakkabı, ...)
                    group = Category(
                        name=group_name,
                        parent_id=segment.id,
                        trendyol_category_id=group_parsed["trendyol_category_id"],
                        trendyol_url=f"https://www.trendyol.com{group_url}" if group_url else None,
                        path_model=group_parsed["path_model"],
                        is_active=True,
                    )
                    db.add(group)
                    db.flush()
                    stats["groups"] += 1
                    stats["total"] += 1

                    for leaf_item in children:
                        leaf_url = leaf_item.get("url", "")
                        leaf_parsed = parse_url(leaf_url) if leaf_url else {"path_model": None, "trendyol_category_id": None}

                        leaf = Category(
                            name=leaf_item["name"],
                            parent_id=group.id,
                            trendyol_category_id=leaf_parsed["trendyol_category_id"],
                            trendyol_url=f"https://www.trendyol.com{leaf_url}" if leaf_url else None,
                            path_model=leaf_parsed["path_model"],
                            is_active=True,
                        )
                        db.add(leaf)
                        stats["leaves"] += 1
                        stats["total"] += 1
                else:
                    # Çocuğu yok — bu grup aslında yaprak
                    leaf = Category(
                        name=group_name,
                        parent_id=segment.id,
                        trendyol_category_id=group_parsed["trendyol_category_id"],
                        trendyol_url=f"https://www.trendyol.com{group_url}" if group_url else None,
                        path_model=group_parsed["path_model"],
                        is_active=True,
                    )
                    db.add(leaf)
                    stats["leaves"] += 1
                    stats["total"] += 1

        db.commit()
        log.info(f"Seed tamamlandı: {stats}")
        return stats

    except Exception as e:
        db.rollback()
        log.error(f"Seed hatası: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = seed_from_json()
    print(f"Seed tamamlandı: {result}")
