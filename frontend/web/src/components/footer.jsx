export default function Footer() {
  return (
    <footer>
      <div>
        {/* Cột 1: Thông tin dự án */}
        <div>
          <h4>HealthyAI</h4>
          <p>
            Hệ thống hỗ trợ đánh giá nguy cơ bệnh mạn tính bằng AI. 
            Giải pháp phát triển bởi CICT - Đại học Cần Thơ.
          </p>
        </div>

        {/* Cột 2: Đường dẫn nhanh */}
        <div>
          <h4>Liên kết</h4>
          <ul>
            <li><a href="#">Hướng dẫn sử dụng</a></li>
            <li><a href="#">Chính sách bảo mật</a></li>
            <li><a href="#">Điều khoản dịch vụ</a></li>
          </ul>
        </div>

        {/* Cột 3: Liên hệ */}
        <div>
          <h4>Liên hệ</h4>
          <p>
            📧 cict@ctu.edu.vn
            <br />
            📍 Khu II, đường 3/2, Q. Ninh Kiều, TP. Cần Thơ
          </p>
        </div>
      </div>

      <div>
        <p>
          &copy; {new Date().getFullYear()} HealthyAI Project - CICT CTU. All rights reserved.
        </p>
      </div>
    </footer>
  );
}