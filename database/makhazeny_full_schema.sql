-- =============================================================================
-- Makhazeny (مخازني) — Full MySQL Database Schema
-- =============================================================================
-- نظام إدارة المستودع والمبيعات ونقطة البيع (POS)
-- Inventory, Sales, POS, Treasury & Debt Management System
--
-- MySQL Version : 8.0+
-- Charset       : utf8mb4 / utf8mb4_unicode_ci
-- Currency      : EGP (جنيه مصري)
--
-- Usage:
--   mysql -u root -p < database/makhazeny_full_schema.sql
--   OR import via phpMyAdmin / MySQL Workbench / DBeaver
--
-- Default login credentials (after seed):
--   admin@makhazeny.local      / admin123
--   accountant@makhazeny.local / accountant123
--   employee@makhazeny.local   / employee123
-- =============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------------------------------
-- Database
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `makhazeny`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `makhazeny`;

-- -----------------------------------------------------------------------------
-- Drop existing tables (reverse dependency order)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `purchase_order_items`;
DROP TABLE IF EXISTS `purchase_orders`;
DROP TABLE IF EXISTS `inventory_movements`;
DROP TABLE IF EXISTS `daily_balance_histories`;
DROP TABLE IF EXISTS `treasury_transactions`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `supplier_payments`;
DROP TABLE IF EXISTS `treasuries`;
DROP TABLE IF EXISTS `return_items`;
DROP TABLE IF EXISTS `returns`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `debts`;
DROP TABLE IF EXISTS `sales_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

-- -----------------------------------------------------------------------------
-- 1. users — المستخدمون
-- Roles: ADMIN (مسؤول), ACCOUNTANT (محاسب), EMPLOYEE (موظف)
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`         CHAR(36)     NOT NULL,
  `email`      VARCHAR(255) NOT NULL COMMENT 'البريد الإلكتروني',
  `password`   VARCHAR(255) NOT NULL COMMENT 'كلمة المرور (bcrypt hash)',
  `name`       VARCHAR(255) NOT NULL COMMENT 'الاسم',
  `role`       ENUM('ADMIN', 'ACCOUNTANT', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE' COMMENT 'الدور',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='المستخدمون وصلاحيات النظام';

-- -----------------------------------------------------------------------------
-- 2. categories — الفئات
-- -----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id`         CHAR(36)     NOT NULL,
  `name`       VARCHAR(255) NOT NULL COMMENT 'اسم الفئة',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='فئات المنتجات';

-- -----------------------------------------------------------------------------
-- 3. suppliers — الموردون
-- -----------------------------------------------------------------------------
CREATE TABLE `suppliers` (
  `id`         CHAR(36)     NOT NULL,
  `name`       VARCHAR(255) NOT NULL COMMENT 'اسم المورد',
  `phone`      VARCHAR(50)  NULL     COMMENT 'الهاتف',
  `email`      VARCHAR(255) NULL     COMMENT 'البريد الإلكتروني',
  `address`    VARCHAR(500) NULL     COMMENT 'العنوان',
  `city`       VARCHAR(100) NULL     COMMENT 'المدينة',
  `balance`    DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'الرصيد المستحق للمورد',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_suppliers_name` (`name`),
  KEY `idx_suppliers_phone` (`phone`),
  KEY `idx_suppliers_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='الموردون';

-- -----------------------------------------------------------------------------
-- 4. products — المنتجات
-- -----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id`              CHAR(36)      NOT NULL,
  `name`            VARCHAR(255)  NOT NULL COMMENT 'اسم المنتج',
  `sku`             VARCHAR(100)  NOT NULL COMMENT 'رمز المنتج SKU',
  `description`     TEXT          NULL     COMMENT 'الوصف',
  `category_id`     CHAR(36)      NOT NULL COMMENT 'الفئة',
  `supplier_id`     CHAR(36)      NULL     COMMENT 'المورد',
  `purchase_price`  DECIMAL(12,2) NOT NULL COMMENT 'سعر الشراء / التكلفة',
  `selling_price`   DECIMAL(12,2) NOT NULL COMMENT 'سعر البيع',
  `quantity`        INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'المخزون الحالي',
  `low_stock_level` INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'حد التنبيه للمخزون المنخفض',
  `barcode`         VARCHAR(100)  NULL     COMMENT 'الباركود',
  `created_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_sku` (`sku`),
  KEY `idx_products_name` (`name`),
  KEY `idx_products_category_id` (`category_id`),
  KEY `idx_products_supplier_id` (`supplier_id`),
  KEY `idx_products_barcode` (`barcode`),
  KEY `idx_products_quantity` (`quantity`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_products_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='المنتجات والمخزون';

-- -----------------------------------------------------------------------------
-- 5. customers — العملاء
-- -----------------------------------------------------------------------------
CREATE TABLE `customers` (
  `id`           CHAR(36)      NOT NULL,
  `name`         VARCHAR(255)  NOT NULL COMMENT 'اسم العميل',
  `phone`        VARCHAR(50)   NULL     COMMENT 'الهاتف',
  `email`        VARCHAR(255)  NULL     COMMENT 'البريد الإلكتروني',
  `address`      VARCHAR(500)  NULL     COMMENT 'العنوان',
  `city`         VARCHAR(100)  NULL     COMMENT 'المدينة',
  `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'حد الائتمان',
  `created_at`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_customers_name` (`name`),
  KEY `idx_customers_phone` (`phone`),
  KEY `idx_customers_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='العملاء';

-- -----------------------------------------------------------------------------
-- 6. sales — المبيعات
-- Status: PENDING, PARTIAL, PAID, CANCELLED
-- Payment: CASH, CARD, CHECK, TRANSFER, INSTALLMENT, CREDIT, OTHER
-- -----------------------------------------------------------------------------
CREATE TABLE `sales` (
  `id`             CHAR(36) NOT NULL,
  `sale_number`    VARCHAR(20) NOT NULL COMMENT 'رقم البيع (مثال: SALE-000001)',
  `customer_id`    CHAR(36) NOT NULL COMMENT 'العميل',
  `total_amount`   DECIMAL(12,2) NOT NULL COMMENT 'الإجمالي',
  `paid_amount`    DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'المبلغ المدفوع',
  `status`         ENUM('PENDING', 'PARTIAL', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT 'حالة البيع',
  `payment_method` ENUM('CASH', 'CARD', 'CHECK', 'TRANSFER', 'INSTALLMENT', 'CREDIT', 'OTHER') NOT NULL DEFAULT 'CASH' COMMENT 'طريقة الدفع',
  `notes`          TEXT NULL COMMENT 'ملاحظات',
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_sale_number` (`sale_number`),
  KEY `idx_sales_customer_id` (`customer_id`),
  KEY `idx_sales_status` (`status`),
  KEY `idx_sales_created_at` (`created_at`),
  KEY `idx_sales_payment_method` (`payment_method`),
  CONSTRAINT `fk_sales_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='فواتير المبيعات';

-- -----------------------------------------------------------------------------
-- 7. sales_items — بنود المبيعات
-- -----------------------------------------------------------------------------
CREATE TABLE `sales_items` (
  `id`         CHAR(36)      NOT NULL,
  `sale_id`    CHAR(36)      NOT NULL,
  `product_id` CHAR(36)      NOT NULL COMMENT 'المنتج',
  `quantity`   INT UNSIGNED  NOT NULL COMMENT 'الكمية',
  `price`      DECIMAL(12,2) NOT NULL COMMENT 'سعر الوحدة',
  `total`      DECIMAL(12,2) NOT NULL COMMENT 'المجموع الفرعي',
  `created_at` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_sales_items_sale_id` (`sale_id`),
  KEY `idx_sales_items_product_id` (`product_id`),
  CONSTRAINT `fk_sales_items_sale`
    FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='بنود فواتير المبيعات';

-- -----------------------------------------------------------------------------
-- 8. debts — الديون / الأقساط
-- Status: ACTIVE, PARTIAL, PAID, OVERDUE, CANCELLED
-- -----------------------------------------------------------------------------
CREATE TABLE `debts` (
  `id`               CHAR(36) NOT NULL,
  `sale_id`          CHAR(36) NULL COMMENT 'مرتبط بفاتورة بيع (اختياري)',
  `customer_id`      CHAR(36) NOT NULL COMMENT 'العميل',
  `original_amount`  DECIMAL(12,2) NOT NULL COMMENT 'المبلغ الأصلي',
  `remaining_amount` DECIMAL(12,2) NOT NULL COMMENT 'المبلغ المتبقي',
  `due_date`         DATE NULL COMMENT 'تاريخ الاستحقاق',
  `status`           ENUM('ACTIVE', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'حالة الدين',
  `description`      TEXT NULL COMMENT 'الوصف',
  `created_at`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_debts_customer_id` (`customer_id`),
  KEY `idx_debts_sale_id` (`sale_id`),
  KEY `idx_debts_status` (`status`),
  KEY `idx_debts_due_date` (`due_date`),
  KEY `idx_debts_customer_status` (`customer_id`, `status`),
  CONSTRAINT `fk_debts_sale`
    FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_debts_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ديون العملاء والأقساط';

-- -----------------------------------------------------------------------------
-- 9. payments — دفعات سداد الديون
-- -----------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id`          CHAR(36) NOT NULL,
  `debt_id`     CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL COMMENT 'العميل',
  `amount`      DECIMAL(12,2) NOT NULL COMMENT 'المبلغ',
  `method`      ENUM('CASH', 'CARD', 'CHECK', 'TRANSFER', 'INSTALLMENT', 'CREDIT', 'OTHER') NOT NULL DEFAULT 'CASH' COMMENT 'طريقة الدفع',
  `reference`   VARCHAR(100) NULL COMMENT 'المرجع',
  `notes`       TEXT NULL COMMENT 'ملاحظات',
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_payments_debt_id` (`debt_id`),
  KEY `idx_payments_customer_id` (`customer_id`),
  KEY `idx_payments_created_at` (`created_at`),
  CONSTRAINT `fk_payments_debt`
    FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='دفعات سداد الديون';

-- -----------------------------------------------------------------------------
-- 10. returns — المرتجعات
-- Reason: DEFECTIVE, WRONG_ITEM, CUSTOMER_REQUEST, DAMAGE, OTHER
-- Status: PENDING, APPROVED, PROCESSED, REJECTED
-- -----------------------------------------------------------------------------
CREATE TABLE `returns` (
  `id`            CHAR(36) NOT NULL,
  `return_number` VARCHAR(20) NOT NULL COMMENT 'رقم الإرجاع',
  `sale_id`       CHAR(36) NOT NULL,
  `customer_id`   CHAR(36) NOT NULL COMMENT 'العميل',
  `total_amount`  DECIMAL(12,2) NOT NULL COMMENT 'مبلغ الإرجاع الإجمالي',
  `reason`        ENUM('DEFECTIVE', 'WRONG_ITEM', 'CUSTOMER_REQUEST', 'DAMAGE', 'OTHER') NOT NULL COMMENT 'سبب الإرجاع',
  `status`        ENUM('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'حالة الإرجاع',
  `notes`         TEXT NULL COMMENT 'ملاحظات',
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_returns_return_number` (`return_number`),
  KEY `idx_returns_sale_id` (`sale_id`),
  KEY `idx_returns_customer_id` (`customer_id`),
  KEY `idx_returns_status` (`status`),
  CONSTRAINT `fk_returns_sale`
    FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_returns_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='مرتجعات المبيعات';

-- -----------------------------------------------------------------------------
-- 11. return_items — بنود المرتجعات
-- -----------------------------------------------------------------------------
CREATE TABLE `return_items` (
  `id`            CHAR(36)      NOT NULL,
  `return_id`     CHAR(36)      NOT NULL,
  `sale_item_id`  CHAR(36)      NULL COMMENT 'بند البيع الأصلي (اختياري)',
  `product_id`    CHAR(36)      NOT NULL COMMENT 'المنتج',
  `quantity`      INT UNSIGNED  NOT NULL COMMENT 'الكمية المرتجعة',
  `price`         DECIMAL(12,2) NOT NULL COMMENT 'سعر الوحدة',
  `return_amount` DECIMAL(12,2) NOT NULL COMMENT 'مبلغ الإرجاع',
  `created_at`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_return_items_return_id` (`return_id`),
  KEY `idx_return_items_sale_item_id` (`sale_item_id`),
  KEY `idx_return_items_product_id` (`product_id`),
  CONSTRAINT `fk_return_items_return`
    FOREIGN KEY (`return_id`) REFERENCES `returns` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_return_items_sale_item`
    FOREIGN KEY (`sale_item_id`) REFERENCES `sales_items` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_return_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='بنود المرتجعات';

-- -----------------------------------------------------------------------------
-- 12. treasuries — الخزينة اليومية
-- One treasury record per calendar day
-- -----------------------------------------------------------------------------
CREATE TABLE `treasuries` (
  `id`               CHAR(36)      NOT NULL,
  `date`             DATE          NOT NULL COMMENT 'تاريخ اليوم',
  `opening_balance`  DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'الرصيد الافتتاحي',
  `closing_balance`  DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'الرصيد الختامي',
  `is_closed`        TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'هل تم إغلاق اليوم',
  `closed_at`        DATETIME(3)   NULL COMMENT 'وقت الإغلاق',
  `closed_by_system` TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'إغلاق تلقائي بالنظام',
  `notes`            TEXT          NULL COMMENT 'ملاحظات',
  `created_at`       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_treasuries_date` (`date`),
  KEY `idx_treasuries_is_closed` (`is_closed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='سجل الخزينة اليومية';

-- -----------------------------------------------------------------------------
-- 13. expenses — المصروفات
-- -----------------------------------------------------------------------------
CREATE TABLE `expenses` (
  `id`             CHAR(36) NOT NULL,
  `category`       ENUM('RENT', 'UTILITIES', 'SALARY', 'MAINTENANCE', 'OFFICE_SUPPLIES', 'TRANSPORT', 'INSURANCE', 'MARKETING', 'OTHER') NOT NULL COMMENT 'تصنيف المصروف',
  `description`    VARCHAR(500) NOT NULL COMMENT 'الوصف',
  `amount`         DECIMAL(12,2) NOT NULL COMMENT 'المبلغ',
  `payment_method` ENUM('CASH', 'CARD', 'CHECK', 'TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH' COMMENT 'طريقة الدفع',
  `reference`      VARCHAR(100) NULL COMMENT 'المرجع',
  `notes`          TEXT NULL COMMENT 'ملاحظات',
  `treasury_id`    CHAR(36) NULL COMMENT 'الخزينة المرتبطة',
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_expenses_category` (`category`),
  KEY `idx_expenses_treasury_id` (`treasury_id`),
  KEY `idx_expenses_created_at` (`created_at`),
  CONSTRAINT `fk_expenses_treasury`
    FOREIGN KEY (`treasury_id`) REFERENCES `treasuries` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='المصروفات التشغيلية';

-- -----------------------------------------------------------------------------
-- 14. supplier_payments — مدفوعات الموردين
-- -----------------------------------------------------------------------------
CREATE TABLE `supplier_payments` (
  `id`             CHAR(36) NOT NULL,
  `supplier_id`    CHAR(36) NOT NULL COMMENT 'المورد',
  `amount`         DECIMAL(12,2) NOT NULL COMMENT 'المبلغ',
  `payment_method` ENUM('CASH', 'CARD', 'CHECK', 'TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH' COMMENT 'طريقة الدفع',
  `reference`      VARCHAR(100) NULL COMMENT 'المرجع',
  `notes`          TEXT NULL COMMENT 'ملاحظات',
  `treasury_id`    CHAR(36) NULL COMMENT 'الخزينة المرتبطة',
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_supplier_payments_supplier_id` (`supplier_id`),
  KEY `idx_supplier_payments_treasury_id` (`treasury_id`),
  KEY `idx_supplier_payments_created_at` (`created_at`),
  CONSTRAINT `fk_supplier_payments_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_payments_treasury`
    FOREIGN KEY (`treasury_id`) REFERENCES `treasuries` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='مدفوعات الموردين';

-- -----------------------------------------------------------------------------
-- 15. treasury_transactions — حركات الخزينة
-- Type: SALES_INCOME, INSTALLMENT_PAYMENT, SUPPLIER_PAYMENT, RETURN_REFUND,
--       MANUAL_EXPENSE, MANUAL_INCOME, BALANCE_CARRYOVER
-- -----------------------------------------------------------------------------
CREATE TABLE `treasury_transactions` (
  `id`                  CHAR(36) NOT NULL,
  `treasury_id`         CHAR(36) NOT NULL,
  `type`                ENUM('SALES_INCOME', 'INSTALLMENT_PAYMENT', 'SUPPLIER_PAYMENT', 'RETURN_REFUND', 'MANUAL_EXPENSE', 'MANUAL_INCOME', 'INVENTORY_PURCHASE', 'BALANCE_CARRYOVER') NOT NULL COMMENT 'نوع الحركة',
  `amount`              DECIMAL(12,2) NOT NULL COMMENT 'المبلغ',
  `description`         VARCHAR(500) NOT NULL COMMENT 'الوصف',
  `reference`           VARCHAR(100) NULL COMMENT 'المرجع',
  `sale_id`             CHAR(36) NULL,
  `payment_id`          CHAR(36) NULL,
  `supplier_payment_id` CHAR(36) NULL,
  `supplier_id`         CHAR(36) NULL,
  `return_id`           CHAR(36) NULL,
  `expense_id`          CHAR(36) NULL,
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tt_treasury_id` (`treasury_id`),
  KEY `idx_tt_type` (`type`),
  KEY `idx_tt_created_at` (`created_at`),
  KEY `idx_tt_treasury_created` (`treasury_id`, `created_at`),
  KEY `idx_tt_sale_id` (`sale_id`),
  KEY `idx_tt_payment_id` (`payment_id`),
  KEY `idx_tt_supplier_payment_id` (`supplier_payment_id`),
  KEY `idx_tt_supplier_id` (`supplier_id`),
  KEY `idx_tt_return_id` (`return_id`),
  KEY `idx_tt_expense_id` (`expense_id`),
  CONSTRAINT `fk_tt_treasury`
    FOREIGN KEY (`treasury_id`) REFERENCES `treasuries` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tt_sale`
    FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tt_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tt_supplier_payment`
    FOREIGN KEY (`supplier_payment_id`) REFERENCES `supplier_payments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tt_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tt_return`
    FOREIGN KEY (`return_id`) REFERENCES `returns` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tt_expense`
    FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='حركات الخزينة المالية';

-- -----------------------------------------------------------------------------
-- 16. daily_balance_histories — سجل الأرصدة اليومية
-- -----------------------------------------------------------------------------
CREATE TABLE `daily_balance_histories` (
  `id`              CHAR(36)      NOT NULL,
  `treasury_id`     CHAR(36)      NOT NULL,
  `date`            DATE          NOT NULL COMMENT 'التاريخ',
  `opening_balance` DECIMAL(12,2) NOT NULL COMMENT 'الرصيد الافتتاحي',
  `closing_balance` DECIMAL(12,2) NOT NULL COMMENT 'الرصيد الختامي',
  `daily_income`    DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'دخل اليوم',
  `daily_expense`   DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'مصروفات اليوم',
  `daily_profit`    DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'ربح اليوم',
  `created_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dbh_treasury_id` (`treasury_id`),
  KEY `idx_dbh_date` (`date`),
  CONSTRAINT `fk_dbh_treasury`
    FOREIGN KEY (`treasury_id`) REFERENCES `treasuries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ملخص الأرصدة اليومية';

-- -----------------------------------------------------------------------------
-- 17. inventory_movements — حركات المخزون
-- Type: PURCHASE, SALE, RETURN, ADJUSTMENT, DAMAGE
-- -----------------------------------------------------------------------------
CREATE TABLE `inventory_movements` (
  `id`              CHAR(36)     NOT NULL,
  `product_id`      CHAR(36)     NOT NULL COMMENT 'المنتج',
  `type`            ENUM('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE') NOT NULL COMMENT 'نوع الحركة',
  `quantity_change` INT          NOT NULL COMMENT 'التغيير في الكمية (+/-)',
  `quantity_before` INT UNSIGNED NOT NULL COMMENT 'المخزون قبل الحركة',
  `quantity_after`  INT UNSIGNED NOT NULL COMMENT 'المخزون بعد الحركة',
  `reference_type`  VARCHAR(50)  NULL COMMENT 'نوع المرجع (sale, return, purchase_order, ...)',
  `reference_id`    CHAR(36)     NULL COMMENT 'معرف المرجع',
  `notes`           TEXT         NULL COMMENT 'ملاحظات',
  `created_by`      CHAR(36)     NULL COMMENT 'المستخدم الذي أنشأ الحركة',
  `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_inv_mov_product_id` (`product_id`),
  KEY `idx_inv_mov_type` (`type`),
  KEY `idx_inv_mov_reference` (`reference_type`, `reference_id`),
  KEY `idx_inv_mov_created_at` (`created_at`),
  CONSTRAINT `fk_inv_mov_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_mov_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='سجل حركات المخزون';

-- -----------------------------------------------------------------------------
-- 18. purchase_orders — أوامر الشراء
-- Status: PENDING, RECEIVED, PARTIAL, CANCELLED
-- -----------------------------------------------------------------------------
CREATE TABLE `purchase_orders` (
  `id`           CHAR(36)      NOT NULL,
  `order_number` VARCHAR(20)   NOT NULL COMMENT 'رقم أمر الشراء',
  `supplier_id`  CHAR(36)      NOT NULL COMMENT 'المورد',
  `status`       ENUM('PENDING', 'RECEIVED', 'PARTIAL', 'CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT 'حالة الأمر',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'الإجمالي',
  `notes`        TEXT          NULL COMMENT 'ملاحظات',
  `expected_date` DATE         NULL COMMENT 'تاريخ التسليم المتوقع',
  `received_at`  DATETIME(3)   NULL COMMENT 'تاريخ الاستلام',
  `created_by`   CHAR(36)      NULL COMMENT 'أنشئ بواسطة',
  `created_at`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purchase_orders_order_number` (`order_number`),
  KEY `idx_purchase_orders_supplier_id` (`supplier_id`),
  KEY `idx_purchase_orders_status` (`status`),
  KEY `idx_purchase_orders_created_at` (`created_at`),
  CONSTRAINT `fk_purchase_orders_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_purchase_orders_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='أوامر الشراء من الموردين';

-- -----------------------------------------------------------------------------
-- 19. purchase_order_items — بنود أوامر الشراء
-- -----------------------------------------------------------------------------
CREATE TABLE `purchase_order_items` (
  `id`                CHAR(36)      NOT NULL,
  `purchase_order_id` CHAR(36)      NOT NULL,
  `product_id`        CHAR(36)      NOT NULL COMMENT 'المنتج',
  `quantity_ordered`  INT UNSIGNED  NOT NULL COMMENT 'الكمية المطلوبة',
  `quantity_received` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'الكمية المستلمة',
  `unit_price`        DECIMAL(12,2) NOT NULL COMMENT 'سعر الوحدة',
  `total`             DECIMAL(12,2) NOT NULL COMMENT 'المجموع',
  `created_at`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_poi_purchase_order_id` (`purchase_order_id`),
  KEY `idx_poi_product_id` (`product_id`),
  CONSTRAINT `fk_poi_purchase_order`
    FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_poi_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='بنود أوامر الشراء';

-- =============================================================================
-- VIEWS — عروض مساعدة للتقارير
-- =============================================================================

-- عرض المنتجات منخفضة المخزون
CREATE OR REPLACE VIEW `v_low_stock_products` AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.quantity,
  p.low_stock_level,
  c.name AS category_name,
  s.name AS supplier_name
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE p.quantity <= p.low_stock_level;

-- عرض ديون العملاء النشطة
CREATE OR REPLACE VIEW `v_active_customer_debts` AS
SELECT
  d.id AS debt_id,
  c.id AS customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  d.original_amount,
  d.remaining_amount,
  d.due_date,
  d.status,
  s.sale_number
FROM debts d
JOIN customers c ON c.id = d.customer_id
LEFT JOIN sales s ON s.id = d.sale_id
WHERE d.status IN ('ACTIVE', 'PARTIAL', 'OVERDUE');

-- عرض ملخص المبيعات اليومية
CREATE OR REPLACE VIEW `v_daily_sales_summary` AS
SELECT
  DATE(s.created_at) AS sale_date,
  COUNT(*) AS total_sales,
  SUM(s.total_amount) AS total_revenue,
  SUM(s.paid_amount) AS total_collected,
  SUM(s.total_amount - s.paid_amount) AS total_outstanding
FROM sales s
WHERE s.status != 'CANCELLED'
GROUP BY DATE(s.created_at);

-- =============================================================================
-- STORED PROCEDURE — تحديث الديون المتأخرة
-- =============================================================================
DELIMITER $$

CREATE PROCEDURE `sp_mark_overdue_debts`()
BEGIN
  UPDATE debts
  SET status = 'OVERDUE', updated_at = NOW(3)
  WHERE status IN ('ACTIVE', 'PARTIAL')
    AND remaining_amount > 0
    AND due_date IS NOT NULL
    AND due_date < CURDATE();
END$$

DELIMITER ;

-- =============================================================================
-- SEED DATA — بيانات أولية للتجربة
-- =============================================================================

-- المستخدمون
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`) VALUES
('user-admin',      'admin@makhazeny.local',      '$2b$10$ULf71HOVfWjRXfoBNdDjIOVGIdFAM2RFOdW3TqdAhJN..O3TccVmS',      'Admin User',      'ADMIN'),
('user-accountant', 'accountant@makhazeny.local', '$2b$10$mK0M.USpz93PbN/rGJ65PeDXweZ3RY2FKux7Sap6uSOXz1Rii5H4K', 'Accountant User', 'ACCOUNTANT'),
('user-employee',   'employee@makhazeny.local',   '$2b$10$1gdwBAEDvFME6m2cWr1WbeW3rKAKuBwAkGq.QODhAEWqPtfjgCCVC',   'Employee User',   'EMPLOYEE');

-- الفئات
INSERT INTO `categories` (`id`, `name`) VALUES
('cat-electronics', 'Electronics'),
('cat-clothing',    'Clothing'),
('cat-groceries',   'Groceries');

-- الموردون
INSERT INTO `suppliers` (`id`, `name`, `phone`, `email`, `address`, `city`, `balance`) VALUES
('sup-1', 'Tech Supply Co',    '+1234567890', 'supplier@techco.com',    '123 Tech Street',    'Tech City',     0.00),
('sup-2', 'Fashion Wholesale', '+0987654321', 'supplier@fashion.com', '456 Fashion Ave',    'Fashion City',  0.00);

-- المنتجات
INSERT INTO `products` (`id`, `name`, `sku`, `description`, `category_id`, `supplier_id`, `purchase_price`, `selling_price`, `quantity`, `low_stock_level`, `barcode`) VALUES
('prod-laptop', 'Laptop Computer',  'LAPTOP-001', 'High-performance laptop',  'cat-electronics', 'sup-1', 800.00, 1200.00,  4,  2, '1234567890001'),
('prod-phone',  'Smartphone',       'PHONE-001',  'Latest smartphone model',    'cat-electronics', 'sup-1', 400.00,  600.00, 15,  5, '1234567890002'),
('prod-shirt',  'Cotton T-Shirt',   'SHIRT-001',  'Comfortable cotton shirt', 'cat-clothing',    'sup-2',   5.00,   15.00, 99, 20, '1234567890003'),
('prod-rice',   'White Rice 5kg',   'RICE-001',   'Premium white rice',       'cat-groceries',   NULL,     10.00,   15.00, 50, 10, '1234567890004');

-- العملاء
INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `address`, `city`, `credit_limit`) VALUES
('cust-1', 'Ahmed Hassan',   '+201001234567', 'ahmed@example.com',   '789 Main St',     'Cairo',      10000.00),
('cust-2', 'Fatima Mohamed', '+201101234567', 'fatima@example.com',  '101 King Street', 'Alexandria',  5000.00);

-- المبيعات
INSERT INTO `sales` (`id`, `sale_number`, `customer_id`, `total_amount`, `paid_amount`, `status`, `payment_method`, `notes`) VALUES
('sale-1', 'SALE-000001', 'cust-1', 1215.00, 600.00, 'PARTIAL', 'CASH', NULL);

-- بنود المبيعات
INSERT INTO `sales_items` (`id`, `sale_id`, `product_id`, `quantity`, `price`, `total`) VALUES
('si-1', 'sale-1', 'prod-laptop', 1, 1200.00, 1200.00),
('si-2', 'sale-1', 'prod-shirt',  1,   15.00,   15.00);

-- الديون
INSERT INTO `debts` (`id`, `sale_id`, `customer_id`, `original_amount`, `remaining_amount`, `due_date`, `status`, `description`) VALUES
('debt-1', 'sale-1', 'cust-1', 1215.00, 615.00, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'PARTIAL', NULL);

-- الخزينة (آخر 7 أيام)
INSERT INTO `treasuries` (`id`, `date`, `opening_balance`, `closing_balance`, `is_closed`, `closed_at`, `closed_by_system`, `notes`) VALUES
('treasury-6', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 5000.00,  6200.00, 1, NOW(3), 1, 'Daily treasury record'),
('treasury-5', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 6200.00,  7450.00, 1, NOW(3), 1, 'Daily treasury record'),
('treasury-4', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 7450.00,  8800.00, 1, NOW(3), 1, 'Daily treasury record'),
('treasury-3', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 8800.00, 10100.00, 1, NOW(3), 1, 'Daily treasury record'),
('treasury-2', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 10100.00, 11450.00, 1, NOW(3), 1, 'Daily treasury record'),
('treasury-1', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 11450.00, 12800.00, 1, NOW(3), 1, 'Daily treasury record'),
('treasury-0', CURDATE(),                          12800.00, 13765.00, 0, NULL,   0, 'Today treasury — open');

-- حركات الخزينة
INSERT INTO `treasury_transactions` (`id`, `treasury_id`, `type`, `amount`, `description`, `reference`, `sale_id`) VALUES
('tt-1', 'treasury-0', 'SALES_INCOME',   1215.00, 'Sale #SALE-000001 - Cash sales', 'SALE-000001', 'sale-1'),
('tt-2', 'treasury-0', 'MANUAL_EXPENSE',  250.00, 'Daily operational expenses',     'EXP-001',     NULL);

-- سجل الأرصدة اليومية
INSERT INTO `daily_balance_histories` (`id`, `treasury_id`, `date`, `opening_balance`, `closing_balance`, `daily_income`, `daily_expense`, `daily_profit`) VALUES
('dbh-6', 'treasury-6', DATE_SUB(CURDATE(), INTERVAL 6 DAY),  5000.00,  6200.00, 1500.00,  300.00, 1200.00),
('dbh-5', 'treasury-5', DATE_SUB(CURDATE(), INTERVAL 5 DAY),  6200.00,  7450.00, 1600.00,  350.00, 1250.00),
('dbh-4', 'treasury-4', DATE_SUB(CURDATE(), INTERVAL 4 DAY),  7450.00,  8800.00, 1700.00,  350.00, 1350.00),
('dbh-3', 'treasury-3', DATE_SUB(CURDATE(), INTERVAL 3 DAY),  8800.00, 10100.00, 1800.00,  500.00, 1300.00),
('dbh-2', 'treasury-2', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 10100.00, 11450.00, 1650.00,  300.00, 1350.00),
('dbh-1', 'treasury-1', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 11450.00, 12800.00, 1750.00,  400.00, 1350.00),
('dbh-0', 'treasury-0', CURDATE(),                          12800.00, 13765.00, 1215.00,  250.00,  965.00);

-- حركات المخزون (من البيع الأول)
INSERT INTO `inventory_movements` (`id`, `product_id`, `type`, `quantity_change`, `quantity_before`, `quantity_after`, `reference_type`, `reference_id`, `created_by`) VALUES
('im-1', 'prod-laptop', 'SALE', -1,  5,  4, 'sale', 'sale-1', 'user-admin'),
('im-2', 'prod-shirt',  'SALE', -1, 100, 99, 'sale', 'sale-1', 'user-admin');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
