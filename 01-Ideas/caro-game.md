---
id: IDEA-002
title: Game Caro (Gomoku) — đấu 1v1, tournament, leaderboard
status: clarified
source: "[[00-Inbox/idea.md]]"
created: 2026-06-26
tags: [idea]
---

# Game Caro (Gomoku) — đấu 1v1, tournament, leaderboard

## Tóm tắt / Business Goal

Triển khai game Caro — game đầu tiên trên platform — gồm: đấu 1v1 theo elo, tổ chức tournament
dạng Swiss liên tục (kiểu Lichess Arena), leaderboard top 10, và profile riêng theo từng player
trong game này. Phụ thuộc toàn bộ tính năng nền tảng từ [[game-platform|IDEA-001]] (account,
kết bạn, report, notification).

## Đối tượng sử dụng (Actors & Stakeholders)

- **Player**: tạo/tham gia ván cờ, tham gia tournament (nếu đủ điều kiện elo), xem leaderboard
  và profile.
- **Tournament Creator**: tập con player được Game Admin cấp quyền tạo tournament (tiêu chí
  cấp quyền cụ thể — xem Câu hỏi mở).
- **Game Admin (Caro)**: tạo config cho ván cờ (kích thước bàn, thời lượng), cấp quyền
  Tournament Creator cho user.
- **Viewer**: player đã đăng nhập (không phải 2 người đang chơi) xem ván cờ/tournament công
  khai, có thể chat trừ khi bị mute, không xem được ván private.
- **Guest** (chưa đăng nhập): xem được lobby (danh sách ván tìm đối thủ/đang diễn ra),
  tournament, và ván đang diễn ra — nhưng **không chat được, không tham gia/join được** dưới
  bất kỳ hình thức nào (không phải player, không phải viewer tương tác).

## User Stories chính

- Là player, tôi muốn tạo một ván cờ với config tôi chọn (kích thước bàn, thời gian cho mỗi
  nước đi, công khai hoặc riêng tư) để tìm đối thủ.
- Là player vừa tạo ván, tôi muốn mời một bạn bè cụ thể làm đối thủ cho ván đó.
- Là player, tôi muốn thấy danh sách ván cờ công khai đang tìm đối thủ hoặc đang diễn ra để
  tham gia hoặc xem.
- Là player tạo ván, sau khi đủ 2 người chơi tôi muốn có 15 giây để bấm Start; nếu không bấm
  kịp thì ván tự kết thúc.
- Là player trong ván, tôi muốn thấy elo, tỉ lệ thắng, và thời gian còn lại của nước đi hiện
  tại của tôi và của đối thủ.
- Là player trong ván, tôi muốn gửi yêu cầu xin hoà, và đối thủ có quyền từ chối yêu cầu đó.
- Là player trong ván, tôi muốn đầu hàng khi cần.
- Là player, sau khi ván kết thúc tôi muốn xem lại lịch sử các nước đi.
- Là player đủ điều kiện (Tournament Creator), tôi muốn tạo tournament với thời gian bắt
  đầu/kết thúc, loại config ván cờ, và ràng buộc elo tham gia.
- Là player tham gia tournament, tôi muốn được ghép cặp tự động theo điểm tournament hiện tại,
  thấy danh sách người tham gia cập nhật realtime, và chat trong room chung của tournament.
- Là player, tôi muốn xem profile Caro của tôi/người khác: tỉ lệ thắng/thua/hoà, số ván đã
  chơi, danh sách ván đã chơi.
- Là viewer, tôi muốn xem ván cờ công khai đang diễn ra và chat với người chơi/viewer khác,
  trừ khi tôi bị chính người chơi mute.
- Là guest, tôi muốn xem lobby, tournament và ván đang diễn ra mà không cần đăng nhập, dù
  không chat hay tham gia được.

## Phạm vi (In scope)

### Ván cờ
- Kích thước bàn cờ: **18x18, 25x25, hoặc 40x40** — Game Admin tạo config gồm kích thước bàn,
  thời gian cho mỗi nước đi, các tham số khác để user chọn lúc tạo ván.
- **Không giới hạn thời gian cho cả ván** — thay vào đó giới hạn thời gian cho **từng nước
  đi**, chọn một trong các mức: **5s, 10s, 15s, 25s, 35s, 45s, 60s**. Mức thời gian được chọn
  lúc tạo ván và áp dụng đồng nhất cho cả hai người chơi suốt ván (không đổi giữa ván, không
  lệch nhau giữa 2 bên).
- Luật thắng: **5 quân liên tiếp** (ngang/dọc/chéo), không áp dụng luật chặn 2 đầu (free-style
  gomoku).
- Player tạo ván **công khai** (hiện trong lobby cho người khác tìm đối thủ/xem) hoặc **riêng
  tư** (ẩn hoàn toàn khỏi lobby, **không một ai xem được**, kể cả qua lời mời).
- Player tạo ván có thể bấm nút mời để mời một bạn bè cụ thể vào làm **đối thủ** cho ván đó.
- Player xem được ván công khai đang ở trạng thái "đang tìm đối thủ" hoặc "đang diễn ra".
- Sau khi đủ 2 player, người tạo ván có **15 giây** để bấm Start; không bấm kịp thì ván coi
  như kết thúc (không tính thắng/thua/elo).
