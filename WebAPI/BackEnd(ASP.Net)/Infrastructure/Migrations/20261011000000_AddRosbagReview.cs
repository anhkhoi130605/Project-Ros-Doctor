using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations;

public partial class AddRosbagReview : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Các cột review_status, description, reviewer_id, review_note, reviewed_at
        // và các index, foreign key liên quan đã được tạo thực tế trên bảng rosbags
        // thông qua RosbagReviewSchemaInitializer. Giữ phương thức này trống để EF Core
        // ghi nhận migration vào __EFMigrationsHistory mà không gặp lỗi Duplicate column name.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey("FK_rosbags_Users_reviewer_id", "rosbags");
        migrationBuilder.DropIndex("IX_rosbags_reviewer_id", "rosbags");
        migrationBuilder.DropIndex("IX_rosbags_review_status_CreatedAt", "rosbags");
        migrationBuilder.DropColumn("review_status", "rosbags");
        migrationBuilder.DropColumn("description", "rosbags");
        migrationBuilder.DropColumn("reviewer_id", "rosbags");
        migrationBuilder.DropColumn("review_note", "rosbags");
        migrationBuilder.DropColumn("reviewed_at", "rosbags");
    }
}
