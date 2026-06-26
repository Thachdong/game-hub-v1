---
id: IDEA-001
title: Game Platform nền tảng đa game
status: clarified
source: "[[00-Inbox/idea.md]]"
created: 2026-06-26
tags: [idea]
---

# Game Platform nền tảng đa game

## Tóm tắt / Business Goal

Xây dựng một nền tảng (platform) cho phép user dùng **một account duy nhất** để chơi nhiều
game khác nhau trên cùng hệ thống. Mỗi game tự quản lý data riêng của nó, nhưng tất cả game
dùng chung các tính năng nền tảng: tài khoản, kết bạn, report, thông báo, trang account. Đây
là lớp nền cho mọi game sau này (Caro là game đầu tiên, "Truy tìm kho báu" dự kiến sau).

## Đối tượng sử dụng (Actors & Stakeholders)

- **Player** (đã đăng nhập): có account, có thể kết bạn, nhận thông báo, report user khác, vào
  chơi các game trên platform.
- **Guest** (chưa đăng nhập): chỉ được xem; quyền xem cụ thể **do từng game tự định nghĩa
  riêng** (platform không áp một bộ quyền guest chung cho mọi game).
- **Platform Admin**: xác định qua danh sách email cấu hình trong **biến môi trường** (không
  gán role qua UI/database); review report, cấu hình loại report và điểm trừ tương ứng; không
  phải vai trò quản trị riêng của từng game.
- **Game Admin** (theo từng game, vd Caro admin): vai trò riêng của mỗi game, platform chỉ
  cung cấp khái niệm vai trò chung — việc định nghĩa quyền cụ thể thuộc idea/BRD của game đó.

## User Stories chính

- Là user mới, tôi muốn đăng nhập bằng tài khoản Google để vào platform mà không cần tạo
  password riêng.
- Là player, tôi muốn gửi lời mời kết bạn tới user khác qua email để mở rộng danh sách bạn bè.
- Là player nhận lời mời kết bạn, tôi muốn chấp nhận hoặc từ chối lời mời đó.
- Là player, tôi muốn nhận thông báo in-app khi có lời mời kết bạn/mời chơi game, khi có sự
  kiện tournament liên quan tới tôi, hoặc khi nhận cảnh báo từ admin.
- Là player, tôi muốn report user khác khi phát hiện gian lận hoặc bị làm phiền, để admin xem
  xét xử lý.
- Là Platform Admin, tôi muốn tự định nghĩa danh sách loại report và điểm trừ điểm tin cậy
  tương ứng cho mỗi loại, để linh hoạt điều chỉnh mà không cần sửa code.
- Là Platform Admin, tôi muốn review một report và xác nhận report đó hợp lệ, để hệ thống tự
  trừ điểm tin cậy của user bị report theo loại report đã xác nhận.
- Là user, tôi muốn nhận cảnh báo khi điểm tin cậy của tôi giảm xuống các mốc quan trọng, để
  biết và điều chỉnh hành vi trước khi bị khoá tham gia game.
- Là player, tôi muốn xem trang account của mình gồm thông tin cơ bản, danh sách bạn bè, và
  toàn bộ danh sách game mà platform cung cấp (game nào tôi đã có profile/đã chơi sẽ có tick
  xanh).
- Là guest, tôi muốn xem được nội dung public của platform và của từng game theo quyền mà
  game đó quy định, không cần đăng nhập.

## Phạm vi (In scope)

- Đăng nhập/đăng ký bằng **Google OAuth** — lần đầu đăng nhập tự động tạo account, không có
  bước đăng ký riêng.
- Trang Account: username, email (lấy từ Google), avatar, danh sách bạn bè, danh sách **toàn
  bộ game platform cung cấp** kèm trạng thái đã có profile ở game đó hay chưa (tick xanh).
- Kết bạn qua email: gửi lời mời tới email đã có account trên platform, người nhận
  accept/reject, chỉ chính thức là bạn khi cả hai đồng ý (mutual).
- Report user khác: lưu lại nội dung/context report, Platform Admin review thủ công để xác
  nhận report hợp lệ trước khi hệ thống tác động tới điểm tin cậy.
- **Điểm tin cậy (Trust Score)**: mỗi user khởi tạo với **100 điểm**. Khi một report nhắm vào
  user đó được Platform Admin xác nhận hợp lệ, hệ thống tự trừ điểm theo loại report đã xác
  nhận. Loại report và số điểm trừ tương ứng do Platform Admin **tự định nghĩa qua config**
  (không cố định trong code).
- Cảnh báo theo mốc điểm tin cậy: khi điểm giảm xuống dưới **50 → 20 → 10**, hệ thống gửi
  thông báo cảnh báo (loại "cảnh báo từ admin") cho user. Khi điểm về **0**, account bị khoá
  tham gia game **7 ngày** (vẫn đăng nhập và xem account được, nhưng không vào được game nào).
  Sau 7 ngày, mỗi ngày đăng nhập được cộng lại **+1 điểm** (tối thiểu 0, tối đa 100) để hồi
  phục dần.
