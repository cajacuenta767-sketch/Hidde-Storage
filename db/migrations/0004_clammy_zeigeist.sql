CREATE TABLE "exchange_rates" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exchange_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"base_currency" text NOT NULL,
	"quote_currency" text NOT NULL,
	"rate" numeric(14, 6) NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"effective_date" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_positive_check" CHECK ("exchange_rates"."rate" > 0),
	CONSTRAINT "exchange_rates_currency_check" CHECK ("exchange_rates"."base_currency" in ('USD', 'PEN') and "exchange_rates"."quote_currency" in ('PEN', 'BOB'))
);
--> statement-breakpoint
ALTER TABLE "offer_variants" ADD COLUMN "source_currency" text;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD COLUMN "source_amount_minor" integer;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD COLUMN "exchange_rate" numeric(14, 6);--> statement-breakpoint
ALTER TABLE "offer_variants" ADD COLUMN "discount_basis_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_variants" ADD COLUMN "pricing_source" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_pair_date_uidx" ON "exchange_rates" USING btree ("base_currency","quote_currency","effective_date");--> statement-breakpoint
CREATE INDEX "exchange_rates_active_pair_idx" ON "exchange_rates" USING btree ("base_currency","quote_currency","is_active");--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_source_amount_positive_check" CHECK ("offer_variants"."source_amount_minor" is null or "offer_variants"."source_amount_minor" > 0);--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_source_currency_check" CHECK ("offer_variants"."source_currency" is null or "offer_variants"."source_currency" in ('PEN', 'USD'));--> statement-breakpoint
ALTER TABLE "offer_variants" ADD CONSTRAINT "offer_variants_discount_range_check" CHECK ("offer_variants"."discount_basis_points" between 0 and 10000);