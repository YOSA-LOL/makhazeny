import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'en' | 'ar'

interface LangCtx {
  lang: Lang
  isAr: boolean
  toggleLang: () => void
  t: (s: string) => string
}

const Ctx = createContext<LangCtx>({
  lang: 'en',
  isAr: false,
  toggleLang: () => {},
  t: (s) => s,
})

const AR: Record<string, string> = {
  // App shell
  'Warehouse Management': 'إدارة المستودع',
  'Menu': 'القائمة',
  'Admin User': 'مدير النظام',
  'ADMIN': 'مسؤول',

  // Nav items
  'Dashboard': 'لوحة التحكم',
  'Products': 'المنتجات',
  'Customers': 'العملاء',
  'Suppliers': 'الموردون',
  'Sales': 'المبيعات',
  'Treasury': 'الخزينة',
  'Debts': 'الديون',
  'Returns': 'المرتجعات',
  'Reports': 'التقارير',

  // Page titles
  'Products Management': 'إدارة المنتجات',
  'Customers Management': 'إدارة العملاء',
  'Suppliers Management': 'إدارة الموردين',
  'Sales & POS System': 'نقطة البيع والمبيعات',
  'Debt & Installment Management': 'إدارة الديون والأقساط',
  'Treasury & Cash Register': 'الخزينة وسجل النقد',
  'Sales Returns Management': 'إدارة المرتجعات',
  'Reports & Analytics': 'التقارير والتحليلات',

  // Page descriptions
  'Live overview of your warehouse operations.': 'نظرة عامة مباشرة على عمليات المستودع.',
  'Manage inventory, pricing, and stock levels for all warehouse products.': 'إدارة المخزون والأسعار ومستويات المخزون لجميع المنتجات.',
  'Manage customer profiles, credit limits, and outstanding balances.': 'إدارة ملفات العملاء وحدود الائتمان والأرصدة المستحقة.',
  'Manage supplier contacts and track purchase balances.': 'إدارة جهات اتصال الموردين وتتبع أرصدة المشتريات.',
  'Process point-of-sale transactions and review sales history.': 'معالجة معاملات نقطة البيع ومراجعة سجل المبيعات.',
  'Monitor outstanding customer debts and record installment payments.': 'مراقبة الديون المستحقة وتسجيل مدفوعات الأقساط.',
  'Track daily cash flow, income, expenses, and transaction history.': 'تتبع التدفق النقدي اليومي والدخل والمصروفات.',
  'Review, approve, or reject customer return requests.': 'مراجعة طلبات الإرجاع وقبولها أو رفضها.',
  'Generate sales, inventory, customer, and debt reports for any date range.': 'إنشاء تقارير المبيعات والمخزون والعملاء والديون.',

  // Tabs
  'Products List': 'قائمة المنتجات',
  'Add Product': 'إضافة منتج',
  'Edit Product': 'تعديل منتج',
  'Customers List': 'قائمة العملاء',
  'Add Customer': 'إضافة عميل',
  'Edit Customer': 'تعديل عميل',
  'Suppliers List': 'قائمة الموردين',
  'Add Supplier': 'إضافة مورد',
  'Edit Supplier': 'تعديل مورد',
  'Point of Sale (POS)': 'نقطة البيع',
  'Sales History': 'سجل المبيعات',
  'All Transactions': 'جميع المعاملات',
  'Daily History': 'السجل اليومي',

  // Dashboard
  'New Sale': 'بيع جديد',
  'Total Products': 'إجمالي المنتجات',
  'Total Sales': 'إجمالي المبيعات',
  'Outstanding Debts': 'الديون المستحقة',
  'Revenue — Last 7 Days': 'الإيرادات — آخر 7 أيام',
  'All time total': 'الإجمالي الكلي',
  'Orders / Day': 'الطلبات / يوم',
  'Sales volume last 7 days': 'حجم المبيعات آخر 7 أيام',
  'Recent Sales': 'آخر المبيعات',
  'View all': 'عرض الكل',
  'No sales yet.': 'لا توجد مبيعات بعد.',
  'Low Stock Alerts': 'تنبيهات نقص المخزون',
  'Manage': 'إدارة',
  'All stock levels are healthy!': 'جميع مستويات المخزون طبيعية!',
  'Out of stock': 'نفد المخزون',
  'left': 'متبقي',
  'orders': 'طلبات',
  'low stock': 'مخزون منخفض',
  'out': 'نفد',
  'with outstanding debt': 'بديون مستحقة',
  'Today': 'اليوم',
  'overdue': 'متأخر',

  // Product list
  'products total': 'منتج إجمالاً',
  'Search products...': 'البحث عن منتجات...',
  'No products found': 'لا توجد منتجات',
  'Add your first product to get started.': 'أضف منتجك الأول للبدء.',
  'Try a different search term.': 'جرب مصطلح بحث مختلف.',
  'Product': 'المنتج',
  'SKU': 'الرمز',
  'Category': 'الفئة',
  'Stock': 'المخزون',
  'Price': 'السعر',
  'Cost': 'التكلفة',
  'Status': 'الحالة',
  'Actions': 'الإجراءات',
  'Low stock': 'مخزون منخفض',
  'In stock': 'متاح',
  '← Prev': '→ السابق',
  'Next →': 'التالي ←',

  // Customer list
  'customers total': 'عميل إجمالاً',
  'Search customers...': 'البحث عن عملاء...',
  'No customers found': 'لا يوجد عملاء',
  'Add your first customer to get started.': 'أضف أول عميل للبدء.',
  'Name': 'الاسم',
  'Phone': 'الهاتف',
  'City': 'المدينة',
  'Outstanding': 'المستحق',
  'Credit Limit': 'حد الائتمان',
  'Overdue': 'متأخر',
  'Has debt': 'لديه دين',
  'Good standing': 'وضع جيد',

  // Supplier list
  'suppliers total': 'مورد إجمالاً',
  'Search suppliers...': 'البحث عن موردين...',
  'No suppliers found': 'لا يوجد موردون',
  'Add your first supplier to get started.': 'أضف أول مورد للبدء.',
  'Supplier': 'المورد',
  'Balance': 'الرصيد',

  // Sales list
  'Sales Transactions': 'معاملات البيع',
  'sales total': 'عملية بيع إجمالاً',
  'Search sales...': 'البحث في المبيعات...',
  'No sales found': 'لا توجد مبيعات',
  'Create your first sale using the POS.': 'أنشئ أول عملية بيع باستخدام نقطة البيع.',
  'Sale #': 'رقم البيع',
  'Customer': 'العميل',
  'Total': 'الإجمالي',
  'Paid': 'المدفوع',
  'Method': 'طريقة الدفع',
  'Date': 'التاريخ',

  // POS form
  'Add Products to Sale': 'إضافة منتجات للبيع',
  'Qty': 'الكمية',
  'Add to Cart': 'إضافة للسلة',
  'Cart': 'السلة',
  'Cart is empty': 'السلة فارغة',
  'Add products above to start a sale': 'أضف منتجات للبدء في البيع',
  'items': 'عناصر',
  'item': 'عنصر',
  'Unit Price': 'سعر الوحدة',
  'Subtotal': 'المجموع الفرعي',
  'Sale Summary': 'ملخص البيع',
  'Customer *': 'العميل *',
  'Select customer': 'اختر عميلاً',
  'Payment Method': 'طريقة الدفع',
  'Notes': 'ملاحظات',
  'Add notes…': 'أضف ملاحظات...',
  'Line items': 'البنود',
  'Total units': 'إجمالي الوحدات',
  'Complete Sale': 'إتمام البيع',
  'Processing…': 'جاري المعالجة...',
  'in stock': 'في المخزون',
  'Choose a product…': 'اختر منتجاً...',
  'Cash': 'نقداً',
  'Card': 'بطاقة',
  'Check': 'شيك',
  'Bank Transfer': 'تحويل بنكي',
  'Other': 'أخرى',

  // Debts list
  'records': 'سجل',
  'No active debts': 'لا توجد ديون نشطة',
  'All clear in this category.': 'لا شيء في هذه الفئة.',
  'Active': 'نشط',
  'Partial': 'جزئي',
  'Original': 'المبلغ الأصلي',
  'Remaining': 'المتبقي',
  'Progress': 'التقدم',
  'Due Date': 'تاريخ الاستحقاق',
  'paid': 'مدفوع',
  'Pay': 'دفع',

  // Treasury dashboard
  'Current Balance': 'الرصيد الحالي',
  "Today's closing balance": 'الرصيد الختامي اليوم',
  'Today Income': 'دخل اليوم',
  'Sales + Installments': 'مبيعات + أقساط',
  'Today Expenses': 'مصروفات اليوم',
  'Payments + Operational': 'مدفوعات + تشغيل',
  'Today Profit': 'ربح اليوم',
  'Income - Expenses': 'الدخل - المصروفات',
  'Transactions': 'المعاملات',
  'Cash movements': 'حركات نقدية',

  // Treasury transactions
  'transactions': 'معاملة',
  'All Types': 'جميع الأنواع',
  'Sales Income': 'دخل المبيعات',
  'Installments': 'الأقساط',
  'Manual Income': 'دخل يدوي',
  'Supplier Payment': 'دفعة مورد',
  'Manual Expense': 'مصروف يدوي',
  'Installment': 'قسط',
  'Return Refund': 'استرداد المرتجع',
  'Time': 'الوقت',
  'Type': 'النوع',
  'Description': 'الوصف',
  'Reference': 'المرجع',
  'Amount': 'المبلغ',
  'No transactions found': 'لا توجد معاملات',
  'Try changing the filter or adding a transaction.': 'جرب تغيير الفلتر أو إضافة معاملة.',

  // Returns list
  'Sales Returns': 'المرتجعات',
  'Return #': 'رقم الإرجاع',
  'Reason': 'السبب',
  'Items': 'العناصر',
  'Return Amount': 'مبلغ الإرجاع',
  'Approve': 'قبول',
  'Reject': 'رفض',
  'PENDING': 'قيد الانتظار',
  'APPROVED': 'مقبول',
  'REJECTED': 'مرفوض',

  // Reports
  'Generate Reports': 'إنشاء التقارير',
  'Start Date': 'تاريخ البداية',
  'End Date': 'تاريخ النهاية',
  'Sales Report': 'تقرير المبيعات',
  'Products Report': 'تقرير المنتجات',
  'Customers Report': 'تقرير العملاء',
  'Debts Report': 'تقرير الديون',
  'Inventory Report': 'تقرير المخزون',
  'Total Revenue': 'إجمالي الإيرادات',
  'Unpaid': 'غير مدفوع',
  'Top 10 Products': 'أفضل 10 منتجات',
  'Low Stock': 'مخزون منخفض',
  'Inventory Value': 'قيمة المخزون',
  'Total Customers': 'إجمالي العملاء',
  'With Debt': 'لديهم ديون',
  'Total Debt': 'إجمالي الديون',
  'Total Debts': 'إجمالي الديون',
  'Total Paid': 'إجمالي المدفوع',
  'Still Unpaid': 'لا يزال غير مدفوع',
  'Payment Rate': 'معدل السداد',
  'Fast Moving Products': 'المنتجات سريعة الحركة',
  'Slow Moving Products': 'المنتجات بطيئة الحركة',
  'units': 'وحدات',
  'No sales': 'لا مبيعات',
  'Export': 'تصدير',
  'Report': 'تقرير',
  'sales': 'مبيعات',
  'products': 'منتجات',
  'customers': 'عملاء',
  'debts': 'ديون',
  'inventory': 'مخزون',

  // Common
  'Search': 'بحث',
  'Add': 'إضافة',
  'Edit': 'تعديل',
  'Delete': 'حذف',
  'Save': 'حفظ',
  'Cancel': 'إلغاء',
  'Previous': 'السابق',
  'Next': 'التالي',
  'Showing': 'عرض',
  'of': 'من',
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const root = document.documentElement
    root.dir = lang === 'ar' ? 'rtl' : 'ltr'
    root.lang = lang
  }, [lang])

  const toggleLang = () => setLang((l) => (l === 'en' ? 'ar' : 'en'))
  const t = (s: string): string => (lang === 'ar' ? (AR[s] ?? s) : s)
  const isAr = lang === 'ar'

  return <Ctx.Provider value={{ lang, isAr, toggleLang, t }}>{children}</Ctx.Provider>
}

export function useLanguage() {
  return useContext(Ctx)
}
