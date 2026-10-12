-- PaintedLoops: FIRST-TIME setup for an EMPTY Aiven defaultdb.
-- Run once, with Workbench 'Stop Script Execution On Errors' enabled.
-- Contains no DROP/TRUNCATE, preset accounts, or customer/order data.
-- Existing repository prices and stock are carried over, not independently verified.
-- Old discounts, badges and fabricated review totals are omitted.
-- If any error occurs: ROLLBACK; then inspect the error before retrying.
-- MySQL DDL auto-commits; this script is not a migration for existing tables.
USE defaultdb;
SET NAMES utf8mb4;

-- ─── USERS ───────────────────────────────────
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('customer','admin') DEFAULT 'customer',
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ADDRESSES ───────────────────────────────
CREATE TABLE addresses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  pin_code      VARCHAR(10)  NOT NULL,
  address_type  ENUM('home','work','other') DEFAULT 'home',
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CATEGORIES ──────────────────────────────
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url   VARCHAR(500),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PRODUCTS ────────────────────────────────
CREATE TABLE products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  category_id  INT NOT NULL,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(200) NOT NULL UNIQUE,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL CHECK (price > 0),
  old_price    DECIMAL(10,2),
  stock        INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url    VARCHAR(500),
  images       JSON,
  badge        VARCHAR(50),
  is_active    BOOLEAN DEFAULT TRUE,
  rating       DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── WISHLIST ────────────────────────────────
