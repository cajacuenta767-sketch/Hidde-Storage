import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const markets = pgTable(
  'markets',
  {
    code: text('code').primaryKey(),
    name: text('name').notNull(),
    currency: text('currency').notNull(),
    currencySymbol: text('currency_symbol').default('').notNull(),
    locale: text('locale').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    check('markets_code_check', sql`${table.code} in ('PE', 'BO')`),
    check('markets_currency_check', sql`${table.currency} in ('PEN', 'BOB')`),
    check(
      'markets_code_currency_check',
      sql`(${table.code} = 'PE' and ${table.currency} = 'PEN') or (${table.code} = 'BO' and ${table.currency} = 'BOB')`,
    ),
  ],
);

export const accessTypes = pgTable(
  'access_types',
  {
    code: text('code').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      'access_types_code_check',
      sql`${table.code} in ('PROFILE', 'FULL_ACCOUNT')`,
    ),
  ],
);

export const durations = pgTable(
  'durations',
  {
    months: smallint('months').primaryKey(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    check('durations_months_check', sql`${table.months} in (1, 3, 6, 12)`),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('categories_slug_uidx').on(table.slug)],
);

export const products = pgTable(
  'products',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    categoryId: bigint('category_id', { mode: 'number' })
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    serviceName: text('service_name').notNull(),
    planName: text('plan_name').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    description: text('description').notNull(),
    sellerLabel: text('seller_label').notNull(),
    billingLabel: text('billing_label').default('/ mes').notNull(),
    deliveryLabel: text('delivery_label')
      .default('Entrega inmediata')
      .notNull(),
    accentColor: text('accent_color').notNull(),
    accentSoftColor: text('accent_soft_color').notNull(),
    artworkClass: text('artwork_class').notNull(),
    mark: text('mark').notNull(),
    imagePath: text('image_path').default('').notNull(),
    imageAlt: text('image_alt').default('').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('products_slug_uidx').on(table.slug),
    index('products_category_id_idx').on(table.categoryId),
  ],
);

export const marketPrices = pgTable(
  'market_prices',
  {
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    amountMinor: integer('amount_minor').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.marketCode] }),
    check('market_prices_amount_positive_check', sql`${table.amountMinor} > 0`),
    index('market_prices_market_code_idx').on(table.marketCode),
  ],
);

export const offerVariants = pgTable(
  'offer_variants',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    accessTypeCode: text('access_type_code')
      .notNull()
      .references(() => accessTypes.code, { onDelete: 'restrict' }),
    durationMonths: smallint('duration_months')
      .notNull()
      .references(() => durations.months, { onDelete: 'restrict' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    amountMinor: integer('amount_minor'),
    compareAtAmountMinor: integer('compare_at_amount_minor'),
    sourceCurrency: text('source_currency'),
    sourceAmountMinor: integer('source_amount_minor'),
    exchangeRate: numeric('exchange_rate', { precision: 14, scale: 6 }),
    discountBasisPoints: integer('discount_basis_points').default(0).notNull(),
    pricingSource: text('pricing_source').default('').notNull(),
    stock: integer('stock').default(0).notNull(),
    deliveryLabel: text('delivery_label')
      .default('Entrega después de confirmar el pago')
      .notNull(),
    warrantyDays: integer('warranty_days').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('offer_variants_selection_uidx').on(
      table.productId,
      table.accessTypeCode,
      table.durationMonths,
      table.marketCode,
    ),
    check(
      'offer_variants_amount_positive_check',
      sql`${table.amountMinor} is null or ${table.amountMinor} > 0`,
    ),
    check(
      'offer_variants_compare_amount_positive_check',
      sql`${table.compareAtAmountMinor} is null or ${table.compareAtAmountMinor} > 0`,
    ),
    check(
      'offer_variants_source_amount_positive_check',
      sql`${table.sourceAmountMinor} is null or ${table.sourceAmountMinor} > 0`,
    ),
    check(
      'offer_variants_source_currency_check',
      sql`${table.sourceCurrency} is null or ${table.sourceCurrency} in ('PEN', 'USD')`,
    ),
    check(
      'offer_variants_discount_range_check',
      sql`${table.discountBasisPoints} between 0 and 10000`,
    ),
    check('offer_variants_stock_nonnegative_check', sql`${table.stock} >= 0`),
    check(
      'offer_variants_warranty_positive_check',
      sql`${table.warrantyDays} > 0`,
    ),
    index('offer_variants_product_idx').on(table.productId),
    index('offer_variants_market_idx').on(table.marketCode),
  ],
);

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    baseCurrency: text('base_currency').notNull(),
    quoteCurrency: text('quote_currency').notNull(),
    rate: numeric('rate', { precision: 14, scale: 6 }).notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url').notNull(),
    effectiveDate: date('effective_date').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('exchange_rates_pair_date_uidx').on(
      table.baseCurrency,
      table.quoteCurrency,
      table.effectiveDate,
    ),
    check('exchange_rates_positive_check', sql`${table.rate} > 0`),
    check(
      'exchange_rates_currency_check',
      sql`${table.baseCurrency} in ('USD', 'PEN') and ${table.quoteCurrency} in ('PEN', 'BOB')`,
    ),
    index('exchange_rates_active_pair_idx').on(
      table.baseCurrency,
      table.quoteCurrency,
      table.isActive,
    ),
  ],
);

