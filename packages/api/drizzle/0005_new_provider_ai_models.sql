ALTER TABLE `config` ADD `ai_provider` text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE `config` ADD `ai_model` text DEFAULT 'gpt-4o';
