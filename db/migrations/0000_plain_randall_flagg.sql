CREATE TABLE "categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"product_id" bigint NOT NULL,
	"market_code" text NOT NULL,
	"encrypted_payload" text NOT NULL,
	"encryption_iv" text NOT NULL,
	"encryption_key_version" smallint DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"reserved_until" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_status_check" CHECK ("inventory_items"."status" in ('available', 'reserved', 'delivered', 'invalidated')),
	CONSTRAINT "inventory_items_reservation_check" CHECK (("inventory_items"."status" = 'reserved' and "inventory_items"."reserved_until" is not null) or ("inventory_items"."status" <> 'reserved'))
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"product_id" bigint NOT NULL,
	"market_code" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_prices_product_id_market_code_pk" PRIMARY KEY("product_id","market_code"),
	CONSTRAINT "market_prices_amount_positive_check" CHECK ("market_prices"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"locale" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "markets_code_check" CHECK ("markets"."code" in ('PE', 'BO')),
	CONSTRAINT "markets_currency_check" CHECK ("markets"."currency" in ('PEN', 'BOB')),
	CONSTRAINT "markets_code_currency_check" CHECK (("markets"."code" = 'PE' and "markets"."currency" = 'PEN') or ("markets"."code" = 'BO' and "markets"."currency" = 'BOB'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"category_id" bigint NOT NULL,
	"service_name" text NOT NULL,
	"plan_name" text NOT NULL,
	"description" text NOT NULL,
	"seller_label" text NOT NULL,
	"billing_label" text DEFAULT '/ mes' NOT NULL,
	"delivery_label" text DEFAULT 'Entrega inmediata' NOT NULL,
	"accent_color" text NOT NULL,
	"accent_soft_color" text NOT NULL,
	"artwork_class" text NOT NULL,
	"mark" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_market_price_fk" FOREIGN KEY ("product_id","market_code") REFERENCES "public"."market_prices"("product_id","market_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_market_code_markets_code_fk" FOREIGN KEY ("market_code") REFERENCES "public"."markets"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uidx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "inventory_items_product_market_idx" ON "inventory_items" USING btree ("product_id","market_code");--> statement-breakpoint
CREATE INDEX "inventory_items_available_idx" ON "inventory_items" USING btree ("product_id","market_code","created_at") WHERE "inventory_items"."status" = 'available';--> statement-breakpoint
CREATE INDEX "market_prices_market_code_idx" ON "market_prices" USING btree ("market_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_uidx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");