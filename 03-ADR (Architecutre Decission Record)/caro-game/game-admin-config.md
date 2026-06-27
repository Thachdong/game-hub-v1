---
id: ADR-CARO-GAME-001
title: Không có quyết định technology-layer mới từ BRD Game Admin Config
status: rejected
source_brd: ["[[BRD-CARO-GAME-001]]"]
created: 2026-06-27
tags: [adr, caro-game]
---

# Không có quyết định technology-layer mới từ BRD Game Admin Config

## Status
Rejected (2026-06-27) — đã rà toàn bộ BRD-CARO-GAME-001, không có decision point mới nào cần
ghi. Khác với trường hợp "không tìm thấy gì" — ở đây quyết định liên quan (cách lưu config do
Game Admin tự CRUD, không hardcode/không deploy lại) đã được quyết định ở
[[ADR-TRUST-REPORT-001]] và áp dụng được trực tiếp cho cấu hình ván cờ, không cần ghi lại.

## Loại khỏi phạm vi

- **Lưu trữ cấu hình ván cờ (kích thước bàn, thời gian nước đi)**: đã được bao phủ bởi nguyên
  tắc Coding Convention "Giá trị admin-tunable lưu DB-config, không hardcode" đã chốt ở
  [[ADR-TRUST-REPORT-001]] — không phải quyết định mới, chỉ là áp dụng lại.
- **Danh sách giá trị hợp lệ cố định** (18x18/25x25/40x40; 5/10/15/25/35/45/60s): đây là business
  rule/validation rule cụ thể của feature, không phải technology layer.
- **Vai trò Game Admin (Caro)**: cơ chế gán/thu hồi đã quyết định ở [[ADR-ACCOUNT-SOCIAL-001]]
  (JWT bake role); BRD này chỉ tiêu thụ, không phát sinh quyết định mới.

## Liên quan (Related)
- [[ADR-TRUST-REPORT-001]] — nguyên tắc DB-config áp dụng trực tiếp cho domain này.
- [[ADR-ACCOUNT-SOCIAL-001]] — nguyên tắc auth/role áp dụng cho vai trò Game Admin.
