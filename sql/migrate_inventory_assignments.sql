START TRANSACTION;

CREATE TABLE IF NOT EXISTS `request_items` (
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

ALTER TABLE `inventory_transactions`
  MODIFY COLUMN `transaction_type` ENUM('reservation','release','fulfillment','restock','manual_adjustment','reconciliation','room_assignment') NOT NULL;

CREATE TABLE IF NOT EXISTS `inventory_room_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `staff_id` INT DEFAULT NULL,
  `quantity` INT NOT NULL,
  `status` ENUM('started','in_progress','completed') NOT NULL DEFAULT 'started',
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

SET @inventory_assignment_status_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inventory_room_assignments'
    AND COLUMN_NAME = 'status'
);

SET @inventory_assignment_status_alter_sql = IF(
  @inventory_assignment_status_exists = 0,
  "ALTER TABLE `inventory_room_assignments` ADD COLUMN `status` ENUM('started','in_progress','completed') NOT NULL DEFAULT 'started' AFTER `quantity`",
  'SELECT 1'
);

PREPARE inventory_assignment_status_alter_stmt FROM @inventory_assignment_status_alter_sql;
EXECUTE inventory_assignment_status_alter_stmt;
DEALLOCATE PREPARE inventory_assignment_status_alter_stmt;

SET @inventory_assignment_status_backfill_sql = IF(
  @inventory_assignment_status_exists = 0,
  "UPDATE `inventory_room_assignments` SET `status` = 'completed'",
  'SELECT 1'
);

PREPARE inventory_assignment_status_backfill_stmt FROM @inventory_assignment_status_backfill_sql;
EXECUTE inventory_assignment_status_backfill_stmt;
DEALLOCATE PREPARE inventory_assignment_status_backfill_stmt;

COMMIT;