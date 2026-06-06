import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { formatCurrency, formatDate, formatTime, getLocale } from './format'
import { logSettingChange } from './settings-history'

export type Lang = 'en' | 'ar'

const LANG_STORAGE_KEY = 'makhazeny-lang'

interface LangCtx {
  lang: Lang
  isAr: boolean
  locale: string
  toggleLang: () => void
  t: (s: string) => string
  te: (s: string) => string
  td: (s: string) => string
  formatCurrency: (value: number | string) => string
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string
  formatTime: (date: Date | string) => string
}

const Ctx = createContext<LangCtx>({
  lang: 'en',
  isAr: false,
  locale: 'en-GB',
  toggleLang: () => {},
  t: (s) => s,
  te: (s) => s,
  td: (s) => s,
  formatCurrency: (v) => String(v),
  formatDate: (d) => String(d),
  formatTime: (d) => String(d),
})

const AR: Record<string, string> = {
  // App shell
  'Warehouse Management': 'إدارة المستودع',
  'Menu': 'القائمة',
  'Admin User': 'مدير النظام',
  'ADMIN': 'مسؤول',
  'DB': 'قاعدة البيانات',
  'Checking database...': 'جاري التحقق من قاعدة البيانات...',
  'Database connected': 'قاعدة البيانات متصلة',
  'Database disconnected': 'قاعدة البيانات غير متصلة',

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

  // Notifications & settings history
  'Notifications': 'الإشعارات',
  'Settings history': 'سجل الإعدادات',
  'Settings History': 'سجل الإعدادات',
  'Recent changes to app settings': 'التغييرات الأخيرة على إعدادات التطبيق',
  'No settings changes yet': 'لا توجد تغييرات على الإعدادات بعد',
  'active alerts': 'تنبيه نشط',
  'No active alerts': 'لا توجد تنبيهات نشطة',
  'All clear — no alerts right now': 'لا توجد تنبيهات حالياً',
  'Language': 'اللغة',
  'Theme': 'المظهر',
  'Dark mode': 'الوضع الداكن',
  'Light mode': 'الوضع الفاتح',
  'Selected date': 'التاريخ المحدد',
  'Arabic': 'العربية',
  'English': 'الإنجليزية',
  'No treasury record for this day.': 'لا يوجد سجل خزينة لهذا اليوم.',
  'No treasury records in this period.': 'لا توجد سجلات خزينة في هذه الفترة.',
  '7 days before': '7 أيام قبل',
  'Selected': 'المحدد',
  'Pending approval': 'بانتظار الموافقة',
  'left (min': 'متبقي (الحد الأدنى',
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
  'Return Income': 'دخل مرتجع',
  'Treasury Cash Control': 'التحكم في نقد الخزنة',
  'Add money to the cash register or withdraw cash from it.': 'أضف فلوس للخزنة أو اسحب فلوس منها.',
  'Add Money': 'إضافة فلوس',
  'Withdraw Money': 'سحب فلوس',
  'Add Money to Treasury': 'إضافة فلوس للخزنة',
  'Withdraw Money from Treasury': 'سحب فلوس من الخزنة',
  'Amount (EGP)': 'المبلغ (جنيه)',
  'Reason for this transaction': 'سبب العملية',
  'Cash deposit to treasury': 'إيداع نقدي في الخزنة',
  'Cash withdrawal from treasury': 'سحب نقدي من الخزنة',
  'Money added to treasury': 'تمت إضافة الفلوس للخزنة',
  'Money withdrawn from treasury': 'تم سحب الفلوس من الخزنة',
  'Please enter a valid amount': 'أدخل مبلغاً صحيحاً',
  'Please enter a description': 'أدخل وصفاً للعملية',
  'Operation failed': 'فشلت العملية',
  'Inventory Purchase': 'شراء مخزون',
  'Treasury Transaction Description *': 'وصف معاملة الخزنة *',
  'Describe this purchase expense in treasury': 'اكتب وصف مصروف الشراء في الخزنة',
  'Please enter a treasury transaction description': 'أدخل وصف معاملة الخزنة',
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
  'Top Products': 'أفضل المنتجات',
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
  'Close': 'إغلاق',
  'Return': 'إرجاع',
  'Makhazeny': 'مخازني',
  'Select…': 'اختر…',
  'Search…': 'بحث…',
  'No results found.': 'لا توجد نتائج.',

  // Product form
  'Add New Product': 'إضافة منتج جديد',
  'Product Name *': 'اسم المنتج *',
  'Enter product name': 'أدخل اسم المنتج',
  'Category *': 'الفئة *',
  'Select category': 'اختر فئة',
  'Add New Category': 'إضافة فئة جديدة',
  'No supplier': 'بدون مورد',
  'Barcode': 'الباركود',
  'Enter barcode': 'أدخل الباركود',
  'Purchase Price (EGP) *': 'سعر الشراء (جنيه) *',
  'Selling Price (EGP) *': 'سعر البيع (جنيه) *',
  'Initial Quantity *': 'الكمية الأولية *',
  'Low Stock Level *': 'حد المخزون المنخفض *',
  'Enter product description': 'أدخل وصف المنتج',
  'Saving...': 'جاري الحفظ...',
  'Update Product': 'تحديث المنتج',
  'Create Product': 'إنشاء منتج',
  'Category Name': 'اسم الفئة',
  'e.g., Electronics': 'مثال: إلكترونيات',
  'Adding...': 'جاري الإضافة...',
  'Add Category': 'إضافة فئة',
  'Category added successfully': 'تمت إضافة الفئة بنجاح',
  'Failed to add category': 'فشل إضافة الفئة',
  'Product updated successfully': 'تم تحديث المنتج بنجاح',
  'Product created successfully': 'تم إنشاء المنتج بنجاح',
  'Failed to save product': 'فشل حفظ المنتج',
  'Failed to fetch products': 'فشل جلب المنتجات',
  'Delete this product?': 'حذف هذا المنتج؟',
  'Product deleted': 'تم حذف المنتج',
  'Failed to delete': 'فشل الحذف',
  'Failed to delete product': 'فشل حذف المنتج',

  // Customer form
  'Add New Customer': 'إضافة عميل جديد',
  'Customer Name *': 'اسم العميل *',
  'Enter customer name': 'أدخل اسم العميل',
  'Phone Number': 'رقم الهاتف',
  'Email': 'البريد الإلكتروني',
  'Enter city': 'أدخل المدينة',
  'Address': 'العنوان',
  'Enter address': 'أدخل العنوان',
  'Credit Limit (EGP)': 'حد الائتمان (جنيه)',
  'Update Customer': 'تحديث العميل',
  'Create Customer': 'إنشاء عميل',
  'Customer updated successfully': 'تم تحديث العميل بنجاح',
  'Customer created successfully': 'تم إنشاء العميل بنجاح',
  'Failed to save customer': 'فشل حفظ العميل',
  'Failed to fetch customers': 'فشل جلب العملاء',
  'Delete this customer?': 'حذف هذا العميل؟',
  'Customer deleted': 'تم حذف العميل',
  'Failed to delete customer': 'فشل حذف العميل',

  // Supplier form
  'Add New Supplier': 'إضافة مورد جديد',
  'Supplier Name *': 'اسم المورد *',
  'Enter supplier name': 'أدخل اسم المورد',
  'Update Supplier': 'تحديث المورد',
  'Create Supplier': 'إنشاء مورد',
  'Supplier updated successfully': 'تم تحديث المورد بنجاح',
  'Supplier created successfully': 'تم إنشاء المورد بنجاح',
  'Failed to save supplier': 'فشل حفظ المورد',
  'Failed to fetch suppliers': 'فشل جلب الموردين',
  'Delete this supplier?': 'حذف هذا المورد؟',
  'Supplier deleted': 'تم حذف المورد',
  'Failed to delete supplier': 'فشل حذف المورد',

  // POS extended
  'Product / Supplier': 'المنتج / المورد',
  'Payment Type': 'نوع الدفع',
  'Full Payment': 'دفع كامل',
  'Card / Credit Card': 'بطاقة / بطاقة ائتمان',
  'Amount Paid Now': 'المبلغ المدفوع الآن',
  'Pay full': 'دفع كامل',
  'Installment requires a partial payment — use Full Payment instead.': 'القسط يتطلب دفعة جزئية — استخدم الدفع الكامل بدلاً من ذلك.',
  'Amount paid cannot exceed the total': 'المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي',
  '(optional)': '(اختياري)',
  'Paid Now': 'المدفوع الآن',
  'Remaining Debt': 'الدين المتبقي',
  'The remaining': 'المتبقي',
  'will be automatically recorded in the': 'سيُسجَّل تلقائياً في',
  'page.': 'صفحة.',
  'Please select a product and quantity': 'اختر منتجاً وكمية',
  'Product not found': 'المنتج غير موجود',
  'Invalid quantity. Available:': 'كمية غير صالحة. المتاح:',
  'Not enough stock. Available:': 'المخزون غير كافٍ. المتاح:',
  'added to cart': 'أُضيف إلى السلة',
  'Please select a customer': 'اختر عميلاً',
  'Failed to create sale': 'فشل إنشاء عملية البيع',
  'Select customer…': 'اختر عميلاً…',
  'Search products…': 'البحث عن منتجات…',
  'Search customers…': 'البحث عن عملاء…',

  // Sale receipt
  'Sale Receipt': 'إيصال البيع',
  'Printable receipt for sale': 'إيصال قابل للطباعة للبيع',
  'Print / PDF': 'طباعة / PDF',
  'Makhazeny Warehouse': 'مخازني للمستودعات',
  'Sales Receipt': 'إيصال مبيعات',
  'Receipt #': 'رقم الإيصال',
  'Grand Total': 'الإجمالي الكلي',
  'Amount Paid': 'المبلغ المدفوع',
  'Remaining Balance': 'الرصيد المتبقي',
  'Fully Paid': 'مدفوع بالكامل',
  'Partially Paid': 'مدفوع جزئياً',
  'Unpaid / On Credit': 'غير مدفوع / بالآجل',
  'Credit (Pay Later)': 'آجل (ادفع لاحقاً)',
  'Credit': 'آجل',
  'Thank you for your business!': 'شكراً لتعاملك معنا!',
  'Makhazeny Warehouse Management System': 'نظام مخازني لإدارة المستودعات',
  'Failed to open print dialog': 'فشل فتح نافذة الطباعة',
  'Item': 'الصنف',

  // Sales list
  'Failed to fetch sales': 'فشل جلب المبيعات',
  'Could not load sale details': 'تعذر تحميل تفاصيل البيع',
  'Failed to load sale': 'فشل تحميل البيع',
  'Delete this sale? This cannot be undone.': 'حذف هذه العملية؟ لا يمكن التراجع.',
  'Sale deleted': 'تم حذف عملية البيع',
  'Failed to delete sale': 'فشل حذف عملية البيع',
  'Print / Reprint Receipt': 'طباعة / إعادة طباعة الإيصال',
  'No sales recorded for': 'لا توجد مبيعات مسجلة لـ',
  'PAID': 'مدفوع',
  'PARTIAL': 'جزئي',
  'UNPAID': 'غير مدفوع',

  // Debt payment form
  'Record Payment': 'تسجيل دفعة',
  'Select a debt from the list to record a payment.': 'اختر ديناً من القائمة لتسجيل دفعة.',
  'Customer:': 'العميل:',
  'Original Debt:': 'الدين الأصلي:',
  'Already Paid:': 'المدفوع سابقاً:',
  'Remaining:': 'المتبقي:',
  'Payment Amount *': 'مبلغ الدفعة *',
  'Pay Full': 'دفع كامل',
  'Optional payment notes': 'ملاحظات الدفعة (اختياري)',
  'Processing...': 'جاري المعالجة...',
  'Please enter a valid payment amount': 'أدخل مبلغ دفعة صحيحاً',
  'Payment exceeds remaining debt': 'الدفعة تتجاوز الدين المتبقي',
  'Payment recorded successfully': 'تم تسجيل الدفعة بنجاح',
  'Failed to record payment': 'فشل تسجيل الدفعة',
  'ACTIVE': 'نشط',
  'Failed to fetch debts': 'فشل جلب الديون',

  // Returns
  'Failed to fetch returns': 'فشل جلب المرتجعات',
  'Return approved': 'تم قبول الإرجاع',
  'Failed to approve': 'فشل القبول',
  'Failed to approve return': 'فشل قبول الإرجاع',
  'Return rejected': 'تم رفض الإرجاع',
  'Failed to reject return': 'فشل رفض الإرجاع',
  'No returns yet': 'لا توجد مرتجعات بعد',
  'Returns will appear here once processed.': 'ستظهر المرتجعات هنا بعد معالجتها.',
  'PROCESSED': 'تمت المعالجة',

  // Treasury list
  'Failed to fetch treasury records': 'فشل جلب سجلات الخزينة',
  'No treasury history yet.': 'لا يوجد سجل خزينة بعد.',
  'Oldest first': 'الأقدم أولاً',
  'Newest first': 'الأحدث أولاً',
  'Auto Closed': 'إغلاق تلقائي',
  'Closed': 'مغلق',
  'Open': 'مفتوح',
  'Opening': 'الافتتاح',
  'Income': 'الدخل',
  'Expense': 'المصروف',
  'Profit': 'الربح',
  'Closing': 'الإغلاق',
  'carries over →': 'يُرحَّل →',
  'opening': 'افتتاح',
  'days of history': 'يوم من السجل',
  'Total Income': 'إجمالي الدخل',
  'Total Expense': 'إجمالي المصروف',

  // Treasury dashboard
  'Failed to load treasury data': 'فشل تحميل بيانات الخزينة',
  'Failed to close day': 'فشل إغلاق اليوم',
  'Failed to reopen day': 'فشل إعادة فتح اليوم',
  'Treasury was automatically closed at 11:59 PM.': 'تم إغلاق الخزينة تلقائياً الساعة 11:59 مساءً.',
  'Day closed successfully. Balance will carry over to tomorrow.': 'تم إغلاق اليوم بنجاح. سيُرحَّل الرصيد إلى الغد.',
  'Day reopened successfully.': 'تم إعادة فتح اليوم بنجاح.',
  'No treasury record found for': 'لا يوجد سجل خزينة لـ',
  'Day Closed': 'اليوم مغلق',
  'Day Open': 'اليوم مفتوح',
  'Closed at': 'أُغلق في',
  'Reopening...': 'جاري إعادة الفتح...',
  'Reopen Day': 'إعادة فتح اليوم',
  'Closing...': 'جاري الإغلاق...',
  'Close Day & Carry Over Balance': 'إغلاق اليوم وترحيل الرصيد',
  'Final closing balance': 'الرصيد الختامي النهائي',
  'Closing balance': 'الرصيد الختامي',
  'Opening Balance': 'الرصيد الافتتاحي',
  'Carried over from previous day': 'مُرحَّل من اليوم السابق',
  'Expenses': 'المصروفات',
  'This day was automatically closed by the system and cannot be reopened.': 'تم إغلاق هذا اليوم تلقائياً ولا يمكن إعادة فتحه.',
  'will automatically carry over as the opening balance for the next day.': 'سيُرحَّل تلقائياً كرصيد افتتاحي لليوم التالي.',
  'This day is closed.': 'هذا اليوم مغلق.',
  'You can reopen it until 11:59 PM.': 'يمكنك إعادة فتحه حتى 11:59 مساءً.',
  'Failed to fetch transactions': 'فشل جلب المعاملات',
  'Balance Carryover': 'ترحيل الرصيد',

  // App shell / date picker
  'Select a date': 'اختر تاريخاً',
  'Go to Today': 'الذهاب لليوم',
  'Switch to English': 'التبديل إلى الإنجليزية',
  'Switch to Arabic': 'التبديل إلى العربية',

  // Login
  'Warehouse Management System — Sign in to continue': 'نظام إدارة المستودعات — سجّل الدخول للمتابعة',
  'Password': 'كلمة المرور',
  'Signing in...': 'جاري تسجيل الدخول...',
  'Sign In': 'تسجيل الدخول',
  'Login failed': 'فشل تسجيل الدخول',
  'Default: admin@makhazeny.local / admin123': 'الافتراضي: admin@makhazeny.local / admin123',

  // Not found
  '404 Page Not Found': '404 — الصفحة غير موجودة',
  'Did you forget to add the page to the router?': 'هل نسيت إضافة الصفحة إلى الموجّه؟',

  // Reports
  'Coming Soon': 'قريباً',
  'Reports & Analytics will be available soon.': 'التقارير والتحليلات ستكون متاحة قريباً.',
  'Date Range': 'نطاق التاريخ',
  'This Week': 'هذا الأسبوع',
  'This Month': 'هذا الشهر',
  'Please select start and end dates': 'اختر تاريخ البداية والنهاية',
  'Start date must be before end date': 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
  'report generated': 'تم إنشاء التقرير',
  'Failed to generate report': 'فشل إنشاء التقرير',
  'Print': 'طباعة',
  'Collected': 'المُحصَّل',
  'Individual Sales': 'المبيعات الفردية',
  'No sales found for this period.': 'لا توجد مبيعات في هذه الفترة.',
  'Qty:': 'الكمية:',
  'Generated': 'أُنشئ',
  'Out of Stock': 'نفد المخزون',
  'Confidential Report': 'تقرير سري',
  'TOTALS': 'الإجماليات',
  'sale': 'عملية بيع',
  'Period': 'الفترة',
  'to': 'إلى',

  // Return dialog
  'Return from Sale': 'إرجاع من البيع',
  'Process Return': 'معالجة الإرجاع',
  'Please select at least one item to return': 'اختر صنفاً واحداً على الأقل للإرجاع',
  'Failed to create return': 'فشل إنشاء الإرجاع',
  'Return created but approval failed': 'تم إنشاء الإرجاع لكن فشل القبول',
  'Return processed successfully': 'تمت معالجة الإرجاع بنجاح',
  'Failed to process return': 'فشل معالجة الإرجاع',
  'pcs': 'قطعة',
  'Any additional notes...': 'أي ملاحظات إضافية...',

  // Return reasons
  'Defective Product': 'منتج معيب',
  'Wrong Item Sent': 'منتج خاطئ',
  'Customer Request': 'طلب العميل',
  'Damaged in Transit': 'تلف أثناء النقل',
  'Other Reason': 'سبب آخر',

  'Installment Payment': 'دفعة قسط',

  // Validation messages
  'Invalid email address': 'عنوان بريد إلكتروني غير صالح',
  'Password is required': 'كلمة المرور مطلوبة',
  'Password must be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  'Name is required': 'الاسم مطلوب',
  'Product name is required': 'اسم المنتج مطلوب',
  'Category is required': 'الفئة مطلوبة',
  'Price must be positive': 'السعر يجب أن يكون موجباً',
  'Quantity cannot be negative': 'الكمية لا يمكن أن تكون سالبة',
  'Stock level cannot be negative': 'حد المخزون لا يمكن أن يكون سالباً',
  'Category name is required': 'اسم الفئة مطلوب',
  'Invalid email': 'بريد إلكتروني غير صالح',
  'Credit limit cannot be negative': 'حد الائتمان لا يمكن أن يكون سالباً',
  'Customer name is required': 'اسم العميل مطلوب',
  'Supplier name is required': 'اسم المورد مطلوب',
  'Customer is required': 'العميل مطلوب',
  'Product is required': 'المنتج مطلوب',
  'Quantity must be greater than 0': 'الكمية يجب أن تكون أكبر من 0',
  'At least one item is required': 'مطلوب صنف واحد على الأقل',
  'Debt is required': 'الدين مطلوب',
  'Amount must be positive': 'المبلغ يجب أن يكون موجباً',
  'Treasury is required': 'الخزينة مطلوبة',
  'Description is required': 'الوصف مطلوب',
  'Sale is required': 'عملية البيع مطلوبة',

  // API errors
  'Missing required fields': 'حقول مطلوبة ناقصة',
  'Product with this SKU already exists': 'منتج بهذا الرمز موجود بالفعل',
  'Supplier not found': 'المورد غير موجود',
  'Treasury not found': 'الخزينة غير موجودة',
  'Treasury record not found': 'سجل الخزينة غير موجود',
  'Debt not found': 'الدين غير موجود',
  'Sale not found': 'عملية البيع غير موجودة',
  'Return not found': 'الإرجاع غير موجود',
  'Customer not found': 'العميل غير موجود',
  'Sale item not found': 'صنف البيع غير موجود',
  'Unauthorized': 'غير مصرح',
  'Invalid credentials': 'بيانات الدخول غير صحيحة',

  // Report data keys (camelCase → spaced)
  'Total products': 'إجمالي المنتجات',
  'Low stock count': 'مخزون منخفض',
  'Out of stock count': 'نفد المخزون',
  'Total inventory value': 'قيمة المخزون',
  'Total customers': 'إجمالي العملاء',
  'Customers with debt': 'عملاء بديون',
  'Total outstanding debt': 'إجمالي الديون',
  'Overdue debt': 'ديون متأخرة',
  'Total debts': 'إجمالي الديون',
  'Total paid': 'إجمالي المدفوع',
  'Total remaining': 'المتبقي',
  'Payment rate': 'معدل السداد',
  'Total sales': 'إجمالي المبيعات',
  'Total amount': 'إجمالي المبلغ',
  'Total unpaid': 'غير المدفوع',
  'Fast moving products': 'المنتجات سريعة الحركة',
  'Slow moving products': 'المنتجات بطيئة الحركة',
}