- Thông báo in-app cho 4 loại: (1) lời mời kết bạn / mời chơi game, (2) sự kiện tournament,
  (3) cảnh báo từ admin, (4) cảnh báo mốc điểm tin cậy / khoá tham gia game do điểm tin cậy về 0.
- Định hướng kiến trúc: xây **API trước**, sau đó web app, sau đó mobile app — để cùng một
  business logic phục vụ được cả hai nền tảng client sau này.

## Ngoài phạm vi (Out of scope)

- Chat ở cấp độ platform — chat chỉ tồn tại trong context riêng của từng game (vd trong ván
  cờ/tournament của Caro), platform không có chat 1-1 hay group chat riêng.
- Đăng nhập bằng email/password — chỉ Google OAuth ở giai đoạn này.
- Gửi thông báo qua email hoặc push notification — chỉ in-app.
- Tự động trừ điểm tin cậy **ngay khi** report được gửi — luôn cần Platform Admin xác nhận
  report hợp lệ trước, hệ thống không tự trừ điểm chỉ vì có report.
- Quyền chi tiết của guest theo từng game — định nghĩa trong idea/BRD riêng của game đó.
- Quy trình cấp/quản lý vai trò "Game Admin" cụ thể — thuộc phạm vi của từng game.

## Business Rules

- Lời mời kết bạn chỉ gửi được tới email **đã có tài khoản đăng ký** trên platform; nếu không
  tìm thấy account, hệ thống báo lỗi và không cho gửi (không lưu lời mời chờ).
- Kết bạn chỉ chính thức khi **cả hai bên đồng ý** (mutual accept).
- Report được lưu lại làm bằng chứng/context; **chỉ trừ điểm tin cậy sau khi** Platform Admin
  xác nhận report hợp lệ — admin không tự tay quyết định cảnh cáo/khoá, việc cảnh báo/khoá sau
  đó diễn ra **tự động** theo mốc điểm tin cậy.
- Điểm tin cậy bắt đầu ở 100; điểm trừ mỗi loại report do Platform Admin tự cấu hình (loại
  report không cố định sẵn, admin tự thêm/sửa).
- Mốc cảnh báo: điểm tin cậy giảm xuống dưới 50, 20, hoặc 10 → gửi thông báo cảnh báo cho user.
- Điểm tin cậy về 0 → tự động khoá quyền tham gia game trong 7 ngày (account và trang account
  vẫn truy cập được bình thường).
- Sau khi hết 7 ngày khoá, mỗi ngày đăng nhập cộng lại +1 điểm tin cậy, tối đa 100, tối thiểu 0
  (không thể âm).
- Platform Admin được xác định bằng cách so khớp email đăng nhập với danh sách email cấu hình
  trong biến môi trường — không có cơ chế gán/thu hồi role qua UI ở giai đoạn này.
- Trang Account hiển thị toàn bộ danh sách game mà platform cung cấp (không chỉ game đã chơi);
  game nào user đã có profile (tức đã từng chơi) thì hiển thị tick xanh.

## Yêu cầu phi chức năng (NFR)

- Xác thực qua Google OAuth2 để tránh tự quản lý/lưu trữ password, giảm rủi ro bảo mật tài
  khoản.
- Kiến trúc tách lớp API (API-first) để business logic dùng chung được cho cả web app và
  mobile app, tránh viết lại logic khi mở rộng sang mobile.
- Danh sách loại report + điểm trừ tương ứng phải là **config có thể chỉnh sửa được** bởi
  Platform Admin (không hardcode), để thêm/sửa loại report mà không cần deploy lại code.
- Danh sách email Platform Admin đọc từ **biến môi trường** lúc khởi động hệ thống; thay đổi
  danh sách này yêu cầu cập nhật biến môi trường và khởi động lại (không có UI quản lý admin
  ở giai đoạn này).

## Giả định (Assumptions)

- Mỗi user gắn với **một** tài khoản Google duy nhất trên platform; chưa hỗ trợ liên kết
  nhiều tài khoản Google vào cùng một account platform.
- Mọi game tương lai trên platform (Caro, "Truy tìm kho báu", ...) đều tái sử dụng nguyên các
  tính năng nền tảng này (account, kết bạn, report, notification) mà không cần định nghĩa lại.

## Phụ thuộc (Dependencies)

Đây là lớp nền tảng, không phụ thuộc idea khác. [[caro-game|IDEA-002 Game Caro]] và các game
tương lai đều phụ thuộc vào platform này (account, friend list, report, notification dùng
chung).

## Câu hỏi mở

- Quy trình cấp vai trò "Game Admin" cho từng game (ai cấp, theo tiêu chí gì) chưa được định
  nghĩa ở mức platform — sẽ làm rõ khi viết idea/BRD riêng cho từng game.
