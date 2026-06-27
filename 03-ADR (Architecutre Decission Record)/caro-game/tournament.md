---
id: ADR-CARO-GAME-003
title: DB row-lock cho claim player trong matchmaking đồng thời
status: accepted
source_brd: ["[[BRD-CARO-GAME-003]]"]
created: 2026-06-27
tags: [adr, caro-game]
---

# DB row-lock cho claim player trong matchmaking đồng thời

## Status
Accepted (2026-06-27)

## Quyết định 1 — Concurrency-safe matchmaking

### Context
NFR của BRD này tự nêu rủi ro: cơ chế ghép cặp Swiss phải xử lý đúng khi nhiều player cùng
"rảnh" và sẵn sàng ghép cặp đồng thời. Cùng vấn đề xảy ra với Quick Pair ở
[[BRD-CARO-GAME-002]] (hai process ghép cặp chạy song song có thể cùng chọn trúng một player cho
hai cặp khác nhau — double-booking). Đây là pattern dùng lại cho mọi hệ thống matchmaking/hàng
chờ ghép cặp tương lai trên platform, không riêng Caro.

### Decision Drivers
- Đảm bảo đúng một player chỉ được claim vào đúng một cặp, dù có bao nhiêu request/worker xử lý
  matchmaking chạy đồng thời.
- Ưu tiên dùng đúng cơ chế chuẩn cho bài toán "claim một dòng dữ liệu đúng một lần", tránh tự
  phát minh lại bằng logic application phức tạp.

### Các phương án đã xét (Options Considered)
- **DB row-lock `SELECT ... FOR UPDATE SKIP LOCKED`**: khi lấy player ra khỏi hàng chờ để ghép,
  dùng transaction với row-level lock; process khác tự bỏ qua (skip) player đã bị lock bởi
  process trước, không cần hạ tầng ngoài DB.
- **Hàng chờ tập trung trong 1 process, xử lý tuần tự (in-memory queue)**: không có race condition
  vì không chạy song song, nhưng giới hạn khả năng scale ngang matchmaking sau này.
- **Optimistic locking (version column + retry)**: cũng đúng nhưng cần thêm logic retry phức tạp
  hơn cần thiết so với dùng đúng cơ chế lock DB chuẩn cho bài toán claim-một-lần.

### Quyết định (Decision)
Mọi hệ thống matchmaking/hàng chờ ghép cặp (Quick Pair, Swiss/Arena pairing, và mọi matchmaking
tương lai) lấy player ra khỏi hàng chờ để ghép bằng một transaction DB dùng
`SELECT ... FOR UPDATE SKIP LOCKED` (hoặc cơ chế row-lock tương đương của datastore đang dùng)
trên bảng/hàng đại diện trạng thái "đang chờ" của player. Process nào lock được row thì claim
player đó; process khác tự skip qua player đã bị lock, không retry vào đúng player đó.

### Hệ quả (Consequences)
- Đảm bảo đúng một player chỉ vào đúng một cặp dù có nhiều worker xử lý matchmaking đồng thời.
- Không cần hạ tầng ngoài DB hiện có (phù hợp modular monolith); nếu sau này tách matchmaking
  thành service riêng với nhiều instance, cơ chế này vẫn hoạt động đúng vì lock ở tầng DB chung.
- Cần đảm bảo transaction claim + tạo cặp mới diễn ra trong cùng một transaction (atomic), tránh
  trường hợp claim được player nhưng tạo cặp thất bại giữa đường làm player "kẹt" ở trạng thái
  không rõ ràng (chi tiết xử lý ở `/speckit.plan`).

## Loại khỏi phạm vi

- **Công thức tính điểm tournament** (thắng 2, hoà 1, thua 0, bonus mạch thắng) — business
  rule/value cụ thể, không phải technology layer.
- **Cấp/thu hồi quyền Tournament Creator** — đã được bao phủ bởi nguyên tắc Authentication/role đã
  chốt ở [[ADR-ACCOUNT-SOCIAL-001]], không phải quyết định mới.
- **Danh sách người tham gia cập nhật realtime, phòng chat chung** — đã được bao phủ bởi nguyên
  tắc Infra "WebSocket/SSE mặc định" đã chốt ở [[ADR-NOTIFICATION-001]].

## Liên quan (Related)
- [[ADR-CARO-GAME-002]] — Quick Pair dùng chung quyết định này cho cùng vấn đề matchmaking
  concurrency.
