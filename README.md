# Project MERN Stack Sandbox (Docker Test)

Đây là dự án mẫu kết hợp **React (Vite)** + **Node.js (Express)** + **MongoDB** được cấu hình sẵn môi trường Docker. Dự án này được thiết kế để bạn thực hành kiểm thử môi trường Docker Compose.

---

## 🛠️ Yêu cầu hệ thống
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (hoặc Docker Engine & Docker Compose trên Linux).

---

## 🚀 Hướng dẫn khởi chạy ứng dụng bằng Docker

Để chạy toàn bộ hệ thống (Frontend, Backend, Database MongoDB), bạn thực hiện theo các bước sau:

### 1. Khởi động các container
Mở Terminal (Command Prompt hoặc PowerShell trên Windows) tại thư mục gốc của dự án (`d:\testdocker`) và chạy lệnh:

```bash
docker-compose up --build
```

> **Lưu ý:**
> - Tham số `--build` đảm bảo Docker build lại Dockerfile của frontend và backend khi bạn khởi chạy lần đầu hoặc khi có thay đổi code.
> - Nếu bạn muốn chạy ẩn dưới nền (background), hãy thêm tham số `-d`: `docker-compose up --build -d`

### 2. Truy cập ứng dụng
Sau khi quá trình build và chạy thành công (trạng thái hiển thị `Up` hoặc chạy ổn định ở terminal), bạn có thể truy cập qua trình duyệt:

- **Giao diện Frontend (React):** [http://localhost:8080](http://localhost:8080)
- **API Backend (Node.js/Express):** [http://localhost:5000/api](http://localhost:5000/api)
- **Cơ sở dữ liệu MongoDB:** `mongodb://localhost:27017`

### 3. Kiểm tra tính năng
- Trên giao diện React, bạn kiểm tra góc trạng thái xem đã báo **Connected** chưa.
- Nhập một số văn bản vào ô input và nhấn **Thêm**.
- Reload lại trang xem dữ liệu có được hiển thị lại không (dữ liệu được lưu trữ trong MongoDB thông qua Docker Volume `mongo_data` được cấu hình trong `docker-compose.yml`, giúp tránh mất dữ liệu khi tắt container).
- Thử xóa một số bản ghi để test API DELETE.

### 4. Dừng hệ thống
Để tắt các container, hãy nhấn tổ hợp phím `Ctrl + C` trên terminal đang chạy, hoặc nếu chạy ngầm (`-d`), hãy dùng lệnh:

```bash
docker-compose down
```

---

## 📂 Cấu trúc thư mục dự án

```text
testdocker/
├── backend/                  # Mã nguồn server Node.js
│   ├── src/
│   │   ├── models/Item.js    # Schema Model của MongoDB (Mongoose)
│   │   └── server.js         # REST API kết nối database
│   └── Dockerfile            # Cấu hình container hóa Backend
├── frontend/                 # Mã nguồn giao diện React.js
│   ├── src/
│   │   ├── App.jsx           # Logic giao diện & gọi API CRUD
│   │   ├── App.css           # CSS Styling (Giao diện hiện đại)
│   │   ├── index.css         # Reset css & biến CSS
│   │   └── main.jsx          # Điểm khởi đầu của ứng dụng React
│   ├── nginx.conf            # Cấu hình Nginx làm proxy ngược (Reverse Proxy)
│   └── Dockerfile            # Cấu hình Multi-stage Docker build
├── docker-compose.yml        # Điều phối cả 3 containers (Web + API + DB)
└── README.md                 # Hướng dẫn này
```

---

## ⚡ Các lệnh Docker Compose hữu ích khác

- **Xem log của các container:**
  ```bash
  docker-compose logs -f
  ```
- **Xem log của riêng backend:**
  ```bash
  docker-compose logs -f backend
  ```
- **Xóa hoàn toàn dữ liệu database cũ (xóa Volume):**
  ```bash
  docker-compose down -v
  ```
