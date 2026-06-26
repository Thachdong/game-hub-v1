---
id: BRD-ACCOUNT-SOCIAL-001
title: Đăng nhập & Trang Account
feature: account-social
status: draft
source_idea: "[[IDEA-001]]"
created: 2026-06-26
tags: [brd, account-social]
---

# Đăng nhập & Trang Account

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cho phép user dùng một account duy nhất (qua Google) để truy cập toàn bộ platform và mọi game
trên đó, và cung cấp một trang account làm trung tâm hiển thị thông tin cá nhân, bạn bè, và
toàn bộ game mà platform cung cấp.

## 2. Phạm vi

### In scope

- Đăng nhập bằng Google OAuth; lần đầu đăng nhập tự động tạo account mới, không có bước đăng
  ký riêng.
- Trang Account hiển thị: username, email (lấy từ Google), avatar, danh sách bạn bè, danh sách
  toàn bộ game mà platform cung cấp kèm trạng thái đã có profile ở game đó hay chưa (tick
  xanh).
- Xác định vai trò Platform Admin bằng cách so khớp email đăng nhập với danh sách email cấu
  hình qua biến môi trường.
- Guest (chưa đăng nhập) xem được nội dung public; quyền xem cụ thể của guest theo từng game
  do game đó tự định nghĩa (ngoài phạm vi BRD này).

### Out of scope

- Đăng nhập bằng email/password.
- Liên kết nhiều tài khoản Google vào cùng một account platform.
- UI quản lý/gán role Platform Admin (chỉ qua biến môi trường, không qua UI).
- Định nghĩa quyền cụ thể của Guest theo từng game.

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: user đã đăng nhập, xem/quản lý account của mình.
- **Guest**: user chưa đăng nhập, chỉ xem nội dung public.
- **Platform Admin**: xác định qua danh sách email trong biến môi trường; có quyền truy cập
  các chức năng quản trị ở domain khác (report — xem [[BRD-TRUST-REPORT-001]]).

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép user đăng nhập bằng Google OAuth.
- **FR-2**: Nếu email Google đăng nhập chưa từng tồn tại trên platform, hệ thống tự động tạo
  account mới gắn với email đó (không có form đăng ký riêng).
- **FR-3**: Hệ thống cung cấp trang Account hiển thị username, email, avatar của user đang đăng
  nhập.
- **FR-4**: Trang Account hiển thị danh sách bạn bè của user.
- **FR-5**: Trang Account hiển thị toàn bộ danh sách game mà platform cung cấp; mỗi game hiển
  thị trạng thái user đã có profile ở game đó (tick xanh) hay chưa.
- **FR-6**: Hệ thống xác định một user đăng nhập là Platform Admin nếu email của user khớp với
  danh sách email cấu hình trong biến môi trường tại thời điểm hệ thống khởi động.
- **FR-7**: Hệ thống cho phép Guest xem nội dung public của platform mà không cần đăng nhập.

## 5. Business Rules

- Mỗi user gắn với đúng một tài khoản Google; mỗi tài khoản Google tương ứng đúng một account
  platform.
- Email của account lấy trực tiếp từ Google, không cho user tự sửa.
- Danh sách email Platform Admin chỉ đọc từ biến môi trường lúc khởi động; thay đổi danh sách
  yêu cầu cập nhật biến môi trường và khởi động lại hệ thống.
- Trang Account luôn hiển thị đủ toàn bộ game platform cung cấp, không lọc theo game đã chơi.

## 6. Acceptance Criteria

- **AC-1** (FR-1, FR-2): Given một email Google chưa từng đăng nhập platform, When user đăng
  nhập bằng Google OAuth lần đầu, Then hệ thống tạo account mới gắn email đó và đưa user vào
  trang Account.
- **AC-2** (FR-2): Given một email Google đã có account trên platform, When user đăng nhập lại
  bằng Google OAuth, Then hệ thống đăng nhập vào account hiện có, không tạo account trùng.
- **AC-3** (FR-5): Given platform đang cung cấp N game, When player mở trang Account, Then
  trang hiển thị đủ N game, game nào player đã có profile thì có tick xanh, game còn lại không
  có tick.
- **AC-4** (FR-6): Given email đăng nhập khớp với danh sách email trong biến môi trường, When
  user đăng nhập, Then user được hệ thống coi là Platform Admin trong suốt session đó.

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- Không lưu trữ password của user (toàn bộ xác thực qua Google OAuth2) để giảm rủi ro bảo mật
  tài khoản.
- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Google OAuth là nhà cung cấp định danh duy nhất ở giai đoạn này.
- Việc một game "cung cấp trên platform" (để hiển thị trong danh sách ở FR-5) được một cơ chế
  đăng ký game ở tầng platform xác định — cơ chế này chưa được mô tả trong idea gốc, xem mục 10.

## 9. Phụ thuộc (Dependencies)

- [[BRD-ACCOUNT-SOCIAL-002]] (Kết bạn) dùng chung khái niệm account/user của BRD này.
- [[BRD-TRUST-REPORT-001]], [[BRD-TRUST-REPORT-002]] dùng vai trò Platform Admin định nghĩa ở
  FR-6.
- [[BRD-NOTIFICATION-001]] không phụ thuộc trực tiếp domain này, nhưng cần khái niệm user/player
  để gửi thông báo tới đúng người.

## 10. Câu hỏi mở / Rủi ro

- Idea gốc chưa mô tả cơ chế nào để platform biết "toàn bộ game mà platform cung cấp" (vd một
  bảng đăng ký game tĩnh, hay mỗi game tự đăng ký qua config) — cần làm rõ ở ADR hoặc một BRD
  platform-core riêng nếu phát sinh thêm nghiệp vụ.
- Cơ chế game "tạo profile" cho user (để biết khi nào hiển thị tick xanh) thuộc phạm vi của
  từng game, BRD này chỉ giả định platform đọc được trạng thái đó.