export const paymentMethods = pgTable(
  'payment_methods',
  {
    code: text('code').notNull(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    instructions: text('instructions').notNull(),
    imagePath: text('image_path').default('').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.code, table.marketCode] }),
    index('payment_methods_market_idx').on(table.marketCode, table.sortOrder),
  ],
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    productId: bigint('product_id', { mode: 'number' }).notNull(),
    marketCode: text('market_code').notNull(),
    encryptedPayload: text('encrypted_payload').notNull(),
    encryptionIv: text('encryption_iv').notNull(),
    encryptionKeyVersion: smallint('encryption_key_version')
      .default(1)
      .notNull(),
    status: text('status').default('available').notNull(),
    reservedUntil: timestamp('reserved_until', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.productId, table.marketCode],
      foreignColumns: [marketPrices.productId, marketPrices.marketCode],
      name: 'inventory_items_market_price_fk',
    }).onDelete('restrict'),
    check(
      'inventory_items_status_check',
      sql`${table.status} in ('available', 'reserved', 'delivered', 'invalidated')`,
    ),
    check(
      'inventory_items_reservation_check',
      sql`(${table.status} = 'reserved' and ${table.reservedUntil} is not null) or (${table.status} <> 'reserved')`,
    ),
    index('inventory_items_product_market_idx').on(
      table.productId,
      table.marketCode,
    ),
    index('inventory_items_available_idx')
      .on(table.productId, table.marketCode, table.createdAt)
      .where(sql`${table.status} = 'available'`),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phoneE164: text('phone_e164').notNull(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    passwordHash: text('password_hash').notNull(),
    role: text('role').default('customer').notNull(),
    status: text('status').default('active').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('customers_email_uidx').on(table.email),
    uniqueIndex('customers_phone_e164_uidx').on(table.phoneE164),
    check('customers_role_check', sql`${table.role} in ('customer', 'admin')`),
    check(
      'customers_status_check',
      sql`${table.status} in ('active', 'blocked', 'deleted')`,
    ),
    index('customers_market_idx').on(table.marketCode),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_uidx').on(table.tokenHash),
    index('auth_sessions_customer_idx').on(table.customerId),
    index('auth_sessions_expiry_idx').on(table.expiresAt),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_hash_uidx').on(table.tokenHash),
    index('password_reset_tokens_customer_idx').on(table.customerId),
    index('password_reset_tokens_expiry_idx').on(table.expiresAt),
  ],
);

