CREATE TABLE "access_types" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_types_code_check" CHECK ("access_types"."code" in ('PROFILE', 'FULL_ACCOUNT'))
);
--> statement-breakpoint
CREATE TABLE "durations" (
	"months" smallint PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "durations_months_check" CHECK ("durations"."months" in (1, 3, 6, 12))
);
--> statement-breakpoint
CREATE TABLE "offer_variants" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "offer_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"product_id" bigint NOT NULL,
	"access_type_code" text NOT NULL,
	"duration_months" smallint NOT NULL,
	"market_code" text NOT NULL,
	"amount_minor" integer,
	"compare_at_amount_minor" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"delivery_label" text DEFAULT 'Entrega después de confirmar el pago' NOT NULL,
	"warranty_days" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_variants_amount_positive_check" CHECK ("offer_variants"."amount_minor" is null or "offer_variants"."amount_minor" > 0),
	CONSTRAINT "offer_variants_compare_amount_positive_check" CHECK ("offer_variants"."compare_at_amount_minor" is null or "offer_variants"."compare_at_amount_minor" > 0),
	CONSTRAINT "offer_variants_stock_nonnegative_check" CHECK ("offer_variants"."stock" >= 0),
	CONSTRAINT "offer_variants_warranty_positive_check" CHECK ("offer_variants"."warranty_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"code" text NOT NULL,
	"market_code" text NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"image_path" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_code_market_code_pk" PRIMARY KEY("code","market_code")
);
--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "currency_symbol" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_access_type_code_access_types_code_fk" FOREIGN KEY ("access_type_code") REFERENCES "public"."access_types"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_duration_months_durations_months_fk" FOREIGN KEY ("duration_months") REFERENCES "public"."durations"("months") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_market_code_markets_code_fk" FOREIGN KEY ("market_code") REFERENCES "public"."markets"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_market_code_markets_code_fk" FOREIGN KEY ("market_code") REFERENCES "public"."markets"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offer_variants_selection_uidx" ON "offer_variants" USING btree ("product_id","access_type_code","duration_months","market_code");--> statement-breakpoint
CREATE INDEX "offer_variants_product_idx" ON "offer_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "offer_variants_market_idx" ON "offer_variants" USING btree ("market_code");--> statement-breakpoint
CREATE INDEX "payment_methods_market_idx" ON "payment_methods" USING btree ("market_code","sort_order");