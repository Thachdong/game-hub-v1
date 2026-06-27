---
id: ADR-TRUST-REPORT-001
title: Admin-tunable config lưu trong DB table riêng, đọc trực tiếp runtime
status: accepted
source_brd: ["[[BRD-TRUST-REPORT-001]]"]
created: 2026-06-27
tags: [adr, trust-report]
---

# Admin-tunable config lưu trong DB table riêng, đọc trực tiếp runtime

## Status
Accepted (2026-06-27)

## Quyết định 1 — Lưu trữ giá trị admin-tunable

### Context
BRD yêu cầu một danh sách giá trị (ở đây là loại report + điểm trừ tương ứng) phải chỉnh sửa
được bởi Platform Admin qua hệ thống, không cần sửa code hay deploy lại. Đây là hình mẫu chung
sẽ lặp lại cho bất kỳ giá trị admin-tunable nào phát sinh sau này trên platform, không riêng
report.

### Decision Drivers
- Platform Admin phải tự CRUD được qua hệ thống (không qua biến môi trường/redeploy).
- Quy mô dữ liệu nhỏ (số loại config thường chỉ vài chục dòng), không có yêu cầu hiệu năng đặc
  biệt.
- Ưu tiên đơn giản, tránh thêm hạ tầng không cần thiết ở giai đoạn hiện tại.

### Các phương án đã xét (Options Considered)
- **DB table riêng theo từng loại config, đọc trực tiếp tại runtime**: đơn giản, đáp ứng đúng
  yêu cầu, không cần hạ tầng thêm.
- **DB table + cache layer (Redis), invalidate-on-write**: giảm số lần query nhưng thêm độ phức
  tạp vận hành (quản lý invalidation) không cần thiết ở quy mô hiện tại.
- **Dịch vụ config/feature-flag tách riêng**: over-engineering cho platform nhỏ giai đoạn đầu.

### Quyết định (Decision)
Mọi giá trị mà Platform Admin cần tự chỉnh sửa qua hệ thống (không hardcode, không cần deploy
lại) được lưu trong một DB table riêng cho loại config đó, có cờ active/inactive nếu cần ẩn mà
không xoá. Application đọc trực tiếp từ DB tại thời điểm cần dùng giá trị — không cache, không
dịch vụ config riêng — trừ khi có NFR về hiệu năng/tải cụ thể buộc phải thêm cache sau này.

### Hệ quả (Consequences)
- Đơn giản, không thêm hạ tầng; Platform Admin thấy thay đổi có hiệu lực ngay (không có cache
  lag).
- Nếu sau này một loại config cụ thể có tần suất đọc rất cao (NFR nêu rõ), cần đánh giá lại để
  thêm cache cho riêng loại đó — không áp dụng cache mặc định cho mọi config.

## Loại khỏi phạm vi

- **Schema cụ thể của report** (người report, người bị report, loại report, context, trạng thái
  xử lý) — đây là domain modeling cho riêng feature "report", không phải technology layer; để
  `/speckit.plan` xử lý khi implement feature này.
- **Một report đã xác nhận không được review lại lần hai** — business rule hẹp của riêng luồng
  report (và còn là giả định chưa chốt theo BRD), không khái quát hoá thành nguyên tắc kỹ thuật
  dùng lại được; để `/speckit.plan` xử lý.

## Liên quan (Related)
Không có ADR khác phụ thuộc/supersede tại thời điểm này.
