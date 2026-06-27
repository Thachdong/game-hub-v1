---
id: ADR-CARO-GAME-002
title: Server-authoritative timer cho hành động có giới hạn thời gian
status: accepted
source_brd: ["[[BRD-CARO-GAME-002]]"]
created: 2026-06-27
tags: [adr, caro-game]
---

# Server-authoritative timer cho hành động có giới hạn thời gian

## Status
Accepted (2026-06-27)

## Quyết định 1 — Server-authoritative timer

### Context
NFR yêu cầu đồng hồ nước đi phải tính theo thời gian server, không dựa vào đồng hồ client, để
tránh gian lận hoặc lệch giờ khi xử thua do hết giờ. Cùng vấn đề áp dụng cho mọi hành động có
giới hạn thời gian khác trên platform (vd cửa sổ Start, mọi countdown tương lai ở game khác),
không riêng đồng hồ nước đi Caro.

### Decision Drivers
- Chống gian lận: client không được là nguồn sự thật cho việc còn bao nhiêu thời gian.
- Hệ thống phải tự chủ động kết thúc hành động đúng lúc hết giờ, không phụ thuộc việc có request
  nào gửi tới hay không (vd player mất kết nối, không gửi request nào, ván vẫn phải xử thua đúng
  giờ).

### Các phương án đã xét (Options Considered)
- **Deadline timestamp + timer riêng cho mỗi action đang chờ**: server lưu deadline, dùng 1 timer
  trong process để chủ động phát hiện hết giờ ngay khi tới hạn và broadcast kết quả qua transport
  realtime đã chọn; client chỉ hiển thị countdown dựa trên deadline server trả về.
- **Deadline timestamp, kiểm tra lazy khi có request**: đơn giản hơn nhưng không tự kết thúc đúng
  lúc nếu không có request nào tới (vd cả hai bên mất kết nối).
- **Client tự đếm ngược và báo server**: vi phạm chính yêu cầu chống gian lận, không chọn.

### Quyết định (Decision)
Với mọi hành động có giới hạn thời gian do hệ thống quản lý (đồng hồ nước đi, cửa sổ Start, và
mọi countdown tương lai khác), server lưu một deadline timestamp tại thời điểm bắt đầu đếm, và
dùng một timer riêng trong process (vd ứng với từng ván/hành động đang chờ) để chủ động phát
hiện đúng lúc hết hạn — không chờ request từ client. Khi tới deadline, server tự chuyển trạng
thái (vd xử thua, huỷ) và broadcast kết quả tới client qua transport realtime đã chọn
([[ADR-NOTIFICATION-001]]). Client chỉ render countdown dựa trên deadline do server trả về,
không tự tính hoặc tự báo hết giờ.

### Hệ quả (Consequences)
- Đảm bảo đúng trong mọi trường hợp (kể cả mất kết nối cả hai bên), không phụ thuộc client.
- Cần quản lý lifecycle của timer (tạo khi bắt đầu đếm, huỷ khi hành động kết thúc sớm hơn deadline
  — vd player đi nước trước khi hết giờ) để tránh timer "rác" hoặc race giữa timer hết hạn và
  hành động vừa kịp xảy ra ngay trước đó (cần xử lý ở `/speckit.plan`).

## Loại khỏi phạm vi

- **Concurrency khi ghép cặp Quick Pair**: cùng vấn đề matchmaking concurrency với Tournament —
  quyết định chung được ghi ở [[ADR-CARO-GAME-003]] (DB row-lock `SELECT...FOR UPDATE SKIP
  LOCKED`), áp dụng trực tiếp cho Quick Pair, không lặp lại quyết định ở đây.
- **Cập nhật lobby/danh sách ván/chat realtime**: đã được bao phủ bởi nguyên tắc Infra
  "WebSocket/SSE là transport mặc định" đã chốt ở [[ADR-NOTIFICATION-001]].
- **Schema cụ thể** (board state, lịch sử nước đi, trạng thái ván) — domain modeling riêng của
  feature, không phải technology layer.
- **Luật thắng/thua/hoà, xử lý mất kết nối, mời bạn bè qua notification** — business logic/
  business rule cụ thể, để `/speckit.plan` xử lý.

## Liên quan (Related)
- [[ADR-CARO-GAME-003]] — matchmaking concurrency (Quick Pair dùng chung quyết định này).
- [[ADR-NOTIFICATION-001]] — transport realtime dùng để broadcast kết quả timer.