- Khi Start: xác định quân X/O ngẫu nhiên cho 2 player (X đi trước), bắt đầu đếm thời gian cho
  nước đi đầu tiên theo mức đã cấu hình.
- Mỗi khi một bên vừa đi xong một nước, đồng hồ nước đi được **reset về đúng mức thời gian đã
  cấu hình** cho lượt của bên kia (không cộng dồn/không kế thừa thời gian dư từ nước trước).
- Trong ván: player thấy thông tin cơ bản (tên, elo, tỉ lệ thắng, thời gian còn lại của nước đi
  hiện tại) của bản thân và đối thủ; thấy username của các viewer đang xem (nếu có).
- Player và viewer đã đăng nhập đều có quyền chat trong ván; **player có quyền mute từng
  viewer cụ thể** (không phải tắt chat toàn bộ).
- Player có quyền report đối thủ/viewer nếu phát hiện gian lận hoặc bị làm phiền (dùng chung
  cơ chế report của platform — admin review thủ công).
- Sau khi bắt đầu, player có thể gửi yêu cầu xin hoà; đối thủ có quyền từ chối. Player có
  quyền đầu hàng bất kỳ lúc nào.
- **Mất kết nối (disconnect) giữa ván**: đồng hồ nước đi vẫn chạy bình thường, không có grace
  period riêng; hết thời gian của nước đi đó mà chưa kết nối lại thì xử thua ngay (giống hết
  giờ nước đi thông thường).
- Ván kết thúc khi: có người đủ 5 quân liên tiếp thắng, hết bàn cờ không còn ai có thể thắng
  (hoà), hoặc một bên đầu hàng/hết giờ một nước đi.
- Sau khi ván kết thúc, player xem lại được lịch sử các nước đi.

### Tournament
- Chỉ **Tournament Creator** (player được Game Admin cấp quyền) mới tạo được tournament.
- Thông tin bắt buộc: thời gian bắt đầu, thời gian kết thúc, loại config ván cờ (kích thước
  bàn/thời lượng), ràng buộc elo để tham gia.
- Điều kiện bắt đầu: đến giờ bắt đầu **và** số người tham gia đã đăng ký **>= 5**; nếu đến giờ
  mà chưa đủ 5 người, tournament **tự động bị huỷ** và thông báo cho người đã đăng ký.
- Ghép cặp theo mô hình **Swiss liên tục kiểu Lichess Arena**: hệ thống tự động ghép ngẫu
  nhiên trong nhóm điểm tournament gần nhau, player rảnh được ghép ngay khi xong trận trước,
  không cố định số vòng, diễn ra liên tục trong suốt thời gian giải.
- Tính điểm tournament (độc lập hoàn toàn với elo): thắng = 2 điểm, hoà = 1 điểm, thua = 0
  điểm; thắng liên tiếp từ 3 trận trở lên thì mỗi trận thắng tiếp theo trong mạch thắng đó
  tính 4 điểm; hoà ngay sau một mạch thắng liên tiếp (>=3 trận) tính 2 điểm, sau đó các trận
  hoà kế tiếp về lại 1 điểm (tham khảo công thức Arena của lichess.com).
- Danh sách người tham gia tournament cập nhật **realtime**.
- Tournament có một room chat chung cho toàn bộ người tham gia.

### Leaderboard & Profile
- Top 10 người chơi điểm elo cao nhất.
- Elo tính theo công thức elo cờ vua chuẩn (tham khảo lichess.com).
- Profile Caro của mỗi player: tỉ lệ thắng/thua/hoà, tổng số ván đã chơi, danh sách ván đã
  chơi.

### Quyền truy cập chưa đăng nhập (Guest)
- Guest xem được: lobby (ván tìm đối thủ/đang diễn ra), danh sách tournament, nội dung ván
  đang diễn ra.
- Guest **không** chat được và **không** tham gia được dưới bất kỳ vai trò nào (không phải
  player, không phải viewer có tương tác) — chỉ xem thuần.

## Ngoài phạm vi (Out of scope)

- Kích thước bàn cờ hoặc luật thắng khác ngoài 3 size đã chọn (18x18/25x25/40x40) và luật 5
  quân liên tiếp.
- Giới hạn thời gian cho **tổng cả ván** (đã bỏ khái niệm này) — chỉ còn giới hạn theo từng
  nước đi; các mức thời gian nước đi khác ngoài 5/10/15/25/35/45/60s cũng không thuộc phạm vi.
- Cơ chế mất lượt/skip khi hết giờ nước đi — hết giờ một nước đi luôn xử thua cả ván.
- Giới hạn số lượng viewer/spectator cho một ván hoặc tournament (giả định không giới hạn ở
  giai đoạn này).
- Cơ chế tự động hoá xử lý report (dùng chung cơ chế admin review thủ công của platform).
- Định nghĩa chi tiết cách cấp vai trò Game Admin / Tournament Creator (xem Câu hỏi mở).
- Các hình thức giải đấu khác ngoài Swiss liên tục (vd round-robin, knockout/loại trực tiếp).