export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    identifierHash: text('identifier_hash').notNull(),
    action: text('action').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('auth_rate_limits_identifier_action_uidx').on(
      table.identifierHash,
      table.action,
    ),
    check('auth_rate_limits_attempts_check', sql`${table.attempts} >= 0`),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    offerVariantId: bigint('offer_variant_id', { mode: 'number' })
      .notNull()
      .references(() => offerVariants.id, { onDelete: 'restrict' }),
    status: text('status').default('pending').notNull(),
    startDate: date('start_date').notNull(),
    expiresAt: date('expires_at').notNull(),
    warrantyUntil: date('warranty_until').notNull(),
    accessTypeCode: text('access_type_code')
      .notNull()
      .references(() => accessTypes.code, { onDelete: 'restrict' }),
    durationMonths: smallint('duration_months')
      .notNull()
      .references(() => durations.months, { onDelete: 'restrict' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    purchasePriceMinor: integer('purchase_price_minor').notNull(),
    currency: text('currency').notNull(),
    autoRenew: boolean('auto_renew').default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      'subscriptions_status_check',
      sql`${table.status} in ('pending', 'active', 'expiring', 'expired', 'suspended', 'cancelled')`,
    ),
    check(
      'subscriptions_price_positive_check',
      sql`${table.purchasePriceMinor} > 0`,
    ),
    check(
      'subscriptions_currency_check',
      sql`${table.currency} in ('PEN', 'BOB')`,
    ),
    check(
      'subscriptions_date_order_check',
      sql`${table.expiresAt} >= ${table.startDate}`,
    ),
    index('subscriptions_customer_idx').on(table.customerId, table.expiresAt),
    index('subscriptions_status_expiry_idx').on(table.status, table.expiresAt),
  ],
);

export const subscriptionEvents = pgTable(
  'subscription_events',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    description: text('description').notNull(),
    previousExpiresAt: date('previous_expires_at'),
    newExpiresAt: date('new_expires_at'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('subscription_events_subscription_idx').on(
      table.subscriptionId,
      table.createdAt,
    ),
  ],
);

export const customerNotifications = pgTable(
  'customer_notifications',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    subscriptionId: bigint('subscription_id', { mode: 'number' }).references(
      () => subscriptions.id,
      { onDelete: 'cascade' },
    ),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    dedupKey: text('dedup_key'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('customer_notifications_dedup_uidx')
      .on(table.customerId, table.dedupKey)
      .where(sql`${table.dedupKey} is not null`),
    index('customer_notifications_customer_idx').on(
      table.customerId,
      table.createdAt,
    ),
  ],
);

