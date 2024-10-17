ALTER TABLE `apps` ADD `history` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `history_version` integer DEFAULT 1 NOT NULL;
