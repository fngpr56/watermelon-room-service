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

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  owner VARCHAR(70) DEFAULT NULL,
  dateIn DATETIME DEFAULT NULL,
  dateOut DATETIME DEFAULT NULL,
  UNIQUE KEY uq_rooms_room_number (room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(20) NOT NULL,
  lastName VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  birthday DATE DEFAULT NULL,
  phoneNumber VARCHAR(15) DEFAULT NULL,
  mailAddress VARCHAR(30) NOT NULL,
  role VARCHAR(20) NOT NULL,
  dateStart DATE NOT NULL,
  completedRequest INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_staff_mail_address (mailAddress)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO rooms (room_number, password_hash, owner, dateIn, dateOut)
SELECT 101, '$2b$10$iNhgFqFotfRcO2e3.Oz8k.YH3NUfUP6KxfcFAzYwuc1ysj.hdR8Gy', 'Jamie Guest', '2026-04-16 15:00:00', '2026-04-19 11:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM rooms WHERE room_number = 101
);

INSERT INTO rooms (room_number, password_hash, owner, dateIn, dateOut)
SELECT 202, '$2b$10$i0KITNW2ZF/cvSv41khdN.FtWkzGp1qAUo.NjQEA75qDRIcfU.BC2', 'Morgan Traveler', '2026-04-17 14:00:00', '2026-04-21 10:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM rooms WHERE room_number = 202
);

INSERT INTO staff (firstName, lastName, password_hash, birthday, phoneNumber, mailAddress, role, dateStart, completedRequest)
SELECT 'Alice', 'Porter', '$2b$10$1X4H.kmP4drsyK0UYSefzOowSJwN0Ly6Qb2CSohoEG8XuK4FirWkC', '1992-08-14', '+421900000111', 'alice.porter@hotel.test', 'manager', '2023-06-01', 154
WHERE NOT EXISTS (
  SELECT 1 FROM staff WHERE mailAddress = 'alice.porter@hotel.test'
);

INSERT INTO staff (firstName, lastName, password_hash, birthday, phoneNumber, mailAddress, role, dateStart, completedRequest)
SELECT 'Bob', 'Service', '$2b$10$na.zKJxPAU4t2XmD7hMM3uQb70j6aEE/jXacSjc/0mSQYMxFfa356', '1997-03-09', '+421900000222', 'bob.service@hotel.test', 'attendant', '2024-02-12', 47
WHERE NOT EXISTS (
  SELECT 1 FROM staff WHERE mailAddress = 'bob.service@hotel.test'
);