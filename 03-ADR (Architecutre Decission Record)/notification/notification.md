---
id: ADR-NOTIFICATION-001
title: Event-driven giữa module + WebSocket/SSE cho cập nhật thông báo realtime
status: accepted
source_brd: ["[[BRD-NOTIFICATION-001]]"]
created: 2026-06-27
tags: [adr, notification]
---

# Event-driven giữa module + WebSocket/SSE cho cập nhật thông báo realtime

## Status
Accepted (2026-06-27)

## Quyết định 1 — Cơ chế module khác kích hoạt notification

### Context
BRD yêu cầu NotificationModule cung cấp giao diện dùng chung, ổn định để mọi domain khác (kể cả
game tương lai) gọi tới mà không cần biết chi tiết triển khai; đồng thời Business Rule xác nhận
NotificationModule không tự phát sinh sự kiện — luôn được domain khác kích hoạt. Đây là pattern
giao tiếp lặp lại cho mọi domain "kích hoạt side-effect ở domain khác", không riêng notification.

### Decision Drivers
- Domain phát sinh sự kiện (account-social, trust-report, mỗi game) không nên phụ thuộc cứng
  vào NotificationModule — lỗi/chậm ở Notification không được làm fail luồng nghiệp vụ chính.
- Thêm domain mới phát sinh thông báo (vd game mới) phải dễ, không cần sửa code NotificationModule.

### Các phương án đã xét (Options Considered)
- **Event-driven qua EventEmitter nội bộ**: module nguồn emit domain event, NotificationModule
  subscribe và tự xử lý — decoupled hoàn toàn, lỗi Notification không ảnh hưởng luồng gốc.
- **Gọi trực tiếp qua exported service**: đơn giản, đồng bộ, dễ trace lỗi ngay, nhưng module
  nguồn phụ thuộc cứng vào NotificationModule, lỗi Notification có thể làm fail luồng chính.
- **Message queue (Kafka/RabbitMQ)**: over-engineering cho modular monolith hiện tại, thêm hạ
  tầng phân tán không cần thiết khi mọi module chạy trong cùng 1 process.

### Quyết định (Decision)
Module nguồn (account-social, trust-report, mỗi game) emit một domain event nội bộ (qua
EventEmitter trong process, vd `EventEmitter2`) khi có sự kiện cần thông báo. NotificationModule
chỉ lắng nghe (subscribe) các event này và tự tạo thông báo tương ứng — không module nào gọi
trực tiếp vào internal của NotificationModule, và NotificationModule không gọi ngược lại module
nguồn. Đây là cách áp dụng cụ thể của nguyên tắc module boundary đã chốt (giao tiếp qua interface
export rõ ràng), riêng cho nhóm quan hệ "nhiều nguồn → 1 module xử lý side-effect chung".

### Hệ quả (Consequences)
- NotificationModule có thể lỗi/chậm mà không ảnh hưởng luồng nghiệp vụ chính của module nguồn.
- Thêm domain/game mới phát sinh thông báo chỉ cần emit đúng tên event + payload theo quy ước,
  không cần biết NotificationModule tồn tại hay sửa code module đó.
- Cần quy ước rõ tên event/payload schema (chi tiết cụ thể làm ở `/speckit.plan`), và cần logging
  đủ tốt vì lỗi xảy ra "âm thầm" hơn so với gọi trực tiếp (không có exception trả ngược cho
  module nguồn).

## Quyết định 2 — Transport cho cập nhật thông báo realtime

### Context
Mục 10 của BRD nêu rõ chưa xác nhận kỳ vọng nghiệp vụ về realtime, và để quyết định kỹ thuật cho
bước ADR. Đây là quyết định transport dùng lại được cho mọi tính năng "cập nhật sống" tương lai
trên platform (không riêng notification).

### Decision Drivers
- Trải nghiệm user: badge/danh sách thông báo nên cập nhật ngay khi có sự kiện mới, không cần
  user tự refresh.
- Đặt tiền lệ hạ tầng cho mọi tính năng realtime tương lai (vd trạng thái sống của ván cờ).

### Các phương án đã xét (Options Considered)
- **REST, fetch khi cần**: đơn giản nhất, không duy trì kết nối, nhưng user phải tự mở lại
  dropdown/tải lại trang mới thấy thông báo mới.
- **WebSocket/SSE realtime**: cập nhật ngay khi có event mới, trải nghiệm tốt hơn; cần thêm hạ
  tầng quản lý connection state (và backplane pub-sub nếu scale ngang nhiều instance sau này).
- **Polling định kỳ nhẹ (vd 30s)**: gần-realtime mà không cần WebSocket, nhưng tốn request đều
  đặn dù không có thông báo mới.

### Quyết định (Decision)
Dùng WebSocket (hoặc SSE nếu chiều dữ liệu chỉ một hướng server→client là đủ) để đẩy cập nhật
thông báo (badge count, thông báo mới) tới client ngay khi NotificationModule xử lý xong một
event. Đây là cơ chế realtime mặc định cho mọi tính năng "cập nhật sống" trên platform — tính
năng realtime khác sau này (vd trạng thái ván cờ) tái sử dụng cùng hạ tầng kết nối, không tự
chọn transport riêng trừ khi có lý do kỹ thuật cụ thể khác biệt.

### Hệ quả (Consequences)
- Trải nghiệm tốt hơn, không cần user tự refresh để thấy thông báo mới.
- Cần quản lý connection state (kết nối nào thuộc user nào) và cần một backplane pub-sub (vd
  Redis pub/sub) nếu sau này scale ngang nhiều instance của app — chưa cần ở giai đoạn 1 instance
  hiện tại nhưng cần thiết kế interface tách rời để bổ sung mà không đổi API phía client.
- Client (web + mobile) cần hỗ trợ giữ kết nối WebSocket/SSE — cần xác nhận khả năng tương thích
  mobile app khi implement.

## Liên quan (Related)
- [[ADR-ACCOUNT-SOCIAL-001]] — áp dụng nguyên tắc module boundary (giao tiếp qua interface export
  rõ ràng); Quyết định 1 ở đây là cách cụ thể hoá nguyên tắc đó cho quan hệ nhiều-nguồn-tới-một.
