---
id: ADR-ACCOUNT-SOCIAL-001
title: Modular monolith với module boundary rõ + JWT cho xác thực API
status: accepted
source_brd: ["[[BRD-ACCOUNT-SOCIAL-001]]"]
created: 2026-06-26
tags: [adr, account-social]
---

# Modular monolith với module boundary rõ + JWT cho xác thực API

## Status
Accepted (2026-06-26)

## Quyết định 1 — Service/module boundary: modular monolith, boundary rõ trong code

### Context
BRD yêu cầu API business logic độc lập client (API-first, dùng chung web + mobile sau này).
Nhiều domain khác và mọi game tương lai đều cần đọc dữ liệu account/role do domain này quản lý —
cần chốt ranh giới module/service trước khi các domain phụ thuộc bắt đầu implement.

### Decision Drivers
- Tốc độ phát triển giai đoạn đầu (ít domain, team nhỏ).
- Khả năng mở rộng thêm domain/game mới sau này mà không phải redesign từ đầu.
- Chưa có nhu cầu scale độc lập từng domain ở giai đoạn này.

### Các phương án đã xét (Options Considered)
- **Modular monolith, không tách module rõ trong code**: đơn giản nhất nhưng dễ phụ thuộc chéo
  lộn xộn, khó tách service sau.
- **Microservices theo domain**: scale độc lập tốt nhưng phức tạp vận hành ngay từ đầu khi chưa
  cần scale.
- **Modular monolith, boundary rõ trong code, DB chung nhưng schema theo domain**: cân bằng đơn
  giản vận hành và khả năng tách service sau.

### Quyết định (Decision)
Dùng modular monolith: 1 app, 1 database. Mỗi domain (account-social, trust-report,
notification, mỗi game) là một module riêng trong codebase, chỉ giao tiếp qua interface/service
được export rõ ràng — không import trực tiếp phần nội bộ của module khác. Mỗi module có schema/
namespace riêng trong DB chung (schema riêng nếu Postgres, hoặc tối thiểu prefix bảng theo
domain) để giữ khả năng tách thành service riêng sau này.

### Hệ quả (Consequences)
- Deploy đơn giản (1 app, 1 DB), vẫn dễ join cross-domain khi cần.
- Cần enforce boundary qua code review/lint rule (cấm import path nội bộ của module khác), nếu
  không sẽ mất khả năng tách service sau.
- Chưa scale độc lập từng domain/game ngay từ đầu — trade-off đã chấp nhận cho giai đoạn hiện tại.

## Quyết định 2 — Authentication: JWT (access + refresh token)

### Context
BRD yêu cầu API-first cho web và mobile app sau này, đồng thời việc thu hồi vai trò Game Admin
chỉ cần có hiệu lực ở lần đăng nhập sau (không yêu cầu revoke real-time).

### Decision Drivers
- Hỗ trợ tốt mobile app (không phụ thuộc cookie).
- Ưu tiên stateless, tránh phải duy trì session store nếu không cần.
- Khớp với yêu cầu: cập nhật role theo "lần đăng nhập sau đó" là đủ.

### Các phương án đã xét (Options Considered)
- **JWT (access + refresh token)**: stateless, phù hợp mobile; role bake vào token lúc đăng
  nhập/refresh.
- **Server-side session (cookie + Redis/DB)**: revoke ngay lập tức nhưng lệch với yêu cầu
  API-first cho mobile (cookie không tự nhiên cho mobile).
- **JWT ngắn hạn + check role mỗi lần refresh**: cân bằng hơn nhưng phức tạp hơn mức cần thiết.

### Quyết định (Decision)
Dùng JWT access token (thời hạn ngắn, vd 15–30 phút) + refresh token (thời hạn dài, vd 7–30
ngày). Toàn bộ role/quyền của user được bake vào access token tại thời điểm đăng nhập hoặc
refresh token, verify bằng signature, không cần query DB mỗi request thông thường.

### Hệ quả (Consequences)
- Stateless, dễ scale ngang, phù hợp cả web và mobile.
- Nếu sau này có yêu cầu revoke ngay lập tức (vd khoá tài khoản gấp), cần bổ sung access-token
  blacklist hoặc giảm TTL — đánh giá lại khi có ADR domain liên quan tới khoá account.
- Refresh token cần rotate và lưu trữ an toàn (chi tiết kỹ thuật làm rõ ở Speckit `/plan`).

## Loại khỏi phạm vi

- **Cơ chế "game registry"** (cách platform biết "toàn bộ game đang cung cấp" để hiển thị ở
  trang Account): tìm thấy khi đọc BRD nhưng bị loại khỏi ADR — quyết định này chỉ tồn tại vì
  BRD yêu cầu cụ thể "hiển thị danh sách game" (business content/feature, không phải technology
  layer); nếu feature đó không tồn tại thì quyết định cũng không cần thiết. Đây là domain
  modeling cho 1 feature cụ thể, nên để `/speckit.plan` xử lý khi implement feature "Trang
  Account", không ghi ADR.

## Liên quan (Related)
Không có ADR khác phụ thuộc/supersede tại thời điểm này.
