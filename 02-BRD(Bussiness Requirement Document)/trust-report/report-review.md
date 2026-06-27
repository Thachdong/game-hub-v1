---
id: BRD-TRUST-REPORT-001
title: Report user & Admin review
feature: trust-report
status: draft
source_idea: "[[IDEA-001]]"
created: 2026-06-26
tags: [brd, trust-report]
---

# Report user & Admin review

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cho phép player tố cáo (report) hành vi gian lận/làm phiền của user khác để Platform Admin xem
xét, và cho phép Platform Admin tự cấu hình loại report mà không cần sửa code — làm tiền đề
cho việc tự động trừ điểm tin cậy ở [[BRD-TRUST-REPORT-002]].

## 2. Phạm vi

### In scope

- Player report một user khác kèm nội dung/context làm bằng chứng.
- Platform Admin xem danh sách report, review từng report và xác nhận report đó hợp lệ hay
  không hợp lệ.
- Platform Admin tự định nghĩa danh sách loại report (report type) và điểm trừ tương ứng cho
  mỗi loại, qua một cơ chế config có thể chỉnh sửa được (không hardcode trong code).

### Out of scope

- Tự động trừ điểm tin cậy ngay khi report được gửi — luôn cần Platform Admin xác nhận trước
  (việc trừ điểm cụ thể thuộc [[BRD-TRUST-REPORT-002]]).
- Report tự động bởi hệ thống (vd phát hiện gian lận tự động) — chỉ report do player chủ động
  gửi.
- Khiếu nại/phản hồi lại quyết định review của admin — chưa được idea gốc đề cập.

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: gửi report nhắm vào user khác.
- **Platform Admin**: cấu hình loại report, review report, xác nhận hợp lệ/không hợp lệ.

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép player report một user khác, kèm loại report và nội dung/context
  mô tả.
- **FR-2**: Hệ thống lưu lại report với đầy đủ thông tin: người report, người bị report, loại
  report, nội dung/context, thời điểm gửi, trạng thái xử lý.
- **FR-3**: Hệ thống cho phép Platform Admin xem danh sách report đang chờ xử lý.
- **FR-4**: Hệ thống cho phép Platform Admin xác nhận một report là hợp lệ hoặc không hợp lệ.
- **FR-5**: Hệ thống cho phép Platform Admin tạo, sửa, xoá loại report và điểm trừ tương ứng
  của mỗi loại.
- **FR-6**: Khi Platform Admin xác nhận một report hợp lệ, hệ thống kích hoạt việc trừ điểm tin
  cậy của user bị report theo loại report đã xác nhận (xem [[BRD-TRUST-REPORT-002]]).

## 5. Business Rules

- Report được lưu lại làm bằng chứng/context ngay khi gửi; không có hành động trừ điểm nào xảy
  ra cho tới khi Platform Admin xác nhận report hợp lệ.
- Mỗi report gắn với đúng một loại report tại thời điểm gửi hoặc tại thời điểm admin review
  (cần làm rõ ở mục 10).
- Danh sách loại report và điểm trừ tương ứng không cố định trong code — Platform Admin tự
  thêm/sửa/xoá qua cơ chế config.
- Một report đã được Platform Admin xác nhận (hợp lệ hoặc không hợp lệ) không thể review lại
  lần hai (giả định, xem mục 10).

## 6. Acceptance Criteria

- **AC-1** (FR-1, FR-2): Given player A muốn report player B, When A gửi report kèm loại report
  và nội dung, Then hệ thống tạo một report mới ở trạng thái "đang chờ xử lý" gắn với A, B, loại
  report đó.
- **AC-2** (FR-4, FR-6): Given một report đang chờ xử lý, When Platform Admin xác nhận report
  đó hợp lệ, Then report chuyển trạng thái "hợp lệ" và hệ thống kích hoạt trừ điểm tin cậy của
  user bị report.
- **AC-3** (FR-4): Given một report đang chờ xử lý, When Platform Admin xác nhận report đó
  không hợp lệ, Then report chuyển trạng thái "không hợp lệ" và không có hành động trừ điểm nào
  xảy ra.
- **AC-4** (FR-5): Given Platform Admin tạo một loại report mới với điểm trừ X, When player gửi
  report dùng loại report đó, Then report được lưu với loại report và điểm trừ X tương ứng tại
  thời điểm xác nhận hợp lệ.

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- Danh sách loại report + điểm trừ tương ứng phải là config có thể chỉnh sửa được bởi Platform
  Admin, không cần deploy lại code khi thêm/sửa loại report.
- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Giả định mỗi report chỉ gắn với một loại report duy nhất (không report nhiều loại trong một
  lần gửi).
- Giả định report sau khi đã được admin xác nhận (hợp lệ/không hợp lệ) là trạng thái cuối, không
  có quy trình mở lại — cần xác nhận thêm, xem mục 10.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-ACCOUNT-SOCIAL-001]] để có khái niệm user/Platform Admin.
- [[BRD-TRUST-REPORT-002]] phụ thuộc domain này: việc xác nhận report hợp lệ là trigger để trừ
  điểm tin cậy.
- [[BRD-NOTIFICATION-001]] không trigger trực tiếp từ report, nhưng các cảnh báo trust score ở
  BRD-TRUST-REPORT-002 sẽ dùng domain notification.

## 10. Câu hỏi mở / Rủi ro

- Idea gốc chưa nêu rõ report được gắn loại report tại thời điểm player gửi, hay player chỉ mô
  tả tự do và Platform Admin chọn loại report khi review — ảnh hưởng tới UI và FR-1/FR-4. Cần
  hỏi user để chốt.
- Idea gốc chưa nêu report có thể bị review lại (đổi quyết định) sau khi đã xác nhận hay không —
  giả định ở mục 8 là không, cần xác nhận lại nếu sai.
- Chưa rõ player có thấy được trạng thái report mình đã gửi (đang chờ/hợp lệ/không hợp lệ) hay
  không — idea không đề cập, tạm để ngoài phạm vi BRD này.

## ADR liên quan

- [[ADR-TRUST-REPORT-001]] — Admin-tunable config (loại report + điểm trừ) lưu trong DB table
  riêng, đọc trực tiếp runtime, không hardcode/không cần deploy lại.