CREATE TABLE wishlist (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wishlist (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ORDERS ──────────────────────────────────
CREATE TABLE orders (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  order_number        VARCHAR(20)  NOT NULL UNIQUE,
  user_id             INT NOT NULL,
  address_id          INT,
  subtotal            DECIMAL(10,2) NOT NULL,
  shipping_charge     DECIMAL(10,2) DEFAULT 50.00,
  total_amount        DECIMAL(10,2) NOT NULL,
  status              ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded') DEFAULT 'pending',
  payment_method      ENUM('card','upi','netbanking','cod','phonepe','gpay') NOT NULL,
  payment_status      ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  razorpay_order_id   VARCHAR(200),
  razorpay_payment_id VARCHAR(200),
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (address_id) REFERENCES addresses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ORDER ITEMS ─────────────────────────────
CREATE TABLE order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  product_id   INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  price        DECIMAL(10,2) NOT NULL CHECK (price > 0),
  quantity     INT NOT NULL CHECK (quantity > 0),
  subtotal     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REVIEWS ─────────────────────────────────
CREATE TABLE reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  user_id     INT NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  photo_url   VARCHAR(500),
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_review (product_id, user_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ════════════════════════════════════════════
--   SEED DATA
-- ════════════════════════════════════════════

-- Create your own account through the website; no preset login is seeded.

-- ─── CATEGORIES ──────────────────────────────
START TRANSACTION;
INSERT INTO categories (name, slug, description) VALUES
('Hair Accessories',    'hair-accessories',    'Handmade crochet hair clips, bows, and garlands'),
('Crochet Flowers',     'crochet-flowers',     'Beautiful handcrafted crochet flower stems and bouquets'),
('Bags & Purses',       'bags-purses',         'Handmade crochet bags, purses, and berets'),
('Keychains',           'keychains',           'Cute crochet keychains and accessories'),
('Bookmarks',           'bookmarks',           'Handmade crochet bookmarks'),
('Amigurumi',           'amigurumi',           'Handmade crochet character keychains and amigurumi figures'),
('Aipan Art',            'aipan-art',            'Original handcrafted paintings and framed wall art'),
('Painted Keychains',   'painted-keychains',   'Handpainted wooden keychains — pop culture, anime, and cute characters');

-- ─── PRODUCTS: HAIR ACCESSORIES (cat 1) ──────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(1, 'Lavender Crochet Bow Clip',       'lavender-crochet-bow-clip',       'Beautiful handmade lavender bow hair clip, perfect for all hair types.',               99.00, NULL, 50, NULL, 0.00, 0),
(1, 'Pastel Bow Hair Pin',             'pastel-bow-hair-pin',             'Soft pastel crochet bow pin, lightweight and adorable.',                               89.00, NULL, 40, NULL, 0.00, 0),
(1, 'Red Flower Hair Clips (Pair)',    'red-flower-hair-clips-pair',      'A pair of vibrant red crochet flower hair clips with pearl center.',                   79.00, NULL, 60, NULL, 0.00, 0),
(1, 'White Daisy Hair Pins',           'white-daisy-hair-pins',           'Delicate white daisy crochet hair pins, great for everyday wear.',                     79.00, NULL, 45, NULL, 0.00, 0),
(1, 'Crochet Flower Hair Garland',     'crochet-flower-hair-garland',     'Long flowing crochet flower garland for hair, perfect for events.',                   199.00, NULL, 20, NULL, 0.00, 0),
(1, 'Floral Hair Chain',               'floral-hair-chain',               'Elegant floral hair chain for bridal and festive looks.',                             179.00, NULL, 25, NULL, 0.00, 0),
(1, 'Red Butterfly Hair Clip',         'red-butterfly-hair-clip',         'Adorable red and white crochet butterfly hair clip.',                                  99.00, NULL, 35, NULL, 0.00, 0),
(1, 'Crochet Bun Scrunchie',           'crochet-bun-scrunchie',           'Stylish patterned crochet scrunchie for a bun hairstyle.',                            119.00, NULL, 30, NULL, 0.00, 0);

-- ─── PRODUCTS: CROCHET FLOWERS (cat 2) ───────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(2, 'Crochet Rose Stems (Set of 2)',   'crochet-rose-stems-set-2',        'A pair of handmade red crochet roses on stems — a perfect gift.',                    149.00, NULL, 30, NULL, 0.00, 0),
(2, 'Daisy Flower Sticks (Set of 2)', 'daisy-flower-sticks-set-2',       'Two white daisy crochet flowers on green stems.',                                     129.00, NULL, 35, NULL, 0.00, 0),
(2, 'Mixed Flower Bouquet',           'mixed-flower-bouquet',            'A vibrant bouquet of crochet sunflower, daisy, and rose.',                            299.00, NULL, 15, NULL, 0.00, 0),
(2, 'Sunflower & Daisy Pair',         'sunflower-daisy-pair',            'Two bright crochet flowers — sunflower and daisy on stems.',                          169.00, NULL, 25, NULL, 0.00, 0);

-- ─── PRODUCTS: BAGS & PURSES (cat 3) ─────────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(3, 'Maroon Crochet Coin Purse',      'maroon-crochet-coin-purse',       'Compact and stylish maroon crochet coin purse with clasp.',                           249.00, NULL, 20, NULL, 0.00, 0),
(3, 'Maroon Crochet Beret',           'maroon-crochet-beret',            'Warm and trendy maroon crochet beret, one size fits most.',                           349.00, NULL, 15, NULL, 0.00, 0),
(3, 'Beret with Sunglass Pocket',     'beret-with-sunglass-pocket',      'Unique maroon beret with built-in sunglass pocket.',                                  399.00, NULL, 10, NULL, 0.00, 0);

-- ─── PRODUCTS: KEYCHAINS (cat 4) ─────────────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(4, 'Daisy Crochet Keychain',         'daisy-crochet-keychain',          'Cute white daisy crochet keychain with pearl bead chain.',                             79.00, NULL, 80, NULL, 0.00, 0),
(4, 'Evil Eye Crochet Keychain',      'evil-eye-crochet-keychain',       'Ward off bad vibes! Handmade crochet evil eye keychain with blue-white tassel.',       79.00, NULL, 50, NULL, 0.00, 0),
(4, 'Evil Eye TWS Cover',             'evil-eye-tws-cover',              'Handmade crochet evil eye cover for AirPods / TWS cases. Bold royal blue.',            99.00, NULL, 30, NULL, 0.00, 0);

-- ─── PRODUCTS: BOOKMARKS (cat 5) ─────────────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(5, 'Sunflower Bookmark',             'sunflower-bookmark',              'Handmade crochet sunflower bookmark with green stem.',                                  59.00, NULL, 50, NULL, 0.00, 0),
(5, 'Daisy Bookmark with Stem',       'daisy-bookmark-with-stem',        'Charming white daisy crochet bookmark, a bookworm gift.',                               59.00, NULL, 45, NULL, 0.00, 0);

-- ─── PRODUCTS: AMIGURUMI (cat 6) ─────────────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(6, 'Spider-Man Crochet Keychain',    'spider-man-crochet-keychain',     'Adorable hand-crafted amigurumi Spider-Man keychain. Red and blue suit with white eyes.',299.00, NULL, 30, NULL, 0.00, 0);

-- ─── PRODUCTS: WALL ART (cat 7) ──────────────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(7, 'Lord Ganesh Aipan Art',          'lord-ganesh-aipan-art',           'Hand-painted Lord Ganesh mandala in traditional Aipan style. Rich maroon, gold & blue frame.',699.00, NULL, 10, NULL, 0.00, 0);

-- ─── PRODUCTS: PAINTED KEYCHAINS (cat 8) ─────
INSERT INTO products (category_id, name, slug, description, price, old_price, stock, badge, rating, review_count) VALUES
(8, 'Spider-Man Eye Wooden Keychain',     'spiderman-eye-wooden-keychain',      'Hand-painted Spider-Man eye close-up on a square wooden keychain. Red and black web pattern — a must-have for Marvel fans.',                                                          149.00, NULL, 30, NULL, 0.00, 0),
(8, 'Evil Eye Nazar Wooden Keychain',     'evil-eye-nazar-wooden-keychain',     'Classic blue Nazar / Evil Eye painted on a round wooden keychain. A protective charm and stylish accessory in one.',                                                                   129.00, NULL, 50, NULL, 0.00, 0),
(8, 'Polar Bear Love Wooden Keychain',    'polar-bear-love-wooden-keychain',    'Adorable white polar bear surrounded by red hearts on a pink square wooden keychain. Cute and charming gift.',                                                                          129.00, NULL, 40, NULL, 0.00, 0),
(8, 'Three Cats Starry Wooden Keychain',  'three-cats-starry-wooden-keychain',  'Three cute cats — black, white, and orange — on a starry pink background. Square wooden keychain for cat lovers.',                                                                      149.00, NULL, 35, NULL, 0.00, 0),
(8, 'Black Cat Diamond Wooden Keychain',  'black-cat-diamond-wooden-keychain',  'A sleek black cat on a pink diamond-shaped wooden keychain. Minimalist and stylish with hand-painted whiskers.',                                                                         129.00, NULL, 40, NULL, 0.00, 0),
(8, 'Kitty & Batman Love Wooden Keychain','kitty-batman-love-wooden-keychain',  'Hello Kitty and Batman side by side with a love heart — hand-painted on a square wooden keychain. Perfect pop-culture gift.',                                                           149.00, NULL, 30, NULL, 0.00, 0),
(8, 'Batman Logo Wooden Keychain',        'batman-logo-wooden-keychain',        'Bold yellow and black Batman logo painted on a round wooden keychain. A fan-favourite DC Comics design.',                                                                               129.00, NULL, 45, NULL, 0.00, 0),
(8, 'Colourful Cats Wooden Keychain',     'colourful-cats-wooden-keychain',     'Three abstract colourful cats — blue, pink, and purple — on a light grey square wooden keychain. Quirky and fun.',                                                                      129.00, NULL, 40, NULL, 0.00, 0),
(8, 'Choose Peace Daisy Wooden Keychain', 'choose-peace-daisy-wooden-keychain', '"Choose Peace" hand-lettered among white daisies on a purple round wooden keychain. Spread good vibes everywhere.',                                                                     129.00, NULL, 50, NULL, 0.00, 0),
(8, 'Casa Amor Lar Wooden Keychain',      'casa-amor-lar-wooden-keychain',      '"Casa Amor Lar" (Home, Love, Hearth) with a cute yellow bear on a purple starry square wooden keychain.',                                                                               149.00, NULL, 25, NULL, 0.00, 0),
(8, 'We Bare Bears Wooden Keychain',      'we-bare-bears-wooden-keychain',      'Panda, Ice Bear, and Grizzly from We Bare Bears hand-painted on a yellow round wooden keychain. A fan favourite!',                                                                      149.00, NULL, 35, NULL, 0.00, 0),
(8, 'Shinchan Wooden Keychain',           'shinchan-wooden-keychain',           'Shinchan eating his favourite snack, hand-painted on a yellow round wooden keychain. Nostalgic and adorable.',                                                                           129.00, NULL, 45, NULL, 0.00, 0);

-- Verified photos matched to catalog slugs; other products use the placeholder.
UPDATE products SET image_url='/uploads/images/kc1.jpg' WHERE slug='spiderman-eye-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc2.jpg' WHERE slug='evil-eye-nazar-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc3.jpg' WHERE slug='polar-bear-love-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc4.jpg' WHERE slug='three-cats-starry-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc5.jpg' WHERE slug='black-cat-diamond-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc6.jpg' WHERE slug='kitty-batman-love-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc7.jpg' WHERE slug='batman-logo-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc8.jpg' WHERE slug='colourful-cats-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc9.jpg' WHERE slug='choose-peace-daisy-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc10.jpg' WHERE slug='casa-amor-lar-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc11.jpg' WHERE slug='we-bare-bears-wooden-keychain';
UPDATE products SET image_url='/uploads/images/kc12.jpg' WHERE slug='shinchan-wooden-keychain';
UPDATE products SET image_url='/uploads/images/bow_purple.jpg' WHERE slug='lavender-crochet-bow-clip';
UPDATE products SET image_url='/uploads/images/flower_red_pin.jpg' WHERE slug='red-flower-hair-clips-pair';
UPDATE products SET image_url='/uploads/images/flower_white_pin.jpg' WHERE slug='white-daisy-hair-pins';
UPDATE products SET image_url='/uploads/images/garland_white.jpg' WHERE slug='crochet-flower-hair-garland';
UPDATE products SET image_url='/uploads/images/scrunchie.jpg' WHERE slug='crochet-bun-scrunchie';
UPDATE products SET image_url='/uploads/images/rose_red.jpg' WHERE slug='crochet-rose-stems-set-2';
UPDATE products SET image_url='/uploads/images/daisy_stick.jpg' WHERE slug='daisy-flower-sticks-set-2';
UPDATE products SET image_url='/uploads/images/flower_bouquet.jpg' WHERE slug='mixed-flower-bouquet';
UPDATE products SET image_url='/uploads/images/sunflower_daisy.jpg' WHERE slug='sunflower-daisy-pair';
UPDATE products SET image_url='/uploads/images/bookmark2.jpg' WHERE slug='beret-with-sunglass-pocket';
UPDATE products SET image_url='/uploads/images/beret_glasses.jpg' WHERE slug='daisy-bookmark-with-stem';
UPDATE products SET image_url='/uploads/images/daisy_keychain.jpg' WHERE slug='daisy-crochet-keychain';
UPDATE products SET image_url='/uploads/images/evil_eye_keychain.jpg' WHERE slug='evil-eye-crochet-keychain';
UPDATE products SET image_url='/uploads/images/spiderman_amigurumi.jpg' WHERE slug='spider-man-crochet-keychain';
UPDATE products SET image_url='/uploads/images/ganesh_aipan.jpg' WHERE slug='lord-ganesh-aipan-art';

COMMIT;

-- ════════════════════════════════════════════
--   VERIFY — should show all categories & counts
-- ════════════════════════════════════════════
SELECT c.name AS category, COUNT(p.id) AS total_products
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;

SHOW TABLES;
SELECT COUNT(*) AS product_count FROM products;
SELECT COUNT(*) AS category_count FROM categories;
