import React from 'react';
import { Link } from 'react-router-dom';
import { Logo, Button, Icon } from '../../../components/common/UIComponents';
import PearlScene from '../../../components/common/PearlScene';
import SmoothReveal from '../../../components/common/SmoothReveal';

export default function LandingPage() {
  return (
    <div className="ctrn-home">
      <header className="ctrn-public-header">
        <Link to="/" aria-label="CTRN SHIFT N, trang chủ">
          <Logo />
        </Link>
        <nav>
          <a href="#workflow">Quy trình chẩn đoán</a>
          <a href="#roles">Vai trò</a>
          <Button to="/login" variant="secondary">
            Đăng nhập
          </Button>
          <Button to="/register">Tạo tài khoản</Button>
        </nav>
      </header>

      <main>
        <section className="ctrn-hero">
          <SmoothReveal duration={520} distance={14}>
            <div className="ctrn-hero-copy">
            <span className="section-kicker">RAV-13 / ROS2 DIAGNOSTICS</span>
            <h1>
              Hiểu tín hiệu.<br />
              Giải mã <em>robot.</em>
            </h1>
            <p>
              Từ dữ liệu rosbag đến bằng chứng chẩn đoán. AI gợi ý nguyên nhân và hướng khắc phục. Kỹ sư giữ quyền quyết định.
            </p>

            <div className="button-row">
              <Button to="/login" icon="arrow">
                Vào không gian làm việc
              </Button>
              <a className="ctrn-text-link" href="#workflow">
                Khám phá quy trình <Icon name="down" size={16} />
              </a>
            </div>

            <div className="ctrn-hero-meta">
              <span>01 / PHÂN TÍCH LOG GHI SẴN</span>
              <span>02 / KẾT LUẬN CÓ BẰNG CHỨNG</span>
            </div>
            </div>
          </SmoothReveal>

          <PearlScene />
        </section>

        <section className="ctrn-workflow" id="workflow">
          <div>
            <span className="section-kicker">TỪ DỮ LIỆU ĐẾN QUYẾT ĐỊNH</span>
            <h2>
              Một quy trình.<br />
              Bốn bước rõ ràng.
            </h2>
          </div>

          <div className="ctrn-workflow-grid">
            {[
              ['01', 'Nạp rosbag', 'Trích xuất metadata, kiểm tra tệp và lọc dữ liệu nhạy cảm.'],
              ['02', 'Phân tích bất thường', 'Tần số, mất gói, timestamp, TF và topic ngừng phát.'],
              ['03', 'Đối chiếu cùng Agent', 'Xem bằng chứng, hỏi đáp và kiểm tra giả thuyết nguyên nhân.'],
              ['04', 'Duyệt & xuất báo cáo', 'Kỹ sư xác nhận kết luận trước khi chia sẻ PDF hoặc Markdown.'],
            ].map(([num, title, desc]) => (
              <article key={num}>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ctrn-roles" id="roles">
          <span className="section-kicker">ĐÚNG NGƯỜI. ĐÚNG QUYỀN.</span>
          <h2>Ba vai trò, cùng một hệ thống.</h2>
          <div className="ctrn-role-grid">
            {[
              ['Kỹ sư Robotics', 'Phân tích rosbag, xem giả thuyết bất thường, gắn thẻ bằng chứng và duyệt báo cáo chính thức.'],
              ['Quản trị viên (Admin)', 'Quản lý tài khoản, cấp quyền theo từng dự án robot và giám sát nhật ký audit hệ thống.'],
              ['Viewer (Khách)', 'Xem các báo cáo chẩn đoán đã được cấp phép mà không làm thay đổi dữ liệu gốc.'],
            ].map(([roleTitle, roleDesc], i) => (
              <div key={i} className="card">
                <h3>{roleTitle}</h3>
                <p>{roleDesc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="ctrn-public-footer">
        <span>CTRL SHIFT N / ROS2 Diagnostic System</span>
        <span>Phoenix Agent Platform · VinUni</span>
      </footer>
    </div>
  );
}
