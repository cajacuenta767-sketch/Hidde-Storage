CREATE TABLE "admin_audit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"admin_customer_id" bigint NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" bigint NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "renewal_requests" ADD COLUMN "reviewed_by_customer_id" bigint;--> statement-breakpoint
ALTER TABLE "renewal_requests" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "renewal_requests" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_admin_customer_id_customers_id_fk" FOREIGN KEY ("admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_events_admin_idx" ON "admin_audit_events" USING btree ("admin_customer_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_events_entity_idx" ON "admin_audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
ALTER TABLE "renewal_requests" ADD CONSTRAINT "renewal_requests_reviewed_by_customer_id_customers_id_fk" FOREIGN KEY ("reviewed_by_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "renewal_requests_status_created_idx" ON "renewal_requests" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_role_check" CHECK ("customers"."role" in ('customer', 'admin'));