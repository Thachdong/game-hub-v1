---
id: ADR-CARO-GAME-004
title: Query trực tiếp DB có index cho leaderboard top-N
status: accepted
source_brd: ["[[BRD-CARO-GAME-004]]"]
created: 2026-06-27
tags: [adr, caro-game]
---

# Query trực tiếp DB có index cho leaderboard top-N

## Status
Accepted (2026-06-27)

## Quyết định 1 — Chiến lược truy vấn leaderboard

### Context
BRD yêu cầu leaderboard hiển thị top 10 theo điểm số, cập nhật sau mỗi lần điểm thay đổi. Đây là
pattern dùng lại cho mọi bảng xếp hạng "top-N theo một điểm số" tương lai trên platform, không
riêng elo Caro.

### Decision Drivers
- Top-N phải phản ánh đúng dữ liệu hiện tại ngay sau khi điểm thay đổi, không có độ trễ.
- Quy mô hiện tại (1 game, top 10) không cần tối ưu hiệu năng đặc biệt; ưu tiên đơn giản, tránh
  thêm hạ tầng khi chưa có NFR về tải/hiệu năng cụ thể.

### Các phương án đã xét (Options Considered)
- **Query trực tiếp DB có index trên cột điểm số** (vd `ORDER BY score DESC LIMIT 10`): luôn
  đúng real-time với dữ liệu, không cần đồng bộ thêm cấu trúc dữ liệu phụ.
- **Sorted set riêng (Redis ZSET)**: đọc nhanh hơn nhưng thêm hạ tầng (Redis) và rủi ro lệch dữ
  liệu giữa DB (nguồn sự thật) và ZSET (cache) nếu cập nhật ZSET thất bại giữa đường.
- **Pre-compute theo batch job định kỳ**: đơn giản hơn Redis nhưng có độ trễ, không khớp đúng yêu
  cầu "cập nhật sau mỗi lần điểm thay đổi".

### Quyết định (Decision)
Mọi leaderboard "top-N theo một điểm số" trên platform dùng query trực tiếp vào DB với index
trên cột điểm số liên quan (vd `ORDER BY score DESC LIMIT N`), thực thi mỗi lần cần hiển thị —
không cache, không cấu trúc dữ liệu phụ — trừ khi có NFR hiệu năng/tải cụ thể (vd số người chơi
rất lớn khiến query top-N chậm) buộc phải bổ sung cache cho riêng leaderboard đó.

### Hệ quả (Consequences)
- Đơn giản, luôn đúng dữ liệu real-time, không cần đồng bộ thêm hạ tầng.
- Nếu sau này số lượng player tăng lớn và query top-N trở thành điểm nghẽn (cần NFR cụ thể xác
  nhận), cần đánh giá lại để thêm cache/sorted-set cho riêng leaderboard đó — không áp dụng cache
  mặc định trước khi có nhu cầu thực tế.

## Loại khỏi phạm vi

- **Công thức elo, K-factor, mốc 30 ván** — business rule/value cụ thể (và còn là giả định BA
  chưa được user xác nhận theo mục 10 của BRD), không phải technology layer.
- **Cập nhật điểm elo sau mỗi ván (read-modify-write)** — đã được bao phủ bởi nguyên tắc Data
  Access "Atomic update cho counter bị ghi đồng thời" đã chốt ở [[ADR-TRUST-REPORT-002]], áp dụng
  trực tiếp cho elo, không phải quyết định mới.

## Liên quan (Related)
- [[ADR-TRUST-REPORT-002]] — atomic update áp dụng cho việc ghi điểm elo.