function translateDescription(desc: string, lang: Lang): string {
  if (lang !== 'ar' || !desc) return desc

  let m = desc.match(/^New product: (.+) \((\d+) x EGP ([\d.]+)\)$/)
  if (m) return `منتج جديد: ${m[1]} (${m[2]} × ${m[3]} جنيه)`

  m = desc.match(/^Stock restock: (.+) \((\d+) x EGP ([\d.]+)\)$/)
  if (m) return `إعادة تخزين: ${m[1]} (${m[2]} × ${m[3]} جنيه)`

  m = desc.match(/^Return income — stock recovered from sale (.+)$/)
  if (m) return `دخل مرتجع — استرداد مخزون من البيع ${m[1]}`

  m = desc.match(/^Balance carried over from (.+)$/)
  if (m) return `رصيد مُرحَّل من ${m[1]}`

  m = desc.match(/^Sale #(.+) — (.+)$/)
  if (m) {
    const method = AR[m[2]] ?? m[2]
    return `بيع #${m[1]} — ${method}`
  }

  m = desc.match(/^Debt payment from (.+)$/)
  if (m) return `دفعة دين من ${m[1]}`

  const insufficient = desc.match(/^Insufficient stock for (.+)$/)
  if (insufficient) return `المخزون غير كافٍ لـ ${insufficient[1]}`

  return AR[desc] ?? desc
}

function translateError(msg: string, lang: Lang): string {
  if (lang !== 'ar' || !msg) return msg
  if (AR[msg]) return AR[msg]

  const productMissing = msg.match(/^Product (.+) not found$/)
  if (productMissing) return `المنتج ${productMissing[1]} غير موجود`

  return translateDescription(msg, lang)
}

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'ar' || stored === 'en') return stored
  } catch { /* ignore */ }
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const root = document.documentElement
    root.dir = lang === 'ar' ? 'rtl' : 'ltr'
    root.lang = lang
    try { localStorage.setItem(LANG_STORAGE_KEY, lang) } catch { /* ignore */ }
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    logSettingChange('language', 'Language', lang === 'ar' ? 'Arabic' : 'English')
  }, [lang])

  const toggleLang = () => setLang((l) => (l === 'en' ? 'ar' : 'en'))
  const t = useCallback((s: string): string => (lang === 'ar' ? (AR[s] ?? s) : s), [lang])
  const te = useCallback((s: string): string => translateError(s, lang), [lang])
  const td = useCallback((s: string): string => translateDescription(s, lang), [lang])
  const isAr = lang === 'ar'
  const locale = getLocale(lang)
  const fmtCurrency = useCallback((v: number | string) => formatCurrency(v, lang), [lang])
  const fmtDate = useCallback((d: Date | string, opts?: Intl.DateTimeFormatOptions) => formatDate(d, lang, opts), [lang])
  const fmtTime = useCallback((d: Date | string) => formatTime(d, lang), [lang])

  return (
    <Ctx.Provider value={{
      lang, isAr, locale, toggleLang, t, te, td,
      formatCurrency: fmtCurrency,
      formatDate: fmtDate,
      formatTime: fmtTime,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLanguage() {
  return useContext(Ctx)
}
