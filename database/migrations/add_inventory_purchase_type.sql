-- Add INVENTORY_PURCHASE to treasury transaction types (run once on existing databases)
USE `makhazeny`;

ALTER TABLE `treasury_transactions`
  MODIFY COLUMN `type` ENUM(
    'SALES_INCOME',
    'INSTALLMENT_PAYMENT',
    'SUPPLIER_PAYMENT',
    'RETURN_REFUND',
    'MANUAL_EXPENSE',
    'MANUAL_INCOME',
    'INVENTORY_PURCHASE',
    'BALANCE_CARRYOVER'
  ) NOT NULL COMMENT 'نوع الحركة';
