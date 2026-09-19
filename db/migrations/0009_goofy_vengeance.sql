CREATE TABLE "payment_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"provider_state" text DEFAULT '' NOT NULL,
	"payment_code" text,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_provider_check" CHECK ("payment_attempts"."provider" in ('culqi', 'manual')),
	CONSTRAINT "payment_attempts_status_check" CHECK ("payment_attempts"."status" in ('pending', 'manual_review', 'paid', 'expired', 'failed', 'refunded')),
	CONSTRAINT "payment_attempts_amount_check" CHECK ("payment_attempts"."amount_minor" > 0),
	CONSTRAINT "payment_attempts_currency_check" CHECK ("payment_attempts"."currency" in ('PEN', 'BOB'))
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_webhook_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_hash" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "payment_webhook_events_status_check" CHECK ("payment_webhook_events"."status" in ('received', 'processed', 'ignored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "profile_reservations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "profile_reservations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_item_id" bigint NOT NULL,
	"account_profile_id" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_reservations_status_check" CHECK ("profile_reservations"."status" in ('active', 'consumed', 'released', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"offer_variant_id" bigint NOT NULL,
	"subscription_id" bigint,
	"service_name" text NOT NULL,
	"plan_name" text NOT NULL,
	"access_type_code" text NOT NULL,
	"duration_months" smallint NOT NULL,
	"amount_minor" integer NOT NULL,
	"warranty_days" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_items_access_type_check" CHECK ("purchase_order_items"."access_type_code" in ('PROFILE', 'FULL_ACCOUNT')),
	CONSTRAINT "purchase_order_items_duration_check" CHECK ("purchase_order_items"."duration_months" in (1, 3, 6, 12)),
	CONSTRAINT "purchase_order_items_amount_check" CHECK ("purchase_order_items"."amount_minor" > 0),
	CONSTRAINT "purchase_order_items_warranty_check" CHECK ("purchase_order_items"."warranty_days" > 0),
	CONSTRAINT "purchase_order_items_status_check" CHECK ("purchase_order_items"."status" in ('pending', 'reserved', 'fulfilled', 'review', 'cancelled', 'refunded'))
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"customer_id" bigint NOT NULL,
	"market_code" text NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"currency" text NOT NULL,
	"total_amount_minor" integer NOT NULL,
	"payment_method_code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_status_check" CHECK ("purchase_orders"."status" in ('pending_payment', 'payment_review', 'paid', 'fulfilling', 'delivered', 'expired', 'cancelled', 'failed', 'refunded')),
	CONSTRAINT "purchase_orders_currency_check" CHECK ("purchase_orders"."currency" in ('PEN', 'BOB')),
	CONSTRAINT "purchase_orders_amount_check" CHECK ("purchase_orders"."total_amount_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "payment_records" ALTER COLUMN "confirmed_by_admin_customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_assignments" ALTER COLUMN "assigned_by_admin_customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "confirmation_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD COLUMN "assignment_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_reservations" ADD CONSTRAINT "profile_reservations_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_reservations" ADD CONSTRAINT "profile_reservations_account_profile_id_account_profiles_id_fk" FOREIGN KEY ("account_profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_offer_variant_id_offer_variants_id_fk" FOREIGN KEY ("offer_variant_id") REFERENCES "public"."offer_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_market_code_markets_code_fk" FOREIGN KEY ("market_code") REFERENCES "public"."markets"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_order_uidx" ON "payment_attempts" USING btree ("provider","provider_order_id") WHERE "payment_attempts"."provider_order_id" is not null;--> statement-breakpoint
CREATE INDEX "payment_attempts_order_idx" ON "payment_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_attempts_status_expiry_idx" ON "payment_attempts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_provider_event_uidx" ON "payment_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_received_idx" ON "payment_webhook_events" USING btree ("provider","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_reservations_order_item_uidx" ON "profile_reservations" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_reservations_active_profile_uidx" ON "profile_reservations" USING btree ("account_profile_id") WHERE "profile_reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "profile_reservations_expiry_idx" ON "profile_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_items_order_offer_uidx" ON "purchase_order_items" USING btree ("order_id","offer_variant_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_order_idx" ON "purchase_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_public_id_uidx" ON "purchase_orders" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_customer_idx" ON "purchase_orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_expiry_idx" ON "purchase_orders" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_confirmation_source_check" CHECK ("payment_records"."confirmation_source" in ('manual', 'culqi'));--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD CONSTRAINT "profile_assignments_source_check" CHECK ("profile_assignments"."assignment_source" in ('manual', 'automatic'));
--> statement-breakpoint
INSERT INTO "markets" ("code", "name", "currency", "locale")
VALUES ('PE', 'Perú', 'PEN', 'es-PE'), ('BO', 'Bolivia', 'BOB', 'es-BO')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
UPDATE "payment_methods"
SET "is_active" = false, "updated_at" = now()
WHERE "market_code" = 'PE' AND "code" IN ('YAPE', 'PLIN');
--> statement-breakpoint
INSERT INTO "payment_methods" (
	"code", "market_code", "name", "instructions", "sort_order", "is_active"
) VALUES (
	'CULQI_QR', 'PE', 'Yape o Plin con QR', 'Pago automático en soles mediante el QR seguro de Culqi.', 10, true
)
ON CONFLICT ("code", "market_code") DO UPDATE SET
	"name" = excluded."name",
	"instructions" = excluded."instructions",
	"sort_order" = excluded."sort_order",
	"is_active" = true,
	"updated_at" = now();
