CREATE TABLE `audit_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`record_id` text NOT NULL,
	`before_payload` text,
	`after_payload` text
);
--> statement-breakpoint
CREATE TABLE `record_overrides` (
	`record_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL
);
