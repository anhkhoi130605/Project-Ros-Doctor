-- Generated from migration 20261011000000_AddRosbagReview only.
-- Review and back up the target database before applying. Not executed by the assistant.
-- Requires the existing rosbags and Users tables, with no review columns already added.
-- MySQL DDL is not fully transactional; do not blindly rerun after a partial failure.
START TRANSACTION;
ALTER TABLE `rosbags` ADD `review_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Approved';

ALTER TABLE `rosbags` ADD `description` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL;

ALTER TABLE `rosbags` ADD `reviewer_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL;

ALTER TABLE `rosbags` ADD `review_note` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL;

ALTER TABLE `rosbags` ADD `reviewed_at` datetime(6) NULL;

CREATE INDEX `IX_rosbags_reviewer_id` ON `rosbags` (`reviewer_id`);

CREATE INDEX `IX_rosbags_review_status_CreatedAt` ON `rosbags` (`review_status`, `CreatedAt`);

ALTER TABLE `rosbags` ADD CONSTRAINT `FK_rosbags_Users_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `Users` (`Id`) ON DELETE SET NULL;

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20261011000000_AddRosbagReview', '9.0.0');

COMMIT;