export const renewalRequests = pgTable(
  'renewal_requests',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    offerVariantId: bigint('offer_variant_id', { mode: 'number' })
      .notNull()
      .references(() => offerVariants.id, { onDelete: 'restrict' }),
    status: text('status').default('pending_payment').notNull(),
    baseExpiresAt: date('base_expires_at').notNull(),
    proposedStartDate: date('proposed_start_date').notNull(),
    proposedExpiresAt: date('proposed_expires_at').notNull(),
    priceMinor: integer('price_minor').notNull(),
    currency: text('currency').notNull(),
    reviewedByCustomerId: bigint('reviewed_by_customer_id', {
      mode: 'number',
    }).references(() => customers.id, { onDelete: 'restrict' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'renewal_requests_status_check',
      sql`${table.status} in ('pending_payment', 'payment_review', 'approved', 'cancelled')`,
    ),
    check(
      'renewal_requests_price_positive_check',
      sql`${table.priceMinor} > 0`,
    ),
    check(
      'renewal_requests_currency_check',
      sql`${table.currency} in ('PEN', 'BOB')`,
    ),
    index('renewal_requests_customer_idx').on(
      table.customerId,
      table.createdAt,
    ),
    index('renewal_requests_subscription_idx').on(
      table.subscriptionId,
      table.createdAt,
    ),
    index('renewal_requests_status_created_idx').on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text('public_id').notNull(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    status: text('status').default('pending_payment').notNull(),
    currency: text('currency').notNull(),
    totalAmountMinor: integer('total_amount_minor').notNull(),
    paymentMethodCode: text('payment_method_code').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('purchase_orders_public_id_uidx').on(table.publicId),
    check(
      'purchase_orders_status_check',
      sql`${table.status} in ('pending_payment', 'payment_review', 'paid', 'fulfilling', 'delivered', 'expired', 'cancelled', 'failed', 'refunded')`,
    ),
    check(
      'purchase_orders_currency_check',
      sql`${table.currency} in ('PEN', 'BOB')`,
    ),
    check('purchase_orders_amount_check', sql`${table.totalAmountMinor} > 0`),
    index('purchase_orders_customer_idx').on(table.customerId, table.createdAt),
    index('purchase_orders_status_expiry_idx').on(
      table.status,
      table.expiresAt,
    ),
  ],
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    offerVariantId: bigint('offer_variant_id', { mode: 'number' })
      .notNull()
      .references(() => offerVariants.id, { onDelete: 'restrict' }),
    subscriptionId: bigint('subscription_id', { mode: 'number' }).references(
      () => subscriptions.id,
      { onDelete: 'set null' },
    ),
    serviceName: text('service_name').notNull(),
    planName: text('plan_name').notNull(),
    accessTypeCode: text('access_type_code').notNull(),
    durationMonths: smallint('duration_months').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    warrantyDays: integer('warranty_days').notNull(),
    status: text('status').default('pending').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('purchase_order_items_order_offer_uidx').on(
      table.orderId,
      table.offerVariantId,
    ),
    check(
      'purchase_order_items_access_type_check',
      sql`${table.accessTypeCode} in ('PROFILE', 'FULL_ACCOUNT')`,
    ),
    check(
      'purchase_order_items_duration_check',
      sql`${table.durationMonths} in (1, 3, 6, 12)`,
    ),
    check('purchase_order_items_amount_check', sql`${table.amountMinor} > 0`),
    check(
      'purchase_order_items_warranty_check',
      sql`${table.warrantyDays} > 0`,
    ),
    check(
      'purchase_order_items_status_check',
      sql`${table.status} in ('pending', 'reserved', 'fulfilled', 'review', 'cancelled', 'refunded')`,
    ),
    index('purchase_order_items_order_idx').on(table.orderId),
  ],
);

export const deliveryTokens = pgTable(
  'delivery_tokens',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    status: text('status').default('active').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    generatedByAdminCustomerId: bigint('generated_by_admin_customer_id', {
      mode: 'number',
    })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    source: text('source').default('admin').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('delivery_tokens_hash_uidx').on(table.tokenHash),
    uniqueIndex('delivery_tokens_active_order_uidx')
      .on(table.orderId)
      .where(sql`${table.status} = 'active'`),
    check(
      'delivery_tokens_status_check',
      sql`${table.status} in ('active', 'used', 'expired', 'revoked')`,
    ),
    check('delivery_tokens_attempts_check', sql`${table.attempts} >= 0`),
    check('delivery_tokens_max_attempts_check', sql`${table.maxAttempts} > 0`),
    check(
      'delivery_tokens_source_check',
      sql`${table.source} in ('admin', 'telegram')`,
    ),
    index('delivery_tokens_order_idx').on(table.orderId, table.createdAt),
    index('delivery_tokens_expiry_idx').on(table.status, table.expiresAt),
  ],
);

export const paymentAttempts = pgTable(
  'payment_attempts',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerOrderId: text('provider_order_id'),
    status: text('status').default('pending').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    providerState: text('provider_state').default('').notNull(),
    paymentCode: text('payment_code'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('payment_attempts_provider_order_uidx')
      .on(table.provider, table.providerOrderId)
      .where(sql`${table.providerOrderId} is not null`),
    check(
      'payment_attempts_provider_check',
      sql`${table.provider} in ('culqi', 'manual')`,
    ),
    check(
      'payment_attempts_status_check',
      sql`${table.status} in ('pending', 'manual_review', 'paid', 'expired', 'failed', 'refunded')`,
    ),
    check('payment_attempts_amount_check', sql`${table.amountMinor} > 0`),
    check(
      'payment_attempts_currency_check',
      sql`${table.currency} in ('PEN', 'BOB')`,
    ),
    index('payment_attempts_order_idx').on(table.orderId, table.createdAt),
    index('payment_attempts_status_expiry_idx').on(
      table.status,
      table.expiresAt,
    ),
  ],
);

