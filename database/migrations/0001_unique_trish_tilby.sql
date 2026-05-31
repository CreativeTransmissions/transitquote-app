CREATE TABLE `customers` (
	`id` integer PRIMARY KEY NOT NULL,
	`wp_user_id` integer,
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` text,
	`created` text,
	`modified` text
);
