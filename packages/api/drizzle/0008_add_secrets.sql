CREATE TABLE `secrets_to_session` (
	`id` integer PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`secret_id` integer NOT NULL,
	FOREIGN KEY (`secret_id`) REFERENCES `secrets`(`id`) ON UPDATE no action ON DELETE no action
);
