CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`changes` text NOT NULL,
	`note` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`last_change` text
);
