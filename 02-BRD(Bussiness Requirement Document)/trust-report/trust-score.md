---
id: BRD-TRUST-REPORT-002
title: Điểm tin cậy (Trust Score)
feature: trust-report
status: draft
source_idea: "[[IDEA-001]]"
created: 2026-06-26
tags: [brd, trust-report]
---

# Điểm tin cậy (Trust Score)

## 1. Mục tiêu nghiệp vụ (Business Objective)

Tự động phản ánh mức độ tin cậy của user qua một điểm số, giảm khi user bị report hợp lệ, cảnh
báo khi điểm giảm tới các mốc quan trọng, và tự động khoá/khôi phục quyền tham gia game theo
điểm số đó — nhằm hạn chế hành vi gian lận/làm phiền mà không cần admin can thiệp thủ công ở
từng bước cảnh báo/khoá.

## 2. Phạm vi

### In scope

- Khởi tạo điểm tin cậy 100 cho mỗi user mới.
- Tự động trừ điểm tin cậy của user khi một report nhắm vào user đó được Platform Admin xác
  nhận hợp lệ, theo điểm trừ của loại report đã xác nhận.
- Gửi thông báo cảnh báo khi điểm tin cậy giảm xuống dưới các mốc 50, 20, 10.
- Tự động khoá quyền tham gia game trong 7 ngày khi điểm tin cậy về 0 (account và trang account
  vẫn truy cập được bình thường).
- Hồi phục dần điểm tin cậy: sau khi hết 7 ngày khoá, mỗi ngày đăng nhập cộng lại +1 điểm, tối
  đa 100, tối thiểu 0.

### Out of scope

- Cộng điểm tin cậy vì hành vi tốt (không có cơ chế tăng điểm ngoài hồi phục sau khoá).
- Admin chủ động sửa tay điểm tin cậy của một user — idea gốc không đề cập cơ chế này.
- Khoá vĩnh viễn hoặc khoá theo nhiều mốc thời gian khác 7 ngày.

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: chủ thể có điểm tin cậy, nhận cảnh báo, bị khoá/được hồi phục.
- **Platform Admin**: gián tiếp tác động điểm tin cậy thông qua xác nhận report hợp lệ (xem
  [[BRD-TRUST-REPORT-001]]).

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống khởi tạo điểm tin cậy bằng 100 cho mỗi user ngay khi account được tạo.
- **FR-2**: Khi một report được Platform Admin xác nhận hợp lệ, hệ thống tự động trừ điểm tin
  cậy của user bị report theo số điểm cấu hình cho loại report đó.
- **FR-3**: Khi điểm tin cậy của user giảm xuống dưới 50, 20, hoặc 10, hệ thống gửi một thông
  báo cảnh báo cho user đó (loại "cảnh báo mốc điểm tin cậy").
- **FR-4**: Khi điểm tin cậy của user về 0, hệ thống tự động khoá quyền tham gia game của user
  đó trong 7 ngày; user vẫn đăng nhập và xem trang account bình thường trong thời gian khoá.
- **FR-5**: Hệ thống gửi thông báo cho user khi tài khoản bị khoá tham gia game do điểm tin cậy
  về 0.
- **FR-6**: Sau khi hết thời gian khoá 7 ngày, mỗi lần user đăng nhập trong một ngày mới, hệ
  thống cộng lại +1 điểm tin cậy cho user đó, không vượt quá 100 và không xuống dưới 0.

## 5. Business Rules

- Điểm tin cậy khởi tạo: 100.
- Điểm trừ mỗi loại report do Platform Admin cấu hình qua [[BRD-TRUST-REPORT-001]], không cố
  định trong code.
- Mốc cảnh báo: điểm tin cậy giảm xuống dưới 50, 20, hoặc 10 → gửi thông báo cảnh báo. Mỗi mốc
  chỉ kích hoạt cảnh báo một lần cho tới khi điểm hồi phục lên trên mốc đó và giảm xuống lại
  (giả định, xem mục 10).
- Điểm tin cậy về 0 → tự động khoá quyền tham gia game 7 ngày; không ảnh hưởng quyền truy cập
  account.
