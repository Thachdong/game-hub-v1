---
id: ADR-TRUST-REPORT-002
title: Atomic update ở tầng DB cho counter bị ghi đồng thời
status: accepted
source_brd: ["[[BRD-TRUST-REPORT-002]]"]
created: 2026-06-27
tags: [adr, trust-report]
---

# Atomic update ở tầng DB cho counter bị ghi đồng thời

## Status
Accepted (2026-06-27)

## Quyết định 1 — Cập nhật counter có thể bị ghi đồng thời

### Context
Nhiều report nhắm vào cùng một user có thể được Platform Admin xác nhận gần như đồng thời, mỗi
lần xác nhận đều trừ điểm tin cậy của user đó — nếu đọc giá trị hiện tại về application rồi tính
toán lại rồi ghi đè, hai request đồng thời có thể đọc cùng giá trị cũ và một lần trừ điểm bị mất
(lost update). Đây là rủi ro chung cho mọi counter có thể bị ghi đồng thời trên platform (điểm
số, số dư, bộ đếm...), không riêng trust score.

### Decision Drivers
- Đảm bảo đúng giá trị cuối cùng dù có bao nhiêu request ghi đồng thời.
- Logic cộng/trừ ở đây đơn giản (cộng/trừ một lượng, chặn trần/sàn), không cần transaction phức
  tạp nhiều bước.

### Các phương án đã xét (Options Considered)
- **Atomic update ở tầng DB** (vd `UPDATE ... SET score = GREATEST(0, LEAST(100, score - X))`):
  DB tự đảm bảo atomic, không cần đọc giá trị về app rồi tính lại.
- **Optimistic locking (version column + retry ở application)**: cũng đảm bảo đúng nhưng cần
  thêm logic retry, phức tạp hơn mức cần thiết cho phép cộng/trừ đơn giản không có nhiều bước
  nghiệp vụ kèm theo.
- **Read-modify-write ở application layer**: có race condition thật, không đảm bảo đúng khi
  ghi đồng thời — không chọn.

### Quyết định (Decision)
Mọi counter có thể bị ghi đồng thời bởi nhiều luồng/request (điểm tin cậy, và mọi counter tương
tự phát sinh sau này) phải được cập nhật bằng một câu lệnh atomic ở tầng DB (vd
`UPDATE ... SET col = col ± X` có điều kiện chặn trần/sàn ngay trong cùng câu lệnh), không đọc
giá trị hiện tại về application rồi tính toán lại rồi ghi đè.

### Hệ quả (Consequences)
- Đúng giá trị cuối cùng trong mọi trường hợp concurrent, không cần thêm logic retry.
- Logic nghiệp vụ phức tạp hơn (vd cần biết giá trị trước/sau để trigger cảnh báo mốc 50/20/10)
  phải đọc giá trị mới nhất sau khi update (trong cùng transaction/statement trả về giá trị mới,
  vd `RETURNING` ở Postgres), không suy luận giá trị từ lần đọc trước đó.

## Loại khỏi phạm vi

- **Giá trị cụ thể** (khởi tạo 100, mốc cảnh báo 50/20/10, khoá 7 ngày, hồi phục +1/ngày) —
  business rule/business value cụ thể của feature trust score, không phải technology layer.
- **Khoá quyền tham gia game ở tầng platform, không phải từng game tự kiểm tra riêng** — đã được
  bao phủ bởi nguyên tắc Architecture đã chốt ở [[ADR-ACCOUNT-SOCIAL-001]] (mỗi module giao tiếp
  qua interface/service export rõ ràng); không phải quyết định mới, chỉ là áp dụng lại nguyên
  tắc đã có — không ghi thành quyết định riêng.
- **Gửi thông báo khi qua mốc cảnh báo/khi bị khoá** — phụ thuộc domain notification, là business
  trigger cụ thể, không phải quyết định kỹ thuật mới ở đây.

## Liên quan (Related)
- [[ADR-ACCOUNT-SOCIAL-001]] — nguyên tắc module boundary áp dụng cho việc các module khác kiểm
  tra trạng thái khoá của user qua interface của module này.
