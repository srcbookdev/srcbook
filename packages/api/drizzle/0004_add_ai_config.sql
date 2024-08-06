ALTER TABLE `config` ADD `anthropic_api_key` text;--> statement-breakpoint
ALTER TABLE `config` ADD `ai_config` text DEFAULT '{"provider":"openai","model":"gpt-4o"}' NOT NULL;
