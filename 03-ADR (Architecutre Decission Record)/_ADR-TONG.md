---
title: ADR tổng — input cho /speckit.constitution
status: living-document
created: 2026-06-27
tags: [adr, constitution]
---

# ADR tổng

File duy nhất, tổng hợp toàn bộ quyết định `accepted` từ các ADR theo từng BRD ở
`03-ADR (Architecutre Decission Record)/<feature>/`. Đây là nội dung copy thẳng vào
`/speckit.constitution` — chỉ chứa nguyên tắc declarative, không nhắc FR/AC/tên BRD/tên feature
cụ thể nào. Amend file này mỗi khi có ADR `accepted` mới, không viết lại từ đầu.

## Architecture

- **Modular monolith**: 1 application, 1 database. Mỗi business domain là một module riêng
  trong codebase, chỉ giao tiếp với module khác qua interface/service được export rõ ràng —
  không import trực tiếp phần nội bộ (internal) của module khác. Mỗi module có schema/namespace
  riêng trong database chung (schema riêng nếu Postgres, hoặc tối thiểu prefix bảng theo domain).
  *(nguồn: [[ADR-ACCOUNT-SOCIAL-001]])*
- **Giao tiếp nhiều-nguồn-tới-một qua event nội bộ**: khi nhiều module cần kích hoạt side-effect
  ở một module dùng chung (vd module xử lý thông báo), module nguồn emit domain event qua
  EventEmitter trong process; module đích chỉ subscribe, không gọi trực tiếp lẫn nhau theo chiều
  ngược lại. Không dùng message queue phân tán (Kafka/RabbitMQ) khi còn là modular monolith 1
  process. *(nguồn: [[ADR-NOTIFICATION-001]])*
- **Hexagonal (Ports & Adapters) cho api**: codebase api tổ chức business logic (domain/use-case)
  ở core, không phụ thuộc trực tiếp framework hay hạ tầng (DB, HTTP, queue, third-party API...).
  Mọi giao tiếp ra ngoài đi qua port (interface) do core định nghĩa; framework/hạ tầng implement
  adapter cho port đó. Core không import trực tiếp một adapter cụ thể nào — chỉ nhận qua dependency
  injection theo interface. *(nguồn: team dev default convention)*

## Authentication & Security

- **JWT (access + refresh token)** cho mọi API: access token thời hạn ngắn (15–30 phút), refresh
  token thời hạn dài (7–30 ngày). Role/quyền của user bake vào access token tại thời điểm đăng
  nhập hoặc refresh, verify bằng signature — không query DB mỗi request thông thường. Không dùng
  server-side session/cookie làm cơ chế xác thực chính. *(nguồn: [[ADR-ACCOUNT-SOCIAL-001]])*
- **Server-authoritative timer cho hành động có giới hạn thời gian**: mọi countdown/deadline do
  hệ thống quản lý (không riêng một feature) phải dùng deadline timestamp lưu ở server + timer
  riêng trong process để chủ động phát hiện hết hạn, broadcast kết quả qua transport realtime
  mặc định. Client chỉ hiển thị countdown dựa trên deadline server trả về, không bao giờ là nguồn
  sự thật về thời gian còn lại. *(nguồn: [[ADR-CARO-GAME-002]])*

## Data Access

- **Atomic update cho counter bị ghi đồng thời**: mọi field dạng counter có thể bị ghi đồng thời
  bởi nhiều request (điểm số, số dư, bộ đếm...) phải được cập nhật bằng một câu lệnh atomic ở
  tầng DB (vd `UPDATE ... SET col = col ± X` kèm điều kiện chặn trần/sàn ngay trong câu lệnh),
  không đọc giá trị về application rồi tính toán lại rồi ghi đè (read-modify-write). Nếu cần biết
  giá trị mới sau update để trigger logic tiếp theo, lấy từ kết quả của chính câu lệnh update
  (vd `RETURNING`), không suy luận từ lần đọc trước đó. *(nguồn: [[ADR-TRUST-REPORT-002]])*
