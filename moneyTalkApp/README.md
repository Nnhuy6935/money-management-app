# Money Talk - Android Application

Money Talk là một ứng dụng quản lý tài chính cá nhân hiện đại được xây dựng bằng **Jetpack Compose**, tuân thủ các nguyên tắc của **Clean Architecture** và **Material 3 Design**.

---

## 🚀 Hướng dẫn khởi động nhanh

### 1. Yêu cầu hệ thống
*   **Android Studio**: Ladybug (2024.2.1) hoặc mới hơn.
*   **JDK**: Version 17 hoặc 21.
*   **Gradle**: Version 8.5+.
*   **Kotlin**: Version 2.1.0.

### 2. Thiết lập Biến môi trường (Environment)
Dự án sử dụng các file `.properties` để quản lý cấu hình API cho từng môi trường build. Các file này đã được thêm vào `.gitignore` để bảo mật.

1. Tại thư mục gốc, tạo 2 file: `env.dev` và `env.staging`.
2. Tham khảo cấu hình mẫu tại các file `env.dev.example` và `env.staging.example` để điền các thông tin cần thiết (như `BASE_URL`).

> [!TIP]
> Khi chạy trên Android Emulator và muốn kết nối tới localhost của máy tính, hãy sử dụng địa chỉ `http://10.0.2.2`.

### 3. Build và Chạy ứng dụng
* **Debug**: Chọn Build Variant `debug` trong Android Studio và nhấn **Run**. App sẽ tự động sử dụng cấu hình từ file `env.dev`.
* **Release**: Chọn Build Variant `release`. App sẽ sử dụng cấu hình từ file `env.staging`.

---

## 🛠 Kiến trúc dự án
Ứng dụng được chia theo mô hình **Clean Architecture**:

*   **`core/`**: Chứa các thành phần dùng chung (Network, Storage, UI Theme, Components).
*   **`data/`**: Thực thi logic lấy dữ liệu (Repositories, Retrofit Services, API Models).
*   **`domain/`**: Chứa Business Logic (Models, Repository Interfaces).
*   **`presentation/`**: Chứa giao diện người dùng (UI) và ViewModels. Chia theo từng feature (Auth, Dashboard, Home, Account).

---

## ✨ Các tính năng nổi bật

### 1. Xác thực & Bảo mật
*   **Flow**: Splash -> Check Token -> (Home hoặc Login).
*   **Token Management**: Sử dụng **Jetpack DataStore** để lưu trữ Access Token an toàn.
*   **Network Interceptor**: Tự động đính kèm `Bearer Token` vào mọi request yêu cầu xác thực.
*   **Auth**: Hỗ trợ Login, Signup, Get Profile và Logout.

### 2. Giao diện hiện đại
*   **Bottom Navigation**: Thanh điều hướng "Floating" (bay) với hiệu ứng animation mượt mà.
*   **Dark/Light Mode**: Hỗ trợ đầy đủ giao diện sáng và tối.
*   **Custom Toast**: Hệ thống thông báo Success/Failed/Info tùy chỉnh đẹp mắt.
*   **UX Tối ưu**: Tự động xử lý cuộn và đẩy giao diện khi mở bàn phím (IME Padding).

### 3. Đa ngôn ngữ (Localization)
*   Hỗ trợ hoàn toàn **Tiếng Việt** và **Tiếng Anh**. Tự động chuyển đổi theo ngôn ngữ hệ thống.

---

## 📡 Networking & Error Handling
*   **Thư viện**: Retrofit 2 + OkHttp 3.
*   **Serialization**: Kotlinx Serialization.
*   **Error Parsing**: Tự động bóc tách thông báo lỗi chi tiết từ Server (e.g., "Email đã tồn tại") để hiển thị lên UI thay vì mã lỗi thô.

---

## 📦 Các thư viện chính sử dụng
*   `androidx.compose`: Giao diện người dùng khai báo.
*   `androidx.navigation`: Điều hướng giữa các màn hình.
*   `androidx.datastore`: Lưu trữ dữ liệu local.
*   `com.squareup.retrofit2`: Gọi API Restful.
*   `androidx.lifecycle`: Quản lý ViewModel và Coroutine Scope.
