ALTER TABLE "products" ADD COLUMN "image_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_alt" text DEFAULT '' NOT NULL;