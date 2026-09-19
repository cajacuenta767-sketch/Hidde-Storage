CREATE TABLE "customer_credential_access_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customer_credential_access_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"customer_id" bigint NOT NULL,
	"subscription_id" bigint NOT NULL,
	"secret_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_credential_access_events_secret_type_check" CHECK ("customer_credential_access_events"."secret_type" in ('provider_email', 'provider_password', 'profile_pin'))
);
--> statement-breakpoint
ALTER TABLE "customer_credential_access_events" ADD CONSTRAINT "customer_credential_access_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credential_access_events" ADD CONSTRAINT "customer_credential_access_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_credential_access_events_customer_idx" ON "customer_credential_access_events" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_credential_access_events_subscription_idx" ON "customer_credential_access_events" USING btree ("subscription_id","created_at");