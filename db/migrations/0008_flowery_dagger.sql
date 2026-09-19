CREATE TABLE "payment_records" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"subscription_id" bigint NOT NULL,
	"renewal_request_id" bigint,
	"service_account_id" bigint,
	"customer_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"market_code" text NOT NULL,
	"source_type" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"reporting_amount_minor" integer NOT NULL,
	"reporting_currency" text DEFAULT 'PEN' NOT NULL,
	"exchange_rate" numeric(14, 6) NOT NULL,
	"payment_method_code" text DEFAULT 'manual' NOT NULL,
	"payment_reference" text DEFAULT '' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"confirmed_by_admin_customer_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_source_type_check" CHECK ("payment_records"."source_type" in ('initial_purchase', 'renewal', 'manual_adjustment')),
	CONSTRAINT "payment_records_status_check" CHECK ("payment_records"."status" in ('confirmed', 'refunded', 'rejected')),
	CONSTRAINT "payment_records_amount_check" CHECK ("payment_records"."amount_minor" > 0),
	CONSTRAINT "payment_records_reporting_amount_check" CHECK ("payment_records"."reporting_amount_minor" > 0),
	CONSTRAINT "payment_records_exchange_rate_check" CHECK ("payment_records"."exchange_rate" > 0),
	CONSTRAINT "payment_records_currency_check" CHECK ("payment_records"."currency" in ('PEN', 'BOB')),
	CONSTRAINT "payment_records_reporting_currency_check" CHECK ("payment_records"."reporting_currency" = 'PEN')
);
--> statement-breakpoint
CREATE TABLE "service_account_cost_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "service_account_cost_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"service_account_id" bigint NOT NULL,
	"cost_kind" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"reporting_amount_minor" integer NOT NULL,
	"reporting_currency" text DEFAULT 'PEN' NOT NULL,
	"exchange_rate" numeric(14, 6) NOT NULL,
	"incurred_on" date NOT NULL,
	"coverage_start" date,
	"coverage_end" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_admin_customer_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_account_cost_events_kind_check" CHECK ("service_account_cost_events"."cost_kind" in ('provider_purchase', 'provider_renewal', 'adjustment')),
	CONSTRAINT "service_account_cost_events_amount_check" CHECK ("service_account_cost_events"."amount_minor" >= 0),
	CONSTRAINT "service_account_cost_events_reporting_amount_check" CHECK ("service_account_cost_events"."reporting_amount_minor" >= 0),
	CONSTRAINT "service_account_cost_events_exchange_rate_check" CHECK ("service_account_cost_events"."exchange_rate" > 0),
	CONSTRAINT "service_account_cost_events_currency_check" CHECK ("service_account_cost_events"."currency" in ('PEN', 'BOB', 'USD')),
	CONSTRAINT "service_account_cost_events_reporting_currency_check" CHECK ("service_account_cost_events"."reporting_currency" = 'PEN'),
	CONSTRAINT "service_account_cost_events_coverage_check" CHECK ("service_account_cost_events"."coverage_end" is null or "service_account_cost_events"."coverage_start" is null or "service_account_cost_events"."coverage_end" >= "service_account_cost_events"."coverage_start")
);
--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_renewal_request_id_renewal_requests_id_fk" FOREIGN KEY ("renewal_request_id") REFERENCES "public"."renewal_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_service_account_id_service_accounts_id_fk" FOREIGN KEY ("service_account_id") REFERENCES "public"."service_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_market_code_markets_code_fk" FOREIGN KEY ("market_code") REFERENCES "public"."markets"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_confirmed_by_admin_customer_id_customers_id_fk" FOREIGN KEY ("confirmed_by_admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_account_cost_events" ADD CONSTRAINT "service_account_cost_events_service_account_id_service_accounts_id_fk" FOREIGN KEY ("service_account_id") REFERENCES "public"."service_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_account_cost_events" ADD CONSTRAINT "service_account_cost_events_created_by_admin_customer_id_customers_id_fk" FOREIGN KEY ("created_by_admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_records_renewal_request_uidx" ON "payment_records" USING btree ("renewal_request_id") WHERE "payment_records"."renewal_request_id" is not null;--> statement-breakpoint
CREATE INDEX "payment_records_period_idx" ON "payment_records" USING btree ("status","paid_at");--> statement-breakpoint
CREATE INDEX "payment_records_market_period_idx" ON "payment_records" USING btree ("market_code","paid_at");--> statement-breakpoint
CREATE INDEX "payment_records_account_period_idx" ON "payment_records" USING btree ("service_account_id","paid_at");--> statement-breakpoint
CREATE INDEX "payment_records_subscription_idx" ON "payment_records" USING btree ("subscription_id","paid_at");--> statement-breakpoint
CREATE INDEX "service_account_cost_events_period_idx" ON "service_account_cost_events" USING btree ("incurred_on");--> statement-breakpoint
CREATE INDEX "service_account_cost_events_account_period_idx" ON "service_account_cost_events" USING btree ("service_account_id","incurred_on");