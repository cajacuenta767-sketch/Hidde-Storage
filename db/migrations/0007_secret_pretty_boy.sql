CREATE TABLE "account_incidents" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_incidents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"service_account_id" bigint NOT NULL,
	"account_profile_id" bigint,
	"customer_id" bigint,
	"incident_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"opened_by_admin_customer_id" bigint NOT NULL,
	"resolved_by_admin_customer_id" bigint,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_incidents_priority_check" CHECK ("account_incidents"."priority" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "account_incidents_status_check" CHECK ("account_incidents"."status" in ('open', 'in_review', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "account_profiles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"service_account_id" bigint NOT NULL,
	"position" smallint NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"encrypted_pin" text,
	"pin_iv" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_profiles_position_check" CHECK ("account_profiles"."position" > 0),
	CONSTRAINT "account_profiles_status_check" CHECK ("account_profiles"."status" in ('available', 'reserved', 'assigned', 'blocked', 'maintenance')),
	CONSTRAINT "account_profiles_pin_pair_check" CHECK (("account_profiles"."encrypted_pin" is null and "account_profiles"."pin_iv" is null) or ("account_profiles"."encrypted_pin" is not null and "account_profiles"."pin_iv" is not null))
);
--> statement-breakpoint
CREATE TABLE "credential_access_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credential_access_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"service_account_id" bigint NOT NULL,
	"account_profile_id" bigint,
	"admin_customer_id" bigint NOT NULL,
	"secret_type" text NOT NULL,
	"action" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_access_events_secret_type_check" CHECK ("credential_access_events"."secret_type" in ('provider_email', 'provider_password', 'profile_pin')),
	CONSTRAINT "credential_access_events_action_check" CHECK ("credential_access_events"."action" in ('revealed', 'copied', 'updated'))
);
--> statement-breakpoint
CREATE TABLE "profile_assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "profile_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_profile_id" bigint NOT NULL,
	"subscription_id" bigint NOT NULL,
	"customer_id" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" date NOT NULL,
	"expires_at" date NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"assigned_by_admin_customer_id" bigint NOT NULL,
	"released_by_admin_customer_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_assignments_status_check" CHECK ("profile_assignments"."status" in ('active', 'released', 'expired', 'moved')),
	CONSTRAINT "profile_assignments_date_order_check" CHECK ("profile_assignments"."expires_at" >= "profile_assignments"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "service_accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "service_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"internal_code" text NOT NULL,
	"product_id" bigint NOT NULL,
	"plan_label" text NOT NULL,
	"region_label" text DEFAULT 'Perú y Bolivia' NOT NULL,
	"provider_label" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"capacity" smallint NOT NULL,
	"renewal_date" date,
	"cost_minor" integer,
	"cost_currency" text,
	"encrypted_email" text NOT NULL,
	"email_iv" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"password_iv" text NOT NULL,
	"encryption_key_version" smallint DEFAULT 1 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_accounts_status_check" CHECK ("service_accounts"."status" in ('active', 'maintenance', 'suspended', 'renewal_due', 'expired', 'archived')),
	CONSTRAINT "service_accounts_capacity_check" CHECK ("service_accounts"."capacity" between 1 and 20),
	CONSTRAINT "service_accounts_cost_check" CHECK ("service_accounts"."cost_minor" is null or "service_accounts"."cost_minor" >= 0),
	CONSTRAINT "service_accounts_currency_check" CHECK ("service_accounts"."cost_currency" is null or "service_accounts"."cost_currency" in ('PEN', 'BOB', 'USD'))
);
--> statement-breakpoint
ALTER TABLE "account_incidents" ADD CONSTRAINT "account_incidents_service_account_id_service_accounts_id_fk" FOREIGN KEY ("service_account_id") REFERENCES "public"."service_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_incidents" ADD CONSTRAINT "account_incidents_account_profile_id_account_profiles_id_fk" FOREIGN KEY ("account_profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_incidents" ADD CONSTRAINT "account_incidents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_incidents" ADD CONSTRAINT "account_incidents_opened_by_admin_customer_id_customers_id_fk" FOREIGN KEY ("opened_by_admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_incidents" ADD CONSTRAINT "account_incidents_resolved_by_admin_customer_id_customers_id_fk" FOREIGN KEY ("resolved_by_admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_service_account_id_service_accounts_id_fk" FOREIGN KEY ("service_account_id") REFERENCES "public"."service_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_access_events" ADD CONSTRAINT "credential_access_events_service_account_id_service_accounts_id_fk" FOREIGN KEY ("service_account_id") REFERENCES "public"."service_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_access_events" ADD CONSTRAINT "credential_access_events_account_profile_id_account_profiles_id_fk" FOREIGN KEY ("account_profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_access_events" ADD CONSTRAINT "credential_access_events_admin_customer_id_customers_id_fk" FOREIGN KEY ("admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD CONSTRAINT "profile_assignments_account_profile_id_account_profiles_id_fk" FOREIGN KEY ("account_profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD CONSTRAINT "profile_assignments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD CONSTRAINT "profile_assignments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD CONSTRAINT "profile_assignments_assigned_by_admin_customer_id_customers_id_fk" FOREIGN KEY ("assigned_by_admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_assignments" ADD CONSTRAINT "profile_assignments_released_by_admin_customer_id_customers_id_fk" FOREIGN KEY ("released_by_admin_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_accounts" ADD CONSTRAINT "service_accounts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_incidents_account_idx" ON "account_incidents" USING btree ("service_account_id","created_at");--> statement-breakpoint
CREATE INDEX "account_incidents_status_priority_idx" ON "account_incidents" USING btree ("status","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "account_profiles_account_position_uidx" ON "account_profiles" USING btree ("service_account_id","position");--> statement-breakpoint
CREATE INDEX "account_profiles_account_status_idx" ON "account_profiles" USING btree ("service_account_id","status");--> statement-breakpoint
CREATE INDEX "credential_access_events_account_idx" ON "credential_access_events" USING btree ("service_account_id","created_at");--> statement-breakpoint
CREATE INDEX "credential_access_events_admin_idx" ON "credential_access_events" USING btree ("admin_customer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_assignments_active_profile_uidx" ON "profile_assignments" USING btree ("account_profile_id") WHERE "profile_assignments"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "profile_assignments_active_subscription_uidx" ON "profile_assignments" USING btree ("subscription_id") WHERE "profile_assignments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "profile_assignments_customer_idx" ON "profile_assignments" USING btree ("customer_id","expires_at");--> statement-breakpoint
CREATE INDEX "profile_assignments_expiry_idx" ON "profile_assignments" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_accounts_internal_code_uidx" ON "service_accounts" USING btree ("internal_code");--> statement-breakpoint
CREATE INDEX "service_accounts_product_idx" ON "service_accounts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "service_accounts_status_renewal_idx" ON "service_accounts" USING btree ("status","renewal_date");