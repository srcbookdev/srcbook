ALTER TABLE `config` ADD `openai_headers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `config` ADD `anthropic_headers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `config` ADD `xai_headers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `config` ADD `gemini_headers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `config` ADD `custom_headers` text DEFAULT '[]' NOT NULL;