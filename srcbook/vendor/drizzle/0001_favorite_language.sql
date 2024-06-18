ALTER TABLE `config` RENAME COLUMN `baseDir` TO `base_dir`;--> statement-breakpoint
ALTER TABLE `config` ADD `default_language` text DEFAULT 'typescript' NOT NULL;