export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    payloadHash: text('payload_hash').notNull(),
    status: text('status').default('received').notNull(),
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('payment_webhook_events_provider_event_uidx').on(
      table.provider,
      table.providerEventId,
    ),
    check(
      'payment_webhook_events_status_check',
      sql`${table.status} in ('received', 'processed', 'ignored', 'failed')`,
    ),
    index('payment_webhook_events_received_idx').on(
      table.provider,
      table.receivedAt,
    ),
  ],
);

export const adminAuditEvents = pgTable(
  'admin_audit_events',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    adminCustomerId: bigint('admin_customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'number' }).notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('admin_audit_events_admin_idx').on(
      table.adminCustomerId,
      table.createdAt,
    ),
    index('admin_audit_events_entity_idx').on(table.entityType, table.entityId),
  ],
);

export const serviceAccounts = pgTable(
  'service_accounts',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    internalCode: text('internal_code').notNull(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    planLabel: text('plan_label').notNull(),
    regionLabel: text('region_label').default('Perú y Bolivia').notNull(),
    providerLabel: text('provider_label').default('').notNull(),
    status: text('status').default('active').notNull(),
    capacity: smallint('capacity').notNull(),
    renewalDate: date('renewal_date'),
    costMinor: integer('cost_minor'),
    costCurrency: text('cost_currency'),
    encryptedEmail: text('encrypted_email').notNull(),
    emailIv: text('email_iv').notNull(),
    encryptedPassword: text('encrypted_password').notNull(),
    passwordIv: text('password_iv').notNull(),
    encryptedTotpSecret: text('encrypted_totp_secret'),
    totpSecretIv: text('totp_secret_iv'),
    otpInboxProvider: text('otp_inbox_provider'),
    otpInboxHost: text('otp_inbox_host'),
    encryptedOtpInboxEmail: text('encrypted_otp_inbox_email'),
    otpInboxEmailIv: text('otp_inbox_email_iv'),
    encryptedOtpInboxPassword: text('encrypted_otp_inbox_password'),
    otpInboxPasswordIv: text('otp_inbox_password_iv'),
    encryptionKeyVersion: smallint('encryption_key_version')
      .default(1)
      .notNull(),
    notes: text('notes').default('').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('service_accounts_internal_code_uidx').on(table.internalCode),
    check(
      'service_accounts_status_check',
      sql`${table.status} in ('active', 'maintenance', 'suspended', 'renewal_due', 'expired', 'archived')`,
    ),
    check(
      'service_accounts_capacity_check',
      sql`${table.capacity} between 1 and 20`,
    ),
    check(
      'service_accounts_cost_check',
      sql`${table.costMinor} is null or ${table.costMinor} >= 0`,
    ),
    check(
      'service_accounts_currency_check',
      sql`${table.costCurrency} is null or ${table.costCurrency} in ('PEN', 'BOB', 'USD')`,
    ),
    check(
      'service_accounts_totp_secret_pair_check',
      sql`(${table.encryptedTotpSecret} is null and ${table.totpSecretIv} is null) or (${table.encryptedTotpSecret} is not null and ${table.totpSecretIv} is not null)`,
    ),
    check(
      'service_accounts_email_otp_credentials_check',
      sql`(${table.otpInboxProvider} is null and ${table.otpInboxHost} is null and ${table.encryptedOtpInboxEmail} is null and ${table.otpInboxEmailIv} is null and ${table.encryptedOtpInboxPassword} is null and ${table.otpInboxPasswordIv} is null) or (${table.otpInboxProvider} is not null and ${table.otpInboxHost} is not null and ${table.encryptedOtpInboxEmail} is not null and ${table.otpInboxEmailIv} is not null and ${table.encryptedOtpInboxPassword} is not null and ${table.otpInboxPasswordIv} is not null)`,
    ),
    index('service_accounts_product_idx').on(table.productId),
    index('service_accounts_status_renewal_idx').on(
      table.status,
      table.renewalDate,
    ),
  ],
);