- **DB row-lock cho claim-một-lần trong hàng chờ đồng thời**: mọi hệ thống matchmaking/hàng chờ
  ghép cặp lấy một dòng dữ liệu ra để xử lý độc quyền (vd claim 1 player để ghép cặp) phải dùng
  transaction với row-level lock (vd `SELECT ... FOR UPDATE SKIP LOCKED`), không dùng
  check-then-act ở application layer. *(nguồn: [[ADR-CARO-GAME-003]])*
- **Query trực tiếp DB có index cho leaderboard top-N**: mọi bảng xếp hạng "top-N theo một điểm
  số" dùng query trực tiếp với index trên cột điểm số (vd `ORDER BY score DESC LIMIT N`) mỗi lần
  cần hiển thị — không cache/sorted-set riêng theo mặc định, chỉ thêm khi có NFR hiệu năng cụ thể
  yêu cầu. *(nguồn: [[ADR-CARO-GAME-004]])*

## Coding Convention

- **Giá trị admin-tunable lưu DB-config, không hardcode**: mọi giá trị mà Admin cần tự chỉnh sửa
  qua hệ thống mà không deploy lại code được lưu trong một DB table riêng cho loại config đó (có
  cờ active/inactive nếu cần ẩn không xoá). Application đọc trực tiếp từ DB tại thời điểm dùng,
  không cache theo mặc định — chỉ thêm cache khi có NFR hiệu năng cụ thể yêu cầu.
  *(nguồn: [[ADR-TRUST-REPORT-001]])*
- **Atomic Design cho component ở webapp/mobile**: toàn bộ UI component ở webapp và mobile tổ
  chức theo Atomic Design (atoms → molecules → organisms → templates → pages/screens). Component
  ở tầng thấp hơn không phụ thuộc vào component ở tầng cao hơn; phải ưu tiên tái sử dụng component
  có sẵn ở tầng thấp hơn trước khi tạo component mới. *(nguồn: team dev default convention)*

## Testing

<!-- Chưa có nguyên tắc nào ở mục này. -->

## Infra

- **WebSocket/SSE là transport mặc định cho mọi tính năng realtime**: khi một tính năng cần cập
  nhật sống cho client (badge thông báo, trạng thái sống của game, v.v...), dùng WebSocket (hoặc
  SSE nếu chỉ cần một chiều server→client) làm transport mặc định, tái sử dụng cùng hạ tầng kết
  nối — không tự chọn polling/transport khác trừ khi có lý do kỹ thuật cụ thể khác biệt. Khi scale
  ngang nhiều instance, cần một backplane pub-sub (vd Redis pub/sub) để đồng bộ giữa các instance.
  *(nguồn: [[ADR-NOTIFICATION-001]])*

## Nhật ký amend

| Ngày | ADR nguồn | Thay đổi |
|---|---|---|
| 2026-06-27 | [[ADR-ACCOUNT-SOCIAL-001]] | Thêm nguyên tắc Architecture (modular monolith) và Authentication (JWT). |
| 2026-06-27 | [[ADR-TRUST-REPORT-001]] | Thêm nguyên tắc Coding Convention (admin-tunable config lưu DB, không hardcode). |
| 2026-06-27 | [[ADR-TRUST-REPORT-002]] | Thêm nguyên tắc Data Access (atomic update cho counter bị ghi đồng thời). |
| 2026-06-27 | [[ADR-NOTIFICATION-001]] | Thêm nguyên tắc Architecture (event-driven nhiều-nguồn-tới-một) và Infra (WebSocket/SSE mặc định cho realtime). |
| 2026-06-27 | [[ADR-CARO-GAME-002]] | Thêm nguyên tắc Authentication & Security (server-authoritative timer). |
| 2026-06-27 | [[ADR-CARO-GAME-003]] | Thêm nguyên tắc Data Access (DB row-lock cho claim-một-lần trong hàng chờ đồng thời). |
| 2026-06-27 | [[ADR-CARO-GAME-004]] | Thêm nguyên tắc Data Access (query trực tiếp DB có index cho leaderboard top-N). |
| 2026-06-27 | team dev default convention | Thêm nguyên tắc Architecture (Hexagonal ports-adapters cho api) và Coding Convention (Atomic Design cho component webapp/mobile). |