## Business Rules

- Luật thắng: 5 quân liên tiếp (ngang/dọc/chéo), không chặn 2 đầu.
- Ván riêng tư (private) ẩn hoàn toàn khỏi lobby, không cho phép viewer dưới bất kỳ hình thức
  nào, kể cả qua lời mời.
- Sau khi đủ 2 player, người tạo ván có đúng 15 giây để Start, không bấm kịp = ván huỷ, không
  tính kết quả.
- Ván cờ không có giới hạn thời gian tổng; chỉ giới hạn thời gian cho **từng nước đi**, chọn
  một trong các mức: 5s, 10s, 15s, 25s, 35s, 45s, 60s — áp dụng đồng nhất cho cả hai bên suốt
  ván.
- Hết thời gian của một nước đi mà người chơi chưa đi → **xử thua cả ván ngay lập tức** (không
  phải mất lượt/skip nước).
- Đồng hồ nước đi reset về đúng mức thời gian đã cấu hình sau mỗi nước đi, không cộng dồn thời
  gian dư.
- Disconnect giữa ván không dừng đồng hồ nước đi; hết giờ nước đi đó mà chưa quay lại thì xử
  thua ngay như hết giờ nước đi thông thường.
- Mute viewer áp dụng theo từng cá nhân, không phải tắt chat toàn bộ ván.
- Tournament chỉ bắt đầu khi đến giờ và đủ >=5 người đăng ký; thiếu người thì tự huỷ.
- Điểm tournament: thắng 2 / hoà 1 / thua 0; mạch thắng liên tiếp >=3 trận thì các trận thắng
  tiếp theo trong mạch đó tính 4 điểm; hoà ngay sau mạch thắng đó tính 2 điểm rồi về 1.
- Điểm tournament và elo là hai hệ thống điểm hoàn toàn độc lập.

## Acceptance Criteria

- **Given** một ván cờ đã đủ 2 player, **When** người tạo không bấm Start trong 15 giây,
  **Then** ván tự kết thúc và không có ai bị tính thắng/thua/đổi elo.
- **Given** một tournament đã đến giờ bắt đầu, **When** số người đăng ký nhỏ hơn 5, **Then**
  tournament tự động chuyển trạng thái huỷ và toàn bộ người đăng ký nhận thông báo huỷ.
- **Given** một player đang xem ván cờ công khai, **When** một trong hai người chơi mute
  player đó, **Then** player đó không gửi được chat trong ván nhưng vẫn xem được diễn biến.
- **Given** một ván cờ được tạo ở chế độ riêng tư, **When** bất kỳ user khác cố mở ván đó từ
  lobby hoặc link, **Then** hệ thống không cho xem (kể cả khi được mời, vì ván riêng tư không
  hỗ trợ mời viewer).
- **Given** một ván cờ với mức thời gian nước đi là 15s, **When** người chơi không đi nước nào
  trong vòng 15s kể từ lượt của mình, **Then** người đó xử thua cả ván ngay lập tức, ván kết
  thúc, không có cơ chế mất lượt/skip.

## Yêu cầu phi chức năng (NFR)

- Danh sách ván đang mở/đang diễn ra trong lobby và danh sách người tham gia tournament phải
  cập nhật realtime cho mọi người đang xem.
- Cơ chế ghép cặp Swiss phải xử lý đúng khi nhiều player cùng "rảnh" và sẵn sàng ghép cặp đồng
  thời (concurrency trong matchmaking) — điểm này cần được xem xét kỹ ở bước thiết kế kiến
  trúc (ADR).
- Đồng hồ nước đi (5-60s) cần được tính theo thời gian server (server-authoritative), không
  dựa vào đồng hồ client, để tránh gian lận hoặc lệch giờ khi xử thua do hết giờ nước đi —
  điểm này cần xem xét kỹ ở bước ADR.

## Giả định (Assumptions)

- Vai trò Game Admin (Caro) tồn tại và được gán bởi cơ chế ngoài phạm vi idea này (có thể là
  Platform Admin gán thủ công).
- Không giới hạn số lượng config (kích thước bàn x thời lượng) mà Game Admin có thể tạo.

## Phụ thuộc (Dependencies)

Phụ thuộc toàn bộ [[game-platform|IDEA-001 Game Platform nền tảng]]: account (Google OAuth),
danh sách bạn bè (để mời làm đối thủ), report (dùng chung cơ chế admin review), notification
in-app (mời chơi/kết bạn, sự kiện tournament, cảnh báo admin).

## Câu hỏi mở

- Tiêu chí cụ thể để một player được cấp vai trò Tournament Creator là gì (Game Admin tự
  chọn tuỳ ý, hay theo điều kiện elo/số ván đã chơi...)?
- Có cần giới hạn số lượng viewer/spectator tối đa cho một ván hoặc tournament không?
- Game Admin được cấp quyền bởi ai và theo cơ chế nào (ngoài phạm vi platform hiện tại)?
