---
id: ADR-ACCOUNT-SOCIAL-002
title: Không có quyết định technology-layer từ BRD Kết bạn
status: rejected
source_brd: ["[[BRD-ACCOUNT-SOCIAL-002]]"]
created: 2026-06-26
tags: [adr, account-social]
---

# Không có quyết định technology-layer từ BRD Kết bạn

## Status
Rejected (2026-06-26) — đã rà toàn bộ BRD-ACCOUNT-SOCIAL-002, không có decision point nào đạt
Rule 1 (technology-layer, áp dụng xuyên suốt project). Ghi nhận để biết BRD này đã được audit,
không phải bị bỏ sót.

## Loại khỏi phạm vi

- **Chống trùng lời mời kết bạn đang chờ khi có concurrent request** (Business Rule: "một cặp
  user không thể có nhiều hơn một lời mời đang chờ cùng chiều gửi"). Phương án kỹ thuật hợp lý là
  DB unique constraint composite trên `(sender_id, receiver_id)` khi `status='pending'` — nhưng
  quyết định này chỉ tồn tại vì đúng 1 business rule của feature "Kết bạn"; nếu feature này không
  tồn tại, quyết định cũng không cần thiết (không qua phép kiểm tra B — tính bất biến theo
  feature). Đây là business logic implementation, không phải technology layer, dù có vẻ là một
  "concurrency decision". Để `/speckit.plan` xử lý trực tiếp khi implement feature này (đưa
  constraint cụ thể vào Tech Design/plan), không ghi ADR.

## Liên quan (Related)
Không có ADR khác liên quan.
