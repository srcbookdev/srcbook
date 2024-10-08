CREATE TABLE `apps` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`language` text NOT NULL,
	`external_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