- Sau 7 ngày khoá, mỗi ngày đăng nhập (không phải mỗi ngày trôi qua) cộng +1 điểm, tối đa 100,
  tối thiểu 0.
- Việc trừ điểm chỉ xảy ra khi Platform Admin xác nhận report hợp lệ — không có đường nào khác
  làm giảm điểm tin cậy.

## 6. Acceptance Criteria

- **AC-1** (FR-1): Given một account mới được tạo, When account được tạo thành công, Then điểm
  tin cậy của user đó là 100.
- **AC-2** (FR-2): Given user có điểm tin cậy hiện tại là 60 và bị report loại "gian lận" (điểm
  trừ cấu hình là 15) được xác nhận hợp lệ, When report được xác nhận, Then điểm tin cậy của
  user giảm xuống 45.
- **AC-3** (FR-3): Given điểm tin cậy của user giảm từ 55 xuống 45 (vượt qua mốc 50), When việc
  trừ điểm xảy ra, Then hệ thống gửi thông báo cảnh báo mốc 50 cho user đó.
- **AC-4** (FR-4, FR-5): Given điểm tin cậy của user giảm xuống 0, When việc trừ điểm xảy ra,
  Then hệ thống khoá quyền tham gia game của user trong 7 ngày kể từ thời điểm đó và gửi thông
  báo khoá; user vẫn vào được trang account.
- **AC-5** (FR-6): Given user đang trong giai đoạn hồi phục sau khoá (đã qua 7 ngày, điểm tin
  cậy hiện tại là 3), When user đăng nhập vào một ngày mới, Then điểm tin cậy tăng lên 4.
- **AC-6** (FR-6): Given điểm tin cậy hiện tại của user là 100, When user đăng nhập vào một ngày
  mới (giả định không trong giai đoạn khoá), Then điểm tin cậy giữ ở 100 (không vượt quá 100).

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- Việc trừ/cộng điểm tin cậy và kiểm tra khoá tham gia game phải được tính nhất quán dù truy cập
  qua web app hay mobile app sau này (business logic dùng chung qua API-first).

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Giả định mỗi mốc cảnh báo (50/20/10) chỉ gửi thông báo một lần mỗi lần điểm đi xuống qua mốc
  đó, không gửi lại liên tục mỗi khi có request — cần xác nhận với user, xem mục 10.
- Giả định "ngày" trong quy tắc hồi phục +1 điểm/ngày tính theo ngày dương lịch (calendar day),
  không phải khoảng 24 giờ trượt — cần xác nhận, xem mục 10.
- Giả định việc khoá quyền tham gia game chặn ở tầng platform (mọi game), không phải từng game
  tự kiểm tra riêng.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-ACCOUNT-SOCIAL-001]] để có khái niệm user/account.
- Phụ thuộc [[BRD-TRUST-REPORT-001]]: trigger trừ điểm là sự kiện "report được xác nhận hợp lệ".
- [[BRD-NOTIFICATION-001]] phụ thuộc domain này để gửi 2 loại thông báo: cảnh báo mốc điểm tin
  cậy, và cảnh báo khoá tham gia game.

## 10. Câu hỏi mở / Rủi ro

- Cần xác nhận: mỗi mốc cảnh báo (50/20/10) có gửi lại nhiều lần nếu điểm tiếp tục dao động qua
  mốc đó (vd giảm rồi tăng rồi giảm lại) hay chỉ gửi đúng một lần trong "lịch sử" của account?
- Cần xác nhận: "mỗi ngày đăng nhập" trong quy tắc hồi phục tính theo ngày dương lịch theo
  timezone nào (server, hay theo user)?
- Idea gốc không nói rõ trong giai đoạn 7 ngày bị khoá, nếu user tiếp tục bị report hợp lệ thêm
  thì điểm tin cậy (đang ở 0, không thể âm) và thời gian khoá có bị gia hạn không — cần hỏi
  user để chốt quy tắc.

## ADR liên quan

- [[ADR-TRUST-REPORT-002]] — Atomic update ở tầng DB cho điểm tin cậy (và mọi counter bị ghi
  đồng thời tương lai), tránh lost update khi nhiều report được xác nhận gần đồng thời.
