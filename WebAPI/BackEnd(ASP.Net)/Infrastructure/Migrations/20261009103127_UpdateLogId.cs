using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLogId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Table, index, FK, LogId column already handled by previous partial applies.

            // Generate unique UUIDs for existing rows (all have default 00000000-...)
            migrationBuilder.Sql("UPDATE `UserActivityLogs` SET `LogId` = UUID() WHERE `LogId` = '00000000-0000-0000-0000-000000000000';");

            migrationBuilder.CreateIndex(
                name: "IX_UserActivityLogs_LogId",
                table: "UserActivityLogs",
                column: "LogId",
                unique: true);

            // Add missing indexes
            migrationBuilder.CreateIndex(
                name: "IX_rosbags_CreatedAt",
                table: "rosbags",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_rosbags_status",
                table: "rosbags",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_review_audit_logs_CreatedAt",
                table: "review_audit_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_review_audit_logs_reviewed_at",
                table: "review_audit_logs",
                column: "reviewed_at");

            migrationBuilder.CreateIndex(
                name: "IX_reports_CreatedAt",
                table: "reports",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_reports_status",
                table: "reports",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_diagnostic_issues_CreatedAt",
                table: "diagnostic_issues",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_diagnostic_issues_session_id_severity",
                table: "diagnostic_issues",
                columns: new[] { "session_id", "severity" });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_sessions_started_at",
                table: "analysis_sessions",
                column: "started_at");

            migrationBuilder.CreateIndex(
                name: "IX_llm_usage_ledger_CreatedAt",
                table: "llm_usage_ledger",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_llm_usage_ledger_analysis_sessions_session_id",
                table: "llm_usage_ledger");

            migrationBuilder.DropIndex(
                name: "IX_UserActivityLogs_LogId",
                table: "UserActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_rosbags_CreatedAt",
                table: "rosbags");

            migrationBuilder.DropIndex(
                name: "IX_rosbags_status",
                table: "rosbags");

            migrationBuilder.DropIndex(
                name: "IX_review_audit_logs_CreatedAt",
                table: "review_audit_logs");

            migrationBuilder.DropIndex(
                name: "IX_review_audit_logs_reviewed_at",
                table: "review_audit_logs");

            migrationBuilder.DropIndex(
                name: "IX_reports_CreatedAt",
                table: "reports");

            migrationBuilder.DropIndex(
                name: "IX_reports_status",
                table: "reports");

            migrationBuilder.DropIndex(
                name: "IX_diagnostic_issues_CreatedAt",
                table: "diagnostic_issues");

            migrationBuilder.DropIndex(
                name: "IX_diagnostic_issues_session_id_severity",
                table: "diagnostic_issues");

            migrationBuilder.DropIndex(
                name: "IX_analysis_sessions_started_at",
                table: "analysis_sessions");

            migrationBuilder.Sql("ALTER TABLE `llm_usage_ledger` DROP PRIMARY KEY;");

            migrationBuilder.DropIndex(
                name: "IX_llm_usage_ledger_CreatedAt",
                table: "llm_usage_ledger");

            migrationBuilder.DropColumn(
                name: "LogId",
                table: "UserActivityLogs");

            migrationBuilder.RenameTable(
                name: "llm_usage_ledger",
                newName: "ai_usage_logs");

            migrationBuilder.RenameIndex(
                name: "IX_llm_usage_ledger_session_id",
                table: "ai_usage_logs",
                newName: "IX_ai_usage_logs_session_id");

            migrationBuilder.Sql("ALTER TABLE `ai_usage_logs` ADD PRIMARY KEY (`Id`);");

            migrationBuilder.AddForeignKey(
                name: "FK_ai_usage_logs_analysis_sessions_session_id",
                table: "ai_usage_logs",
                column: "session_id",
                principalTable: "analysis_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
