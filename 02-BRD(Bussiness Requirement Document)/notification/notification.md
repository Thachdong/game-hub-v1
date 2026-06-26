---
id: BRD-NOTIFICATION-001
title: Thông báo in-app
feature: notification
status: draft
source_idea: "[[IDEA-001]]"
created: 2026-06-26
tags: [brd, notification]
---

# Thông báo in-app

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cung cấp một cơ chế thông báo dùng chung trên toàn platform để các domain khác (kết bạn,
report/trust score, và mỗi game) gửi thông báo in-app tới user, giúp user nắm bắt kịp thời các
sự kiện liên quan tới mình mà không cần kiểm tra thủ công.

## 2. Phạm vi

### In scope

- Gửi và hiển thị thông báo in-app cho 4 loại sự kiện:
  1. Lời mời kết bạn / mời chơi game.
  2. Sự kiện tournament liên quan tới user.
  3. Cảnh báo từ admin.
  4. Cảnh báo mốc điểm tin cậy / khoá tham gia game do điểm tin cậy về 0.
- Cơ chế nhận thông báo dùng chung, được các domain khác (account-social, trust-report, và
  từng game) gọi tới khi có sự kiện tương ứng phát sinh.

### Out of scope

- Gửi thông báo qua email hoặc push notification — chỉ in-app.
- Chat 1-1 hoặc group chat — không thuộc phạm vi notification.
- Định nghĩa nội dung/trigger cụ thể của thông báo tournament — thuộc phạm vi BRD của từng game
  (vd Caro), domain này chỉ cung cấp cơ chế nhận và hiển thị.

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: nhận và xem thông báo của mình.
- **Domain khác (account-social, trust-report, từng game)**: là nguồn phát sinh thông báo, gọi
  tới domain notification để tạo thông báo mới cho một user.

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép tạo một thông báo in-app mới gắn với một user cụ thể, thuộc một
  trong 4 loại đã định nghĩa.
- **FR-2**: Hệ thống cho phép player xem danh sách thông báo của mình.
- **FR-3**: Hệ thống phân biệt được loại của mỗi thông báo (lời mời kết bạn/mời chơi game, sự
  kiện tournament, cảnh báo từ admin, cảnh báo mốc điểm tin cậy/khoá) để player có thể nhận biết
  được loại sự kiện.
- **FR-4**: Hệ thống cho phép player đánh dấu một thông báo đã đọc.

## 5. Business Rules

- Thông báo chỉ thuộc một trong 4 loại đã định nghĩa ở phạm vi; mở rộng thêm loại mới ngoài 4
  loại này nằm ngoài phạm vi BRD hiện tại.
- Notification domain không tự phát sinh sự kiện — luôn được domain khác kích hoạt (lời mời kết
  bạn từ [[BRD-ACCOUNT-SOCIAL-002]], cảnh báo điểm tin cậy/khoá từ [[BRD-TRUST-REPORT-002]],
  tournament/mời chơi game từ BRD của từng game).
- Thông báo chỉ gửi in-app; không có kênh email hoặc push notification ở giai đoạn này.

## 6. Acceptance Criteria

- **AC-1** (FR-1, FR-2): Given domain account-social kích hoạt sự kiện "lời mời kết bạn" cho
  player B, When sự kiện được gửi tới notification domain, Then một thông báo loại "lời mời kết
  bạn/mời chơi game" xuất hiện trong danh sách thông báo của B.
- **AC-2** (FR-1, FR-2): Given domain trust-report kích hoạt sự kiện "cảnh báo mốc điểm tin cậy"
  cho một user, When sự kiện được gửi tới notification domain, Then một thông báo loại "cảnh báo
  mốc điểm tin cậy" xuất hiện trong danh sách thông báo của user đó.
- **AC-3** (FR-4): Given player có một thông báo chưa đọc, When player đánh dấu thông báo đó đã
  đọc, Then trạng thái thông báo chuyển thành "đã đọc" và không còn tính là chưa đọc.

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- Notification domain cung cấp một giao diện (API) dùng chung, ổn định để mọi domain khác (kể
  cả game tương lai) có thể gọi tới mà không cần biết chi tiết triển khai lưu trữ/hiển thị.
- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Giả định notification domain chỉ chịu trách nhiệm lưu trữ và hiển thị thông báo, không chịu
  trách nhiệm quyết định khi nào một sự kiện nghiệp vụ xảy ra (quyết định đó thuộc domain phát
  sinh sự kiện).
- Giả định mỗi thông báo chỉ gắn với một user nhận duy nhất (không có thông báo broadcast tới
  nhiều user cùng lúc) — idea gốc không đề cập trường hợp này.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-ACCOUNT-SOCIAL-001]] để có khái niệm user nhận thông báo.
- Được [[BRD-ACCOUNT-SOCIAL-002]] gọi tới khi có lời mời kết bạn.
- Được [[BRD-TRUST-REPORT-002]] gọi tới khi có cảnh báo mốc điểm tin cậy hoặc khoá tham gia
  game.
- Sẽ được BRD của từng game (vd Caro — mời chơi game, sự kiện tournament) gọi tới; chi tiết
  trigger thuộc BRD riêng của game đó.

## 10. Câu hỏi mở / Rủi ro

- Idea gốc không nêu rõ thông báo có cần real-time (đẩy ngay khi có sự kiện) hay chỉ cần hiển
  thị khi player tải lại trang/mở danh sách thông báo — quyết định kỹ thuật (vd dùng realtime
  hay polling) sẽ thuộc bước ADR, nhưng cần biết kỳ vọng nghiệp vụ trước.
- Chưa rõ thông báo có cơ chế tự xoá/hết hạn sau một thời gian hay lưu vô thời hạn — idea gốc
  không đề cập.
