CREATE TABLE `app_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider_session` text NOT NULL,
	`sealed` text NOT NULL,
	`csrf` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`refresh_lock` text,
	`refresh_until` integer DEFAULT 0 NOT NULL,
	`purpose` text DEFAULT 'login' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "app_sessions_purpose_check" CHECK("app_sessions"."purpose" in ('login','recovery'))
);
--> statement-breakpoint
CREATE INDEX `app_sessions_user_idx` ON `app_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	CONSTRAINT "app_users_role_check" CHECK("app_users"."role" in ('owner','admin','viewer')),
	CONSTRAINT "app_users_status_check" CHECK("app_users"."status" in ('pending','active','rejected','suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_email_unique` ON `app_users` (`email`);--> statement-breakpoint
CREATE TABLE `approval_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`target_version` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text,
	`event` text NOT NULL,
	`created_at` integer NOT NULL
);
