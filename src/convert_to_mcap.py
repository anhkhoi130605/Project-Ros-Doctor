"""
CLI Tool to convert ROS2 SQLite3 (.db3) rosbag into .mcap format.
Usage:
    python src/convert_to_mcap.py src/Data/rosbag2_carla_2026_10_01-00_26_11
    python src/convert_to_mcap.py path/to/file.db3
"""

import argparse
import sqlite3
import sys
from pathlib import Path

# Fix Windows console UTF-8 output encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def convert_db3_to_mcap(input_path: Path, output_mcap_path: Path | None = None) -> Path:
    input_path = Path(input_path).resolve()
    
    # Neu input la thu muc rosbag, tim file .db3 ben trong
    if input_path.is_dir():
        db3_files = list(input_path.glob("*.db3"))
        if not db3_files:
            raise FileNotFoundError(f"Không tìm thấy file .db3 nào trong thư mục: {input_path}")
        db3_file = db3_files[0]
        if output_mcap_path is None:
            output_mcap_path = input_path / f"{input_path.name}.mcap"
    else:
        db3_file = input_path
        if not db3_file.exists():
            raise FileNotFoundError(f"File .db3 không tồn tại: {db3_file}")
        if output_mcap_path is None:
            output_mcap_path = db3_file.with_suffix(".mcap")

    try:
        from mcap.writer import Writer
    except ImportError:
        raise RuntimeError(
            "Thư viện 'mcap' chưa được cài đặt. Hãy chạy: pip install mcap"
        )

    print(f"[*] Đang đọc dữ liệu từ: {db3_file}")
    conn = sqlite3.connect(str(db3_file))
    cur = conn.cursor()

    # Doc danh sach topics
    cur.execute("SELECT id, name, type FROM topics")
    topics = cur.fetchall()
    if not topics:
        raise ValueError(f"Bảng 'topics' trong {db3_file} trống hoặc không đúng định dạng rosbag2!")

    print(f"[*] Tìm thấy {len(topics)} topics:")
    for tid, name, msg_type in topics:
        print(f"    - [{tid}] {name} ({msg_type})")

    # Dem tong so messages
    cur.execute("SELECT count(*) FROM messages")
    total_msgs = cur.fetchone()[0]
    print(f"[*] Tổng số messages cần convert: {total_msgs}")

    # Ghi vao MCAP
    output_mcap_path.parent.mkdir(parents=True, exist_ok=True)
    with open(str(output_mcap_path), "wb") as f:
        writer = Writer(f)
        writer.start()

        channel_map = {}
        for tid, name, msg_type in topics:
            schema_id = writer.register_schema(name=msg_type, encoding="ros2msg", data=b"")
            channel_id = writer.register_channel(
                schema_id=schema_id,
                topic=name,
                message_encoding="cdr",
            )
            channel_map[tid] = channel_id

        cur.execute("SELECT topic_id, timestamp, data FROM messages ORDER BY timestamp ASC")
        count = 0
        for tid, ts, data in cur:
            writer.add_message(
                channel_id=channel_map[tid],
                log_time=ts,
                data=bytes(data),
                publish_time=ts,
            )
            count += 1

        writer.finish()

    conn.close()

    original_size_mb = db3_file.stat().st_size / (1024 * 1024)
    mcap_size_mb = output_mcap_path.stat().st_size / (1024 * 1024)
    print(f"[✓] Chuyển đổi thành công {count} messages sang MCAP:")
    print(f"    -> File xuất: {output_mcap_path}")
    print(f"    -> Kích thước: {original_size_mb:.2f} MB (.db3) -> {mcap_size_mb:.2f} MB (.mcap)")
    return output_mcap_path


def main():
    parser = argparse.ArgumentParser(description="Convert ROS2 .db3 rosbag to .mcap file")
    parser.add_argument("input", type=str, help="Đường dẫn file .db3 hoặc thư mục chứa rosbag2")
    parser.add_argument("-o", "--output", type=str, default=None, help="Đường dẫn file .mcap xuất ra")
    args = parser.parse_args()

    try:
        convert_db3_to_mcap(Path(args.input), Path(args.output) if args.output else None)
    except Exception as e:
        print(f"[LỖI] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
