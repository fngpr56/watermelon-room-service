SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `rooms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_number` INT NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `owner` VARCHAR(70) DEFAULT NULL,
  `date_in` DATETIME DEFAULT NULL,
  `date_out` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rooms_room_number` (`room_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `staff` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(20) NOT NULL,
  `last_name` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `birthday` DATE DEFAULT NULL,
  `phone_number` VARCHAR(15) DEFAULT NULL,
  `mail_address` VARCHAR(100) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `date_start` DATE NOT NULL,
  `completed_request_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_mail_address` (`mail_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inventory_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `quantity_in_stock` INT NOT NULL DEFAULT 0,
  `quantity_reserved` INT NOT NULL DEFAULT 0,
  `low_stock_threshold` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_name` (`name`),
  CONSTRAINT `chk_inventory_stock_nonnegative` CHECK (`quantity_in_stock` >= 0),
  CONSTRAINT `chk_inventory_reserved_nonnegative` CHECK (`quantity_reserved` >= 0),
  CONSTRAINT `chk_inventory_threshold_nonnegative` CHECK (`low_stock_threshold` >= 0),
  CONSTRAINT `chk_inventory_reserved_lte_stock` CHECK (`quantity_reserved` <= `quantity_in_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `request_statuses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `label` VARCHAR(50) NOT NULL,
  `color` VARCHAR(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_request_statuses_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `requests` (
  `id` CHAR(36) NOT NULL,
  `room_id` INT NOT NULL,
  `staff_id` INT DEFAULT NULL,
  `full_request` TEXT NOT NULL,
  `category` VARCHAR(50) DEFAULT NULL,
  `status_id` INT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `eta_minutes` INT DEFAULT NULL,
  `request_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `complete_date` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_requests_room_id` (`room_id`),
  KEY `idx_requests_staff_id` (`staff_id`),
  KEY `idx_requests_status_id` (`status_id`),
  KEY `idx_requests_request_date` (`request_date`),
  CONSTRAINT `fk_requests_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_status` FOREIGN KEY (`status_id`) REFERENCES `request_statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_requests_eta_nonnegative` CHECK (`eta_minutes` IS NULL OR `eta_minutes` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `request_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `request_id` CHAR(36) NOT NULL,
  `inventory_item_id` INT NOT NULL,
  `quantity_requested` INT NOT NULL,
  `quantity_fulfilled` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_request_items_request_id` (`request_id`),
  KEY `idx_request_items_inventory_item_id` (`inventory_item_id`),
  CONSTRAINT `fk_request_items_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_request_items_inventory_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_request_items_requested_positive` CHECK (`quantity_requested` > 0),
  CONSTRAINT `chk_request_items_fulfilled_nonnegative` CHECK (`quantity_fulfilled` >= 0),
  CONSTRAINT `chk_request_items_fulfilled_lte_requested` CHECK (`quantity_fulfilled` <= `quantity_requested`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inventory_transactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT NOT NULL,
  `request_id` CHAR(36) DEFAULT NULL,
  `staff_id` INT DEFAULT NULL,
  `transaction_type` ENUM('reservation','release','fulfillment','restock','manual_adjustment','reconciliation','room_assignment') NOT NULL,
  `quantity` INT NOT NULL,
  `reason` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_transactions_item_id` (`inventory_item_id`),
  KEY `idx_inventory_transactions_request_id` (`request_id`),
  KEY `idx_inventory_transactions_staff_id` (`staff_id`),
  KEY `idx_inventory_transactions_created_at` (`created_at`),
  CONSTRAINT `fk_inventory_transactions_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_transactions_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_transactions_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inventory_room_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `staff_id` INT DEFAULT NULL,
  `quantity` INT NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_room_assignments_item_id` (`inventory_item_id`),
  KEY `idx_inventory_room_assignments_room_id` (`room_id`),
  KEY `idx_inventory_room_assignments_staff_id` (`staff_id`),
  KEY `idx_inventory_room_assignments_assigned_at` (`assigned_at`),
  CONSTRAINT `fk_inventory_room_assignments_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_room_assignments_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_room_assignments_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_room_assignments_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE stocktaking_entries (
  id BIGINT NOT NULL AUTO_INCREMENT,
  inventory_item_id INT NOT NULL,
  expected_count INT NOT NULL,
  physical_count INT NOT NULL,
  discrepancy INT NOT NULL,
  reason ENUM('damaged','theft','miscounted','supplier_error') DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_stocktaking_entries_item_id (inventory_item_id),

  CONSTRAINT fk_stocktaking_entries_item
    FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT chk_stocktaking_expected_nonnegative
    CHECK (expected_count >= 0),

  CONSTRAINT chk_stocktaking_physical_nonnegative
    CHECK (physical_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `room_conversations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `room_id` INT NOT NULL,
  `assigned_staff_id` INT DEFAULT NULL,
  `last_message_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_conversations_room_id` (`room_id`),
  KEY `idx_room_conversations_assigned_staff_id` (`assigned_staff_id`),
  KEY `idx_room_conversations_last_message_at` (`last_message_at`),
  CONSTRAINT `fk_room_conversations_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_room_conversations_assigned_staff` FOREIGN KEY (`assigned_staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `room_conversation_messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT NOT NULL,
  `room_id` INT NOT NULL,
  `staff_id` INT DEFAULT NULL,
  `sender_type` ENUM('guest','staff') NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_room_conversation_messages_conversation_id` (`conversation_id`),
  KEY `idx_room_conversation_messages_room_id` (`room_id`),
  KEY `idx_room_conversation_messages_staff_id` (`staff_id`),
  KEY `idx_room_conversation_messages_created_at` (`created_at`),
  CONSTRAINT `fk_room_conversation_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `room_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_room_conversation_messages_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_room_conversation_messages_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `request_statuses` (`id`, `code`, `label`, `color`) VALUES
(1, 'received', 'Received', 'blue'),
(2, 'in_progress', 'In Progress', 'orange'),
(3, 'partially_delivered', 'Partially Delivered', 'purple'),
(4, 'delivered', 'Delivered', 'green'),
(5, 'rejected', 'Rejected', 'red'),
(6, 'cancelled', 'Cancelled', 'gray');

INSERT INTO `rooms` (`id`, `room_number`, `password_hash`, `owner`, `date_in`, `date_out`) VALUES
(1, 101, '$2b$10$nZhjGVwBmIb4j4a6FX78lOF7xqJYPZ6czvtWNVW.iLpyb/ocvHOPC', 'John Carter', '2026-04-15 14:00:00', '2026-04-20 11:00:00'),
(2, 102, '$2b$12$kQw7mQ3v3lR8N5k6U1wD4e9H7q2J8m3L0pXrVh4tYc7nB2sF1gA1K', 'Anna Smith', '2026-04-16 14:00:00', '2026-04-19 11:00:00'),
(3, 201, '$2b$12$kQw7mQ3v3lR8N5k6U1wD4e9H7q2J8m3L0pXrVh4tYc7nB2sF1gA1K', 'David Miller', '2026-04-16 15:30:00', '2026-04-21 11:00:00'),
(4, 204, '$2b$12$kQw7mQ3v3lR8N5k6U1wD4e9H7q2J8m3L0pXrVh4tYc7nB2sF1gA1K', 'Emily Brown', '2026-04-16 16:00:00', '2026-04-22 11:00:00');

INSERT INTO `staff` (`id`, `first_name`, `last_name`, `password_hash`, `birthday`, `phone_number`, `mail_address`, `role`, `date_start`, `completed_request_count`) VALUES
(1, 'Laura', 'Johnson', '$2b$12$kQw7mQ3v3lR8N5k6U1wD4e9H7q2J8m3L0pXrVh4tYc7nB2sF1gA1K', '1992-06-15', '+3725551001', 'laura@watermelonhotel.com', 'front_desk', '2023-01-10', 120),
(2, 'Mark', 'Taylor', '$2b$12$kQw7mQ3v3lR8N5k6U1wD4e9H7q2J8m3L0pXrVh4tYc7nB2sF1gA1K', '1988-11-02', '+3725551002', 'mark@watermelonhotel.com', 'housekeeping', '2022-08-01', 215),
(3, 'Sofia', 'Wilson', '$2b$12$kQw7mQ3v3lR8N5k6U1wD4e9H7q2J8m3L0pXrVh4tYc7nB2sF1gA1K', '1995-03-09', '+3725551003', 'sofia@watermelonhotel.com', 'manager', '2021-05-20', 340),
(4, 'Test', 'Admin', '$2a$12$.U5iqAvTlcH5zk4nvUCPOuBWMOPEVCoS.3Kz1AtD.R1XILOoO74eO', NULL, NULL, 'test@test.com', 'manager', '2026-04-16', 0);

INSERT INTO `inventory_items` (`id`, `name`, `category`, `unit`, `quantity_in_stock`, `quantity_reserved`, `low_stock_threshold`) VALUES
(1, 'Bottle of Water', 'room_service', 'bottle', 40, 2, 10),
(2, 'Towel', 'housekeeping', 'piece', 30, 3, 8),
(3, 'Iron', 'housekeeping', 'piece', 8, 1, 2),
(4, 'Shampoo', 'toiletries', 'bottle', 25, 0, 5),
(5, 'Toothbrush', 'toiletries', 'piece', 20, 0, 5),
(6, 'Pillow', 'housekeeping', 'piece', 12, 1, 3),
(7, 'Sandwich', 'room_service', 'piece', 15, 0, 4),
(8, 'Coffee Capsule', 'room_service', 'piece', 60, 5, 15);

INSERT INTO `requests` (`id`, `room_id`, `staff_id`, `full_request`, `category`, `status_id`, `notes`, `eta_minutes`, `request_date`, `complete_date`) VALUES
('11111111-1111-1111-1111-111111111111', 4, 1, 'Can you send up an iron and some extra towels please?', 'housekeeping', 2, 'Iron prepared, towels on the way.', 10, '2026-04-16 17:30:00', NULL),
('22222222-2222-2222-2222-222222222222', 2, 2, 'Please bring two bottles of water.', 'room_service', 4, 'Delivered to room 102.', 5, '2026-04-16 17:10:00', '2026-04-16 17:18:00'),
('33333333-3333-3333-3333-333333333333', 3, NULL, 'I need five towels.', 'housekeeping', 5, 'Out of stock: only 3 towels available.', NULL, '2026-04-16 18:00:00', NULL),
('44444444-4444-4444-4444-444444444444', 1, 2, 'Can I get one pillow and one shampoo?', 'housekeeping', 3, 'Pillow delivered, shampoo will follow shortly.', 12, '2026-04-16 16:40:00', NULL);

INSERT INTO `request_items` (`id`, `request_id`, `inventory_item_id`, `quantity_requested`, `quantity_fulfilled`) VALUES
(1, '11111111-1111-1111-1111-111111111111', 3, 1, 0),
(2, '11111111-1111-1111-1111-111111111111', 2, 3, 0),
(3, '22222222-2222-2222-2222-222222222222', 1, 2, 2),
(4, '33333333-3333-3333-3333-333333333333', 2, 5, 0),
(5, '44444444-4444-4444-4444-444444444444', 6, 1, 1),
(6, '44444444-4444-4444-4444-444444444444', 4, 1, 0);

INSERT INTO `inventory_transactions` (`id`, `inventory_item_id`, `request_id`, `staff_id`, `transaction_type`, `quantity`, `reason`, `created_at`) VALUES
(1, 3, '11111111-1111-1111-1111-111111111111', NULL, 'reservation', 1, 'Reserved on request creation', '2026-04-16 17:30:00'),
(2, 2, '11111111-1111-1111-1111-111111111111', NULL, 'reservation', 3, 'Reserved on request creation', '2026-04-16 17:30:00'),
(3, 1, '22222222-2222-2222-2222-222222222222', NULL, 'reservation', 2, 'Reserved on request creation', '2026-04-16 17:10:00'),
(4, 1, '22222222-2222-2222-2222-222222222222', 2, 'fulfillment', 2, 'Delivered to guest', '2026-04-16 17:18:00'),
(5, 6, '44444444-4444-4444-4444-444444444444', NULL, 'reservation', 1, 'Reserved on request creation', '2026-04-16 16:40:00'),
(6, 4, '44444444-4444-4444-4444-444444444444', NULL, 'reservation', 1, 'Reserved on request creation', '2026-04-16 16:40:00'),
(7, 6, '44444444-4444-4444-4444-444444444444', 2, 'fulfillment', 1, 'Pillow delivered', '2026-04-16 16:48:00'),
(8, 4, NULL, 3, 'restock', 10, 'Supplier delivery', '2026-04-15 09:00:00');

INSERT INTO `stocktaking_entries` (`id`, `inventory_item_id`, `expected_count`, `physical_count`, `discrepancy`, `reason`, `created_at`) VALUES
(1, 2, 32, 30, -2, 'miscounted', '2026-04-01 09:40:00'),
(2, 3, 9, 8, -1, 'damaged', '2026-04-01 09:50:00'),
(3, 1, 42, 42, 0, NULL, '2026-04-01 09:35:00');

COMMIT;