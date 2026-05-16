import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'
import { Decimal } from 'decimal.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data (optional - comment out if you want to preserve data)
  await prisma.notification.deleteMany()
  await prisma.treasuryTransaction.deleteMany()
  await prisma.dailyBalanceHistory.deleteMany()
  await prisma.treasury.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.return.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.debt.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.salesItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.inventoryLog.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  console.log('✓ Cleared existing data')

  // Create Users
  const adminPassword = await bcryptjs.hash('admin123', 10)
  const accountantPassword = await bcryptjs.hash('accountant123', 10)
  const employeePassword = await bcryptjs.hash('employee123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@makhazeny.local',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@makhazeny.local',
      password: accountantPassword,
      name: 'Accountant User',
      role: 'ACCOUNTANT',
    },
  })

  const employee = await prisma.user.create({
    data: {
      email: 'employee@makhazeny.local',
      password: employeePassword,
      name: 'Employee User',
      role: 'EMPLOYEE',
    },
  })

  console.log('✓ Created users')

  // Create Categories
  const electronics = await prisma.category.create({
    data: { name: 'Electronics' },
  })

  const clothing = await prisma.category.create({
    data: { name: 'Clothing' },
  })

  const groceries = await prisma.category.create({
    data: { name: 'Groceries' },
  })

  console.log('✓ Created categories')

  // Create Products
  const laptop = await prisma.product.create({
    data: {
      name: 'Laptop Computer',
      sku: 'LAPTOP-001',
      description: 'High-performance laptop',
      categoryId: electronics.id,
      purchasePrice: new Decimal('800'),
      sellingPrice: new Decimal('1200'),
      quantity: 5,
      lowStockLevel: 2,
      barcode: '1234567890001',
    },
  })

  const phone = await prisma.product.create({
    data: {
      name: 'Smartphone',
      sku: 'PHONE-001',
      description: 'Latest smartphone model',
      categoryId: electronics.id,
      purchasePrice: new Decimal('400'),
      sellingPrice: new Decimal('600'),
      quantity: 15,
      lowStockLevel: 5,
      barcode: '1234567890002',
    },
  })

  const shirt = await prisma.product.create({
    data: {
      name: 'Cotton T-Shirt',
      sku: 'SHIRT-001',
      description: 'Comfortable cotton shirt',
      categoryId: clothing.id,
      purchasePrice: new Decimal('5'),
      sellingPrice: new Decimal('15'),
      quantity: 100,
      lowStockLevel: 20,
      barcode: '1234567890003',
    },
  })

  const rice = await prisma.product.create({
    data: {
      name: 'White Rice 5kg',
      sku: 'RICE-001',
      description: 'Premium white rice',
      categoryId: groceries.id,
      purchasePrice: new Decimal('10'),
      sellingPrice: new Decimal('15'),
      quantity: 50,
      lowStockLevel: 10,
      barcode: '1234567890004',
    },
  })

  console.log('✓ Created products')

  // Create Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Tech Supply Co',
      phone: '+1234567890',
      email: 'supplier@techco.com',
      address: '123 Tech Street',
      city: 'Tech City',
      balance: new Decimal('0'),
    },
  })

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Fashion Wholesale',
      phone: '+0987654321',
      email: 'supplier@fashion.com',
      address: '456 Fashion Ave',
      city: 'Fashion City',
      balance: new Decimal('0'),
    },
  })

  console.log('✓ Created suppliers')

  // Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Ahmed Hassan',
      phone: '+201001234567',
      email: 'ahmed@example.com',
      address: '789 Main St',
      city: 'Cairo',
      creditLimit: new Decimal('10000'),
    },
  })

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Fatima Mohamed',
      phone: '+201101234567',
      email: 'fatima@example.com',
      address: '101 King Street',
      city: 'Alexandria',
      creditLimit: new Decimal('5000'),
    },
  })

  console.log('✓ Created customers')

  // Create a sample sale
  const sale = await prisma.sale.create({
    data: {
      saleNumber: 'SALE-001',
      customerId: customer1.id,
      totalAmount: new Decimal('1215'),
      paidAmount: new Decimal('600'),
      status: 'PARTIAL',
      paymentMethod: 'CASH',
      items: {
        create: [
          {
            productId: laptop.id,
            quantity: 1,
            price: new Decimal('1200'),
            total: new Decimal('1200'),
          },
          {
            productId: shirt.id,
            quantity: 1,
            price: new Decimal('15'),
            total: new Decimal('15'),
          },
        ],
      },
    },
  })

  console.log('✓ Created sale')

  // Create debt for the sale
  const debt = await prisma.debt.create({
    data: {
      saleId: sale.id,
      customerId: customer1.id,
      originalAmount: new Decimal('1215'),
      remainingAmount: new Decimal('615'),
      status: 'PARTIAL',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  console.log('✓ Created debt')

  // Create Treasury Records for last 7 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let runningBalance = new Decimal('5000') // Starting balance

  for (let i = 6; i >= 0; i--) {
    const treasuryDate = new Date(today)
    treasuryDate.setDate(treasuryDate.getDate() - i)

    // Daily transactions
    const dailyIncome = i === 0 ? new Decimal('1215') : new Decimal((Math.random() * 2000 + 1000).toFixed(2))
    const dailyExpense = i === 0 ? new Decimal('250') : new Decimal((Math.random() * 500 + 100).toFixed(2))
    const dailyProfit = dailyIncome.minus(dailyExpense)
    const closingBalance = runningBalance.plus(dailyProfit)

    const treasury = await prisma.treasury.create({
      data: {
        date: treasuryDate,
        openingBalance: runningBalance,
        closingBalance: closingBalance,
        notes: `Daily treasury record for ${treasuryDate.toDateString()}`,
      },
    })

    // Create transactions for today
    if (i === 0) {
      // Today's sale transaction
      await prisma.treasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'SALES_INCOME',
          amount: new Decimal('1215'),
          description: 'Sale #SALE-001 - Cash sales',
          saleId: sale.id,
          reference: 'SALE-001',
        },
      })

      // Today's expense transaction
      await prisma.treasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'MANUAL_EXPENSE',
          amount: new Decimal('250'),
          description: 'Daily operational expenses',
          reference: 'EXP-001',
        },
      })
    } else {
      // Random historical transactions
      const randomIncome = new Decimal((Math.random() * 1000 + 800).toFixed(2))
      const randomExpense = new Decimal((Math.random() * 400 + 50).toFixed(2))

      await prisma.treasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'SALES_INCOME',
          amount: randomIncome,
          description: `Sales income for ${treasuryDate.toDateString()}`,
          reference: `SALE-${100 + i}`,
        },
      })

      await prisma.treasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'MANUAL_EXPENSE',
          amount: randomExpense,
          description: `Operational expenses for ${treasuryDate.toDateString()}`,
          reference: `EXP-${100 + i}`,
        },
      })
    }

    // Create daily balance history
    await prisma.dailyBalanceHistory.create({
      data: {
        treasuryId: treasury.id,
        date: treasuryDate,
        openingBalance: runningBalance,
        closingBalance: closingBalance,
        dailyIncome: dailyIncome,
        dailyExpense: dailyExpense,
        dailyProfit: dailyProfit,
      },
    })

    runningBalance = closingBalance
  }

  console.log('✓ Created treasury records for 7 days')

  // Create some expenses
  await prisma.expense.create({
    data: {
      category: 'RENT',
      description: 'Monthly rent payment',
      amount: new Decimal('2000'),
      paymentMethod: 'TRANSFER',
      notes: 'Warehouse rent',
    },
  })

  console.log('✓ Created expenses')

  console.log('✅ Seed completed successfully!')
  console.log('\n📝 Test Credentials:')
  console.log('  Admin:      admin@makhazeny.local / admin123')
  console.log('  Accountant: accountant@makhazeny.local / accountant123')
  console.log('  Employee:   employee@makhazeny.local / employee123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
