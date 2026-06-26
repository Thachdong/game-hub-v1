---
id: BRD-CARO-GAME-003
title: Tournament
feature: caro-game
status: draft
source_idea: "[[IDEA-002]]"
created: 2026-06-26
tags: [brd, caro-game]
---

# Tournament

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cho phép tổ chức giải đấu Caro dạng Swiss liên tục (kiểu Lichess Arena), tạo động lực cạnh
tranh ngắn hạn độc lập với elo, và tăng tương tác cộng đồng qua phòng chat chung của giải.

## 2. Phạm vi

### In scope

- Player request quyền Tournament Creator; Game Admin duyệt (approve/reject) hoặc khoá quyền
  (revoke) đã cấp.
- Tournament Creator tạo tournament với: thời gian bắt đầu, thời gian kết thúc, loại cấu hình
  ván cờ áp dụng, ràng buộc elo tối thiểu để tham gia (Tournament Creator tự chọn mức, vd "elo
  >= 1700").
- Tournament luôn hiển thị công khai (kể cả với player không đủ elo); player không đủ elo không
  tham gia được nhưng vẫn xem được thông tin giải.
- Player đủ điều kiện elo đăng ký tham gia tournament trước/trong thời gian diễn ra.
- Điều kiện bắt đầu: đến giờ bắt đầu và có >= 5 người đã đăng ký; nếu không đủ, tournament tự
  huỷ và thông báo cho người đã đăng ký.
- Ghép cặp tự động kiểu Swiss liên tục (Arena): ghép ngẫu nhiên trong nhóm điểm tournament gần
  nhau, player rảnh được ghép ngay khi xong trận trước, không cố định số vòng, diễn ra liên tục
  trong suốt thời gian giải.
- Tính điểm tournament theo công thức Arena (độc lập hoàn toàn với elo); mọi trận trong
  tournament vẫn tính elo như ván thường ([[BRD-CARO-GAME-004]]).
- Danh sách người tham gia cập nhật realtime.
- Phòng chat chung cho toàn bộ người tham gia tournament.

### Out of scope

- Các hình thức giải đấu khác ngoài Swiss liên tục (round-robin, knockout).
- Ràng buộc elo tối đa (chỉ hỗ trợ giới hạn dưới — "elo lớn hơn X").
- Giới hạn số lượng người xem tournament (không giới hạn ở giai đoạn này).

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Tournament Creator**: player đã được Game Admin duyệt quyền, tạo tournament.
- **Player**: request quyền Tournament Creator, đăng ký tham gia tournament (nếu đủ điều kiện
  elo), thi đấu, chat trong phòng chung.
- **Game Admin (Caro)**: duyệt/từ chối request quyền Tournament Creator, có thể khoá (revoke)
  quyền đã cấp.

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép player gửi request xin cấp quyền Tournament Creator.
- **FR-2**: Hệ thống cho phép Game Admin xem danh sách request đang chờ và approve hoặc reject
  từng request.
- **FR-3**: Hệ thống cho phép Game Admin khoá (revoke) quyền Tournament Creator đã cấp cho một
  player bất kỳ lúc nào.
- **FR-4**: Tournament đã được tạo trước khi Tournament Creator của nó bị revoke quyền vẫn tiếp
  tục hoạt động bình thường (đăng ký, ghép cặp, tính điểm, kết thúc) không bị ảnh hưởng.
- **FR-5**: Hệ thống cho phép Tournament Creator tạo một tournament mới với thời gian bắt đầu,
  thời gian kết thúc, cấu hình ván cờ áp dụng, và ràng buộc elo tối thiểu để tham gia (do
  Tournament Creator tự chọn mức cụ thể).
- **FR-6**: Hệ thống chỉ cho phép user đang có vai trò Tournament Creator (chưa bị revoke) tạo
  tournament mới; user khác không thấy/không dùng được chức năng này.
- **FR-7**: Hệ thống hiển thị mọi tournament công khai cho toàn bộ player/guest xem, bất kể elo
  hiện tại của người xem có đáp ứng ràng buộc elo của tournament đó hay không.
- **FR-8**: Hệ thống cho phép player đăng ký tham gia một tournament chỉ khi elo hiện tại của
  player đáp ứng ràng buộc elo tối thiểu của tournament đó; nếu không đáp ứng, hệ thống từ chối
  đăng ký nhưng player vẫn xem được thông tin/diễn biến giải.
- **FR-9**: Khi đến giờ bắt đầu đã định, nếu số người đã đăng ký >= 5, hệ thống chuyển tournament
  sang trạng thái "đang diễn ra" và bắt đầu ghép cặp.
- **FR-10**: Khi đến giờ bắt đầu đã định, nếu số người đã đăng ký < 5, hệ thống tự động huỷ
  tournament và gửi thông báo huỷ cho toàn bộ người đã đăng ký.
- **FR-11**: Trong suốt thời gian diễn ra, hệ thống tự động ghép cặp player đang rảnh (vừa đăng
  ký hoặc vừa xong trận trước) với một player khác đang rảnh có điểm tournament gần nhau, ghép
  ngay khi có thể, không chờ theo vòng cố định.
- **FR-12**: Hệ thống tính điểm tournament cho mỗi trận đã đấu trong tournament theo công thức ở
  mục 5, độc lập hoàn toàn với điểm elo của player; mỗi trận trong tournament vẫn được tính lại
  elo bình thường như mọi ván khác ([[BRD-CARO-GAME-004]]).
- **FR-13**: Hệ thống hiển thị danh sách người tham gia tournament và điểm tournament hiện tại
  của họ, cập nhật realtime.
- **FR-14**: Hệ thống cung cấp một phòng chat chung cho toàn bộ người đã đăng ký tham gia
  tournament.
- **FR-15**: Khi đến thời gian kết thúc đã định, hệ thống dừng ghép cặp mới và chuyển tournament
  sang trạng thái "đã kết thúc".

## 5. Business Rules

- Quyền Tournament Creator chỉ có được qua: player request → Game Admin approve; Game Admin có
  thể revoke quyền này bất kỳ lúc nào.
- Revoke quyền Tournament Creator không ảnh hưởng tới các tournament mà player đó đã tạo trước
  đó — các tournament này tiếp tục vận hành theo đúng lifecycle bình thường.
- Ràng buộc elo của tournament chỉ là giới hạn dưới (vd "elo >= 1700"), do Tournament Creator tự
  chọn mức khi tạo giải; không hỗ trợ giới hạn trên.
- Tournament luôn hiển thị công khai; ràng buộc elo chỉ chặn hành động đăng ký tham gia, không
  chặn việc xem.
- Tournament chỉ bắt đầu khi đến giờ và đủ >= 5 người đăng ký; thiếu người thì tự huỷ, không
  tính bất kỳ kết quả nào.
- Ghép cặp theo mô hình Swiss liên tục kiểu Lichess Arena: ngẫu nhiên trong nhóm điểm tournament
  gần nhau, không cố định số vòng, diễn ra liên tục.
- Tính điểm tournament: thắng = 2 điểm, hoà = 1 điểm, thua = 0 điểm.
- Mạch thắng liên tiếp từ 3 trận trở lên: mỗi trận thắng tiếp theo trong mạch đó tính 4 điểm
  (thay vì 2).
- Hoà ngay sau một mạch thắng liên tiếp (>= 3 trận): trận hoà đó tính 2 điểm; các trận hoà kế
  tiếp sau đó (không còn nằm trong mạch thắng) trở lại tính 1 điểm.
- Điểm tournament và elo là hai hệ thống điểm hoàn toàn độc lập về cách tính, nhưng mọi trận
  trong tournament vẫn tính elo song song với điểm tournament — không có trận nào trong
  tournament bị loại trừ khỏi việc tính elo.
- Ràng buộc elo chỉ được kiểm tra đúng một lần, tại thời điểm player đăng ký tham gia tournament;
  hệ thống không kiểm tra lại elo của player trong suốt thời gian tournament diễn ra.
- Việc ghép cặp trong tournament (Swiss/Arena) chỉ dựa vào điểm tournament hiện tại của player;
  elo không phải là yếu tố đầu vào của thuật toán ghép cặp.

## 6. Acceptance Criteria

- **AC-1** (FR-1, FR-2): Given một player gửi request xin quyền Tournament Creator, When Game
  Admin approve request đó, Then player có thể tạo tournament; When Game Admin reject, Then
  player vẫn không tạo được tournament.
- **AC-2** (FR-3, FR-4): Given một Tournament Creator đã tạo tournament T và đang điều hành,
  When Game Admin revoke quyền Tournament Creator của player đó, Then tournament T vẫn tiếp tục
  diễn ra bình thường (đăng ký, ghép cặp, tính điểm không bị dừng).
- **AC-3** (FR-8): Given tournament yêu cầu elo tối thiểu 1700, When một player có elo 1600 mở
  trang tournament đó, Then player xem được đầy đủ thông tin giải nhưng nút đăng ký bị từ chối
  nếu bấm.
- **AC-4** (FR-10): Given một tournament đã đến giờ bắt đầu, When số người đăng ký nhỏ hơn 5,
  Then tournament tự động chuyển trạng thái huỷ và toàn bộ người đăng ký nhận thông báo huỷ.
- **AC-5** (FR-9, FR-11): Given một tournament đã đến giờ bắt đầu với 8 người đăng ký, When
  tournament chuyển sang "đang diễn ra", Then hệ thống ghép cặp ngay các player đang rảnh có
  điểm tournament gần nhau (ban đầu đều bằng 0 nên ghép ngẫu nhiên).
- **AC-6** (FR-12): Given một player đang có mạch thắng liên tiếp 3 trận (đã nhận 2+4+4 = 10
  điểm tournament), When player đó thắng tiếp trận thứ 4 trong mạch, Then trận đó được tính 4
  điểm tournament (tổng 14 điểm) và elo của cả hai player cũng được tính lại như một ván thường.
- **AC-7** (FR-12): Given một player vừa thắng liên tiếp 3 trận, When player đó hoà ở trận tiếp
  theo, Then trận hoà đó được tính 2 điểm tournament; When player đó hoà thêm một trận nữa ngay
  sau đó (đã ra khỏi mạch thắng), Then trận hoà thứ hai này chỉ tính 1 điểm tournament.
- **AC-8** (FR-8, FR-11): Given player C đăng ký thành công vào tournament yêu cầu elo >= 1700
  khi elo của C là 1750, When elo của C giảm xuống 1650 do thua một ván khác trong lúc
  tournament đang diễn ra, Then C vẫn tiếp tục được ghép cặp trong tournament bình thường (hệ
  thống không kiểm tra lại elo, không loại C khỏi giải).

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- Danh sách người tham gia tournament phải cập nhật realtime cho mọi người đang xem.
- Cơ chế ghép cặp Swiss phải xử lý đúng khi nhiều player cùng "rảnh" và sẵn sàng ghép cặp đồng
  thời (concurrency trong matchmaking) — điểm này cần được xem xét kỹ ở bước ADR.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Giả định mỗi trận trong tournament là một ván cờ theo đúng luật/cơ chế ở [[BRD-CARO-GAME-002]]
  (thắng/thua/hoà, timer nước đi theo cấu hình tournament đã chọn), chỉ tính thêm điểm tournament
  song song với elo.
- Giả định điểm tournament reset về 0 cho mỗi tournament mới, không kế thừa từ tournament trước.
- Giả định request quyền Tournament Creator không giới hạn số lần gửi lại sau khi bị reject.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-CARO-GAME-001]] cho cấu hình ván cờ áp dụng trong tournament.
- Phụ thuộc [[BRD-CARO-GAME-002]] cho cơ chế chơi từng trận trong tournament.
- Phụ thuộc [[BRD-CARO-GAME-004]] để biết elo hiện tại của player khi kiểm tra ràng buộc đăng
  ký, và để tính lại elo sau mỗi trận trong tournament.
- [[BRD-NOTIFICATION-001]] phụ thuộc domain này để gửi thông báo "sự kiện tournament" (huỷ giải,
  bắt đầu, ghép cặp...).
- Phụ thuộc [[BRD-ACCOUNT-SOCIAL-001]] (FR-8, FR-9, FR-10) để xác định một account có đang giữ
  vai trò Game Admin của Caro hay không (cần để duyệt/revoke request Tournament Creator).

## 10. Câu hỏi mở / Rủi ro

- Idea gốc không nêu rõ một player đã đăng ký nhưng chưa kịp ghép cặp khi tournament kết thúc
  (do hết giờ) thì điểm tournament của họ được xử lý thế nào — giả định họ giữ điểm đã có, không
  bị trừ.
- Idea gốc không nêu loại thông báo "sự kiện tournament" cụ thể nào sẽ kích hoạt notification
  (chỉ huỷ giải, hay cả bắt đầu/ghép cặp/kết thúc) — cần làm rõ khi thiết kế chi tiết.
- Chưa rõ Game Admin xem danh sách request quyền Tournament Creator ở đâu (trang riêng, hay
  chung với trang quản lý report của platform) — chi tiết UI, không chặn tiến độ BRD.
