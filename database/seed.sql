USE retailpos;

INSERT INTO categories (name) VALUES ('Beverages'), ('Snacks');

INSERT INTO products (barcode, name, category_id, purchase_price, selling_price, stock, sku)
VALUES
  ('890123456789', 'Pepsi 500ml', 1, 90.00, 120.00, 50, 'PEP-001'),
  ('890123456790', 'Coke 500ml', 1, 100.00, 150.00, 32, 'COL-002'),
  ('890123456791', 'Lays Chips', 2, 60.00, 80.00, 12, 'LAY-003');

INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin User', 'admin@retailpos.com', '$2b$10$abcdefghijklmnopqrstuv', 'admin');
