using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations;

public partial class AddRosbagReview : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing recordings remain usable. Only the user submission endpoint writes Submitted.
        migrationBuilder.AddColumn<string>(name: "review_status", table: "rosbags",
            type: "varchar(20)", maxLength: 20, nullable: false, defaultValue: "Approved",
            collation: "utf8mb4_0900_ai_ci").Annotation("MySql:CharSet", "utf8mb4");
        migrationBuilder.AddColumn<string>(name: "description", table: "rosbags",
            type: "varchar(2000)", maxLength: 2000, nullable: true,
            collation: "utf8mb4_0900_ai_ci").Annotation("MySql:CharSet", "utf8mb4");
        migrationBuilder.AddColumn<string>(name: "reviewer_id", table: "rosbags",
            type: "varchar(36)", maxLength: 36, nullable: true,
            collation: "utf8mb4_0900_ai_ci").Annotation("MySql:CharSet", "utf8mb4");
        migrationBuilder.AddColumn<string>(name: "review_note", table: "rosbags",
            type: "varchar(2000)", maxLength: 2000, nullable: true,
            collation: "utf8mb4_0900_ai_ci").Annotation("MySql:CharSet", "utf8mb4");
        migrationBuilder.AddColumn<DateTime>(name: "reviewed_at", table: "rosbags",
            type: "datetime(6)", nullable: true);
        migrationBuilder.CreateIndex(name: "IX_rosbags_reviewer_id", table: "rosbags", column: "reviewer_id");
        migrationBuilder.CreateIndex(name: "IX_rosbags_review_status_CreatedAt", table: "rosbags",
            columns: new[] { "review_status", "CreatedAt" });
        migrationBuilder.AddForeignKey(name: "FK_rosbags_Users_reviewer_id", table: "rosbags",
            column: "reviewer_id", principalTable: "Users", principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
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