export const paymentRecords = pgTable(
  'payment_records',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    renewalRequestId: bigint('renewal_request_id', {
      mode: 'number',
    }).references(() => renewalRequests.id, { onDelete: 'set null' }),
    serviceAccountId: bigint('service_account_id', {
      mode: 'number',
    }).references(() => serviceAccounts.id, { onDelete: 'set null' }),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code, { onDelete: 'restrict' }),
    sourceType: text('source_type').notNull(),
    status: text('status').default('confirmed').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    reportingAmountMinor: integer('reporting_amount_minor').notNull(),
    reportingCurrency: text('reporting_currency').default('PEN').notNull(),
    exchangeRate: numeric('exchange_rate', {
      precision: 14,
      scale: 6,
    }).notNull(),
    paymentMethodCode: text('payment_method_code').default('manual').notNull(),
    paymentReference: text('payment_reference').default('').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    confirmedByAdminCustomerId: bigint('confirmed_by_admin_customer_id', {
      mode: 'number',
    }).references(() => customers.id, { onDelete: 'restrict' }),
    confirmationSource: text('confirmation_source').default('manual').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('payment_records_renewal_request_uidx')
      .on(table.renewalRequestId)
      .where(sql`${table.renewalRequestId} is not null`),
    check(
      'payment_records_source_type_check',
      sql`${table.sourceType} in ('initial_purchase', 'renewal', 'manual_adjustment')`,
    ),
    check(
      'payment_records_status_check',
      sql`${table.status} in ('confirmed', 'refunded', 'rejected')`,
    ),
    check('payment_records_amount_check', sql`${table.amountMinor} > 0`),
    check(
      'payment_records_reporting_amount_check',
      sql`${table.reportingAmountMinor} > 0`,
    ),
    check(
      'payment_records_exchange_rate_check',
      sql`${table.exchangeRate} > 0`,
    ),
    check(
      'payment_records_currency_check',
      sql`${table.currency} in ('PEN', 'BOB')`,
    ),
    check(
      'payment_records_confirmation_source_check',
      sql`${table.confirmationSource} in ('manual', 'culqi')`,
    ),
    check(
      'payment_records_reporting_currency_check',
      sql`${table.reportingCurrency} = 'PEN'`,
    ),
    index('payment_records_period_idx').on(table.status, table.paidAt),
    index('payment_records_market_period_idx').on(
      table.marketCode,
      table.paidAt,
    ),
    index('payment_records_account_period_idx').on(
      table.serviceAccountId,
      table.paidAt,
    ),
    index('payment_records_subscription_idx').on(
      table.subscriptionId,
      table.paidAt,
    ),
  ],
);

export const serviceAccountCostEvents = pgTable(
  'service_account_cost_events',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    serviceAccountId: bigint('service_account_id', { mode: 'number' })
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: 'cascade' }),
    costKind: text('cost_kind').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    reportingAmountMinor: integer('reporting_amount_minor').notNull(),
    reportingCurrency: text('reporting_currency').default('PEN').notNull(),
    exchangeRate: numeric('exchange_rate', {
      precision: 14,
      scale: 6,
    }).notNull(),
    incurredOn: date('incurred_on').notNull(),
    coverageStart: date('coverage_start'),
    coverageEnd: date('coverage_end'),
    notes: text('notes').default('').notNull(),
    createdByAdminCustomerId: bigint('created_by_admin_customer_id', {
      mode: 'number',
    }).references(() => customers.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [
    check(
      'service_account_cost_events_kind_check',
      sql`${table.costKind} in ('provider_purchase', 'provider_renewal', 'adjustment')`,
    ),
    check(
      'service_account_cost_events_amount_check',
      sql`${table.amountMinor} >= 0`,
    ),
    check(
      'service_account_cost_events_reporting_amount_check',
      sql`${table.reportingAmountMinor} >= 0`,
    ),
    check(
      'service_account_cost_events_exchange_rate_check',
      sql`${table.exchangeRate} > 0`,
    ),
    check(
      'service_account_cost_events_currency_check',
      sql`${table.currency} in ('PEN', 'BOB', 'USD')`,
    ),
    check(
      'service_account_cost_events_reporting_currency_check',
      sql`${table.reportingCurrency} = 'PEN'`,
    ),
    check(
      'service_account_cost_events_coverage_check',
      sql`${table.coverageEnd} is null or ${table.coverageStart} is null or ${table.coverageEnd} >= ${table.coverageStart}`,
    ),
    index('service_account_cost_events_period_idx').on(table.incurredOn),
    index('service_account_cost_events_account_period_idx').on(
      table.serviceAccountId,
      table.incurredOn,
    ),
  ],
);

