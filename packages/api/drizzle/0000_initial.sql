CREATE TABLE `config` (
	`baseDir` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `secrets_name_unique` ON `secrets` (`name`);