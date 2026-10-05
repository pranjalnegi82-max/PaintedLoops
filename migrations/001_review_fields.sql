-- Run once against an existing database after taking a backup.
-- Skip a column addition if that column already exists in the live database.
ALTER TABLE reviews ADD COLUMN photo_url VARCHAR(500) NULL;
ALTER TABLE reviews ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE products p SET rating=COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id=p.id AND r.is_approved=1),0), review_count=(SELECT COUNT(*) FROM reviews r WHERE r.product_id=p.id AND r.is_approved=1);