export const accountProfiles = pgTable(
  'account_profiles',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    serviceAccountId: bigint('service_account_id', { mode: 'number' })
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    displayName: text('display_name').notNull(),
    status: text('status').default('available').notNull(),
    encryptedPin: text('encrypted_pin'),
    pinIv: text('pin_iv'),
    notes: text('notes').default('').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('account_profiles_account_position_uidx').on(
      table.serviceAccountId,
      table.position,
    ),
    check('account_profiles_position_check', sql`${table.position} > 0`),
    check(
      'account_profiles_status_check',
      sql`${table.status} in ('available', 'reserved', 'assigned', 'blocked', 'maintenance')`,
    ),
    check(
      'account_profiles_pin_pair_check',
      sql`(${table.encryptedPin} is null and ${table.pinIv} is null) or (${table.encryptedPin} is not null and ${table.pinIv} is not null)`,
    ),
    index('account_profiles_account_status_idx').on(
      table.serviceAccountId,
      table.status,
    ),
  ],
);

export const profileReservations = pgTable(
  'profile_reservations',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderItemId: bigint('order_item_id', { mode: 'number' })
      .notNull()
      .references(() => purchaseOrderItems.id, { onDelete: 'cascade' }),
    accountProfileId: bigint('account_profile_id', { mode: 'number' })
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'restrict' }),
    status: text('status').default('active').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('profile_reservations_order_item_uidx').on(table.orderItemId),
    uniqueIndex('profile_reservations_active_profile_uidx')
      .on(table.accountProfileId)
      .where(sql`${table.status} = 'active'`),
    check(
      'profile_reservations_status_check',
      sql`${table.status} in ('active', 'consumed', 'released', 'expired')`,
    ),
    index('profile_reservations_expiry_idx').on(table.status, table.expiresAt),
  ],
);

