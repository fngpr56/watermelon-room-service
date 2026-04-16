CREATE TABLE IF NOT EXISTS inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  quantity_in_stock INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id CHAR(36) PRIMARY KEY,
  room VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  status ENUM('received', 'in_progress', 'partially_delivered', 'delivered', 'rejected', 'cancelled') NOT NULL DEFAULT 'received',
  notes TEXT NULL,
  eta_minutes INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id CHAR(36) NOT NULL,
  inventory_item_id INT NOT NULL,
  quantity_requested INT NOT NULL,
  quantity_fulfilled INT NOT NULL DEFAULT 0,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_item_id INT NOT NULL,
  request_id CHAR(36) NULL,
  type ENUM('reservation', 'release', 'fulfillment', 'restock', 'adjustment', 'reconciliation') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
);