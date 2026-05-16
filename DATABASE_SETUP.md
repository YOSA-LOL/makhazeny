# Makhazeny WMS - Database Setup Guide

## Prerequisites
- MySQL 8.0+ installed and running
- Node.js 18+ 
- pnpm (already installed)

## Setup Steps

### 1. Configure Database Connection

Edit `.env.local` and update the `DATABASE_URL`:

```bash
# For Local MySQL
DATABASE_URL="mysql://root:password@localhost:3306/makhazeny_wms"

# For PlanetScale (MySQL-compatible)
DATABASE_URL="mysql://user:password@host/database?sslaccept=strict"

# For AWS RDS MySQL
DATABASE_URL="mysql://admin:password@hostname:3306/database"
```

### 2. Create Database (if using local MySQL)

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE makhazeny_wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit MySQL
exit
```

### 3. Push Schema to Database

```bash
# This creates all tables based on prisma/schema.prisma
pnpm db:push
```

When prompted, confirm that you want to create the tables.

### 4. Seed Test Data

```bash
# This populates the database with test data including treasury records
pnpm db:seed
```

### 5. Verify Setup

Access Prisma Studio to view data:

```bash
pnpm db:studio
```

This opens a web interface at http://localhost:5555 where you can view and manage database records.

## Test Credentials

After seeding, you can login with these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@makhazeny.local | admin123 |
| Accountant | accountant@makhazeny.local | accountant123 |
| Employee | employee@makhazeny.local | employee123 |

## Database Schema Overview

### Core Models
- **User**: System users with ADMIN, ACCOUNTANT, EMPLOYEE roles
- **Product**: Inventory items with pricing and quantity tracking
- **Category**: Product categories
- **Supplier**: Vendor information and payment tracking

### Sales & Customers
- **Customer**: Client information with credit limits
- **Sale**: Sales transactions with items and payment status
- **SalesItem**: Individual items in a sale
- **Debt**: Outstanding customer debts from sales
- **Payment**: Debt payment records

### Supplier Management
- **PurchaseOrder**: Purchase orders from suppliers
- **PurchaseItem**: Items in a purchase order
- **SupplierPayment**: Payments made to suppliers

### Treasury/Cash Register
- **Treasury**: Daily cash register records
- **TreasuryTransaction**: Individual transactions (income/expenses)
- **DailyBalanceHistory**: Historical daily balance tracking
  - Stores opening/closing balance
  - Daily income, expense, and profit calculations
  - Automatic carry-forward to next day

### Additional Features
- **Return**: Product returns with reason tracking
- **ReturnItem**: Items in a return
- **Expense**: General business expenses
- **InventoryLog**: Inventory adjustment history
- **Notification**: System notifications

## Important Notes

### Treasury System Features
1. **Automatic Balance Carry-Forward**: Opening balance for each day is automatically set to the previous day's closing balance
2. **Transaction Types**:
   - SALES_INCOME: Income from sales
   - INSTALLMENT_PAYMENT: Customer installment payments
   - SUPPLIER_PAYMENT: Payments to suppliers
   - RETURN_REFUND: Refunds from returns
   - MANUAL_EXPENSE: Manual expense entries
   - MANUAL_INCOME: Manual income entries

3. **Daily Calculations**:
   - Daily Income = Sales + Installment Payments + Other Income
   - Daily Expense = Supplier Payments + Operational Expenses + Returns
   - Daily Profit = Daily Income - Daily Expense
   - Closing Balance = Opening Balance + Daily Profit

### Decimal Precision
All monetary values use Decimal fields (12,2) to prevent float precision errors in financial calculations.

## Troubleshooting

### Connection Issues
If `pnpm db:push` fails with connection error:
1. Verify MySQL is running: `mysql -u root -p` (should connect)
2. Check DATABASE_URL format in `.env.local`
3. Ensure database exists or DATABASE_URL points to correct host

### Seed Script Issues
If `pnpm db:seed` fails:
1. Ensure `pnpm db:push` completed successfully
2. Check that all tables exist: `pnpm db:studio`
3. Clear data manually if conflicts: `pnpm db:push --force` (use with caution)

### Next.js Dev Server Issues
After setting up database:
1. Run `pnpm dev` to start development server
2. Visit http://localhost:3000/login
3. Login with test credentials above

## Data Structure

The seed script creates:
- 3 test users (Admin, Accountant, Employee)
- 3 product categories
- 4 sample products
- 2 suppliers
- 2 customers
- 1 sample sale with debt
- 7 days of treasury records with automatic daily balance carry-forward
- Historical expenses and transactions

This allows you to immediately start testing the application with realistic data.