export const profileAssignments = pgTable(
  'profile_assignments',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    accountProfileId: bigint('account_profile_id', { mode: 'number' })
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    status: text('status').default('active').notNull(),
    startsAt: date('starts_at').notNull(),
    expiresAt: date('expires_at').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releaseReason: text('release_reason'),
    assignedByAdminCustomerId: bigint('assigned_by_admin_customer_id', {
      mode: 'number',
    }).references(() => customers.id, { onDelete: 'restrict' }),
    assignmentSource: text('assignment_source').default('manual').notNull(),
    releasedByAdminCustomerId: bigint('released_by_admin_customer_id', {
      mode: 'number',
    }).references(() => customers.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (table) => [
    check(
      'profile_assignments_status_check',
      sql`${table.status} in ('active', 'released', 'expired', 'moved')`,
    ),
    check(
      'profile_assignments_date_order_check',
      sql`${table.expiresAt} >= ${table.startsAt}`,
    ),
    check(
      'profile_assignments_source_check',
      sql`${table.assignmentSource} in ('manual', 'automatic')`,
    ),
    uniqueIndex('profile_assignments_active_profile_uidx')
      .on(table.accountProfileId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex('profile_assignments_active_subscription_uidx')
      .on(table.subscriptionId)
      .where(sql`${table.status} = 'active'`),
    index('profile_assignments_customer_idx').on(
      table.customerId,
      table.expiresAt,
    ),
    index('profile_assignments_expiry_idx').on(table.status, table.expiresAt),
  ],
);

export const accountIncidents = pgTable(
  'account_incidents',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    serviceAccountId: bigint('service_account_id', { mode: 'number' })
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: 'cascade' }),
    accountProfileId: bigint('account_profile_id', {
      mode: 'number',
    }).references(() => accountProfiles.id, { onDelete: 'set null' }),
    customerId: bigint('customer_id', { mode: 'number' }).references(
      () => customers.id,
      {
        onDelete: 'set null',
      },
    ),
    incidentType: text('incident_type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    priority: text('priority').default('medium').notNull(),
    status: text('status').default('open').notNull(),
    resolutionNote: text('resolution_note'),
    openedByAdminCustomerId: bigint('opened_by_admin_customer_id', {
      mode: 'number',
    })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    resolvedByAdminCustomerId: bigint('resolved_by_admin_customer_id', {
      mode: 'number',
    }).references(() => customers.id, { onDelete: 'restrict' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check(
      'account_incidents_priority_check',
      sql`${table.priority} in ('low', 'medium', 'high', 'critical')`,
    ),
    check(
      'account_incidents_status_check',
      sql`${table.status} in ('open', 'in_review', 'resolved', 'closed')`,
    ),
    index('account_incidents_account_idx').on(
      table.serviceAccountId,
      table.createdAt,
    ),
    index('account_incidents_status_priority_idx').on(
      table.status,
      table.priority,
    ),
  ],
);

export const credentialAccessEvents = pgTable(
  'credential_access_events',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    serviceAccountId: bigint('service_account_id', { mode: 'number' })
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: 'cascade' }),
    accountProfileId: bigint('account_profile_id', {
      mode: 'number',
    }).references(() => accountProfiles.id, { onDelete: 'set null' }),
    adminCustomerId: bigint('admin_customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    secretType: text('secret_type').notNull(),
    action: text('action').notNull(),
    reason: text('reason').default('').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'credential_access_events_secret_type_check',
      sql`${table.secretType} in ('provider_email', 'provider_password', 'profile_pin', 'totp_code', 'email_otp_code')`,
    ),
    check(
      'credential_access_events_action_check',
      sql`${table.action} in ('revealed', 'copied', 'updated')`,
    ),
    index('credential_access_events_account_idx').on(
      table.serviceAccountId,
      table.createdAt,
    ),
    index('credential_access_events_admin_idx').on(
      table.adminCustomerId,
      table.createdAt,
    ),
  ],
);

export const customerCredentialAccessEvents = pgTable(
  'customer_credential_access_events',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    secretType: text('secret_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'customer_credential_access_events_secret_type_check',
      sql`${table.secretType} in ('provider_email', 'provider_password', 'profile_pin', 'totp_code', 'email_otp_code')`,
    ),
    index('customer_credential_access_events_customer_idx').on(
      table.customerId,
      table.createdAt,
    ),
    index('customer_credential_access_events_subscription_idx').on(
      table.subscriptionId,
      table.createdAt,
    ),
  ],
);

export const emailOtpLookupEvents = pgTable(
  'email_otp_lookup_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('email_otp_lookup_events_status_check', sql`${table.status} in ('found', 'not_found', 'error')`),
    index('email_otp_lookup_events_rate_idx').on(table.customerId, table.subscriptionId, table.createdAt),
  ],
);

export type Market = typeof markets.$inferSelect;
export type Product = typeof products.$inferSelect;
export type MarketPrice = typeof marketPrices.$inferSelect;
export type OfferVariant = typeof offerVariants.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type DeliveryToken = typeof deliveryTokens.$inferSelect;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
export type ServiceAccount = typeof serviceAccounts.$inferSelect;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type ServiceAccountCostEvent =
  typeof serviceAccountCostEvents.$inferSelect;
export type AccountProfile = typeof accountProfiles.$inferSelect;
export type ProfileAssignment = typeof profileAssignments.$inferSelect;
export type AccountIncident = typeof accountIncidents.$inferSelect;
