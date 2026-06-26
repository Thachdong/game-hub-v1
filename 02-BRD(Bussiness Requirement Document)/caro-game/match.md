---
id: BRD-CARO-GAME-002
title: Ván cờ (Match)
feature: caro-game
status: draft
source_idea: "[[IDEA-002]]"
created: 2026-06-26
tags: [brd, caro-game]
---

# Ván cờ (Match)

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cho phép player tạo và tham gia ván cờ Caro 1v1 với luật chơi rõ ràng, giới hạn thời gian theo
từng nước đi, hỗ trợ chat/xem/report trong ván, làm trải nghiệm chơi cốt lõi của game Caro trên
platform.

## 2. Phạm vi

### In scope

- Tạo ván cờ: chọn cấu hình (kích thước bàn, thời gian nước đi) từ danh sách Game Admin đã định
  nghĩa ([[BRD-CARO-GAME-001]]), chọn công khai hoặc riêng tư.
- Mời một bạn bè cụ thể làm đối thủ cho ván vừa tạo, gửi qua thông báo in-app (notification) kèm
  2 hành động Chấp nhận/Từ chối — đây cũng là cách duy nhất để thêm người chơi thứ hai vào một
  ván riêng tư.
- Lobby: hiển thị danh sách ván công khai đang "tìm đối thủ" hoặc "đang diễn ra" cho player và
  guest xem; player bấm Join để trở thành đối thủ của một ván đang tìm người.
- Quick Pair: player chọn một cấu hình ván cờ mong muốn (kích thước bàn + thời gian nước đi) và
  để hệ thống tự động ghép với một player khác đang chờ Quick Pair cùng cấu hình; có thể huỷ chờ
  giữa chừng.
- Huỷ ván đang chờ đối thủ (bởi người tạo) và xử lý khi player điều hướng tới một ván qua
  notification đã không còn hợp lệ.
- Cửa sổ 15 giây để người tạo ván bấm Start sau khi đủ 2 player; không bấm kịp thì ván huỷ,
  không tính kết quả.
- Gameplay: xác định quân X/O ngẫu nhiên, đếm thời gian theo từng nước đi, reset đồng hồ sau mỗi
  nước, xác định thắng/thua/hoà, xử thua khi hết giờ nước đi hoặc disconnect không kết nối lại
  kịp.
- Xin hoà (một bên gửi yêu cầu, đối thủ accept/reject) và đầu hàng.
- Chat trong ván giữa player và viewer đã đăng nhập; player có quyền mute từng viewer.
- Report đối thủ/viewer trong ván (dùng chung cơ chế report của platform).
- Xem lại lịch sử nước đi sau khi ván kết thúc.
- Quyền xem của Guest đối với lobby và ván đang diễn ra (chỉ xem, không chat, không tham gia).

### Out of scope

- Kích thước bàn hoặc luật thắng khác ngoài phạm vi đã định nghĩa (xem [[IDEA-002]]).
- Giới hạn thời gian cho tổng cả ván.
- Cơ chế mất lượt/skip khi hết giờ nước đi.
- Giới hạn số lượng viewer cho một ván.
- Tự động xử lý report (luôn qua admin review thủ công — xem BRD report của platform).
- Tournament — thuộc [[BRD-CARO-GAME-003]].

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: tạo ván, chơi ván, chat, mute viewer, report, xin hoà, đầu hàng.
- **Viewer**: player đã đăng nhập không tham gia ván, xem và chat (trừ khi bị mute), có thể bị
  report.
- **Guest**: chưa đăng nhập, chỉ xem lobby/ván đang diễn ra, không chat, không tham gia dưới bất
  kỳ hình thức nào.

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép player tạo một ván cờ mới bằng cách chọn một cấu hình ván cờ có
  sẵn và chọn ván là công khai hoặc riêng tư.
- **FR-2**: Hệ thống cho phép player vừa tạo ván mời một bạn bè cụ thể (trong danh sách bạn bè
  của họ) làm đối thủ cho ván đó, bằng cách gửi một thông báo mời chơi qua notification
  ([[BRD-NOTIFICATION-001]]) kèm 2 hành động "Chấp nhận" và "Từ chối"; đây là cách duy nhất để
  thêm người chơi thứ hai vào một ván riêng tư.
- **FR-3**: Khi người được mời bấm "Chấp nhận" trên thông báo mời chơi, hệ thống thêm người đó
  làm người chơi thứ hai của ván và điều hướng (navigate) người đó tới màn hình ván game.
- **FR-4**: Khi người được mời bấm "Từ chối" trên thông báo mời chơi, hệ thống không thêm người
  đó vào ván, và gửi một thông báo cho người mời biết lời mời đã bị từ chối; ván vẫn giữ trạng
  thái "đang tìm đối thủ" (người tạo có thể mời người khác, kể cả với ván riêng tư).
- **FR-5**: Hệ thống hiển thị trong lobby danh sách ván công khai ở trạng thái "đang tìm đối
  thủ" hoặc "đang diễn ra" cho player và guest xem; player khác có thể bấm Join vào một ván
  "đang tìm đối thủ" để trở thành người chơi thứ hai của ván đó.
- **FR-6**: Hệ thống cho phép player chọn "Quick Pair" và chỉ định một cấu hình ván cờ mong
  muốn; hệ thống tự động ghép player đó với một player khác đang chờ Quick Pair cùng cấu hình,
  tạo thành một ván công khai mới với cả hai làm người chơi.
- **FR-7**: Hệ thống ẩn hoàn toàn ván riêng tư khỏi lobby; không user nào ngoài hai người chơi
  (người tạo và người được mời ở FR-2/FR-3) xem được ván riêng tư, kể cả dưới vai trò viewer.
- **FR-8**: Khi một ván đủ 2 player, hệ thống cho người tạo ván 15 giây để bấm Start; nếu hết 15
  giây mà chưa bấm, hệ thống huỷ ván và không tính thắng/thua/elo cho ai.
- **FR-9**: Khi ván được Start, hệ thống xác định ngẫu nhiên quân X/O cho 2 player (X đi trước)
  và bắt đầu đếm thời gian nước đi đầu tiên theo mức đã cấu hình.
- **FR-10**: Sau mỗi nước đi hợp lệ, hệ thống reset đồng hồ nước đi về đúng mức thời gian đã cấu
  hình cho lượt của bên kia.
- **FR-11**: Hệ thống xác định một player thắng ván khi player đó có 5 quân liên tiếp theo hàng
  ngang, dọc, hoặc chéo.
- **FR-12**: Hệ thống xác định ván hoà khi bàn cờ đầy mà không bên nào đạt 5 quân liên tiếp.
- **FR-13**: Hệ thống xử thua cho player nào hết thời gian nước đi của lượt mình mà chưa đi
  nước nào, bất kể nguyên nhân (kể cả mất kết nối).
- **FR-14**: Hệ thống cho phép player trong ván gửi yêu cầu xin hoà tới đối thủ; đối thủ có thể
  accept (kết thúc ván với kết quả hoà) hoặc reject (ván tiếp tục).
- **FR-15**: Hệ thống cho phép player trong ván đầu hàng tại bất kỳ thời điểm nào trong ván,
  kết thúc ván với kết quả thua cho người đầu hàng.
- **FR-16**: Hệ thống hiển thị cho player trong ván: tên, elo, tỉ lệ thắng của bản thân và đối
  thủ, cùng thời gian còn lại của nước đi hiện tại.
- **FR-17**: Hệ thống hiển thị danh sách username viewer đang xem ván (nếu có).
- **FR-18**: Hệ thống cho phép player và viewer đã đăng nhập chat trong ván.
- **FR-19**: Hệ thống cho phép player mute một viewer cụ thể trong ván của mình; viewer bị mute
  không gửi được chat trong ván đó nhưng vẫn xem được diễn biến.
- **FR-20**: Hệ thống cho phép player report đối thủ hoặc viewer trong ván (dùng chung cơ chế
  report của platform).
- **FR-21**: Hệ thống cho phép player xem lại lịch sử các nước đi sau khi ván kết thúc.
- **FR-22**: Hệ thống cho phép Guest xem lobby và nội dung ván công khai đang diễn ra, nhưng
  không cho chat hoặc tham gia dưới bất kỳ vai trò nào.
- **FR-23**: Hệ thống cho phép người tạo ván huỷ ván của mình khi ván còn ở trạng thái "đang tìm
  đối thủ" (chưa đủ 2 player).
- **FR-24**: Hệ thống cho phép player đang chờ được ghép qua Quick Pair huỷ yêu cầu chờ đó tại
  bất kỳ thời điểm nào trước khi được ghép.
- **FR-25**: Khi player điều hướng tới một ván qua thông báo mời chơi game nhưng ván đó không
  còn ở trạng thái hợp lệ để tham gia (đã bị huỷ, đã đủ người, hoặc đã kết thúc), hệ thống hiển
  thị cho player một màn hình thông báo ván đã huỷ/không còn khả dụng, không cho thực hiện hành
  động tham gia.

## 5. Business Rules

- Luật thắng: 5 quân liên tiếp (ngang/dọc/chéo), không áp dụng luật chặn 2 đầu.
- Ván riêng tư ẩn hoàn toàn khỏi lobby, không hỗ trợ viewer dưới bất kỳ hình thức nào; người
  chơi thứ hai chỉ có thể được thêm vào qua lời mời bạn bè (FR-2/FR-3), không có cách nào khác
  (không Join từ lobby, không Quick Pair).
- Có ba cách để một ván có đủ 2 người chơi: (1) mời bạn bè cụ thể và được Chấp nhận (bắt buộc
  với ván riêng tư), (2) player khác Join trực tiếp một ván công khai trong lobby, (3) Quick
  Pair — hệ thống tự ghép hai player đang chờ cùng cấu hình.
- Cửa sổ Start là đúng 15 giây kể từ thời điểm đủ 2 player; không bấm kịp = huỷ ván, không tính
  kết quả.
- Mỗi ván chỉ có một mức thời gian nước đi (chọn lúc tạo ván), áp dụng đồng nhất cho cả hai bên
  suốt ván, không đổi giữa ván.
- Hết thời gian một nước đi mà chưa đi → xử thua cả ván ngay lập tức, không có cơ chế mất
  lượt/skip.
- Đồng hồ nước đi không cộng dồn thời gian dư từ nước trước; luôn reset về đúng mức đã cấu hình.
- Mất kết nối giữa ván không dừng hoặc gia hạn đồng hồ nước đi; xử lý giống hết giờ nước đi
  thông thường.
- Mute là theo từng viewer cụ thể, không phải tắt chat toàn ván.
- Report trong ván dùng chung cơ chế report/admin review của platform — không tự động xử lý.
- Lời mời chơi game (FR-2) không có thời hạn (không timeout); lời mời vẫn tồn tại tới khi được
  Chấp nhận/Từ chối hoặc tới khi ván liên quan không còn hợp lệ vì lý do khác (vd người tạo huỷ
  ván).
- Khi người được mời Từ chối, hệ thống chỉ báo cho người mời, không tự huỷ ván — ván vẫn ở trạng
  thái "đang tìm đối thủ" để người tạo mời người khác (áp dụng cả với ván riêng tư).
- Nếu player bấm vào một thông báo mời chơi game đã cũ và ván liên quan không còn hợp lệ (đã
  huỷ/đã đủ người/đã kết thúc), hệ thống chỉ hiển thị màn hình báo "ván đã huỷ", không có hành
  vi nào khác (không tự tạo ván mới, không tự ghép vào ván khác).

## 6. Acceptance Criteria

- **AC-1** (FR-8): Given một ván cờ đã đủ 2 player, When người tạo không bấm Start trong 15
  giây, Then ván tự kết thúc và không ai bị tính thắng/thua/đổi elo.
- **AC-2** (FR-7): Given một ván cờ được tạo ở chế độ riêng tư, When bất kỳ user khác cố mở ván
  đó từ lobby hoặc link, Then hệ thống không cho xem, kể cả khi cố gắng xem dưới vai trò viewer.
- **AC-3** (FR-13): Given một ván cờ với mức thời gian nước đi 15s, When người chơi không đi
  nước nào trong vòng 15s kể từ lượt của mình (kể cả do mất kết nối), Then người đó xử thua cả
  ván ngay lập tức, không có cơ chế mất lượt/skip.
- **AC-4** (FR-19): Given một player đang xem ván cờ công khai, When một trong hai người chơi
  mute player đó, Then player đó không gửi được chat trong ván nhưng vẫn xem được diễn biến.
- **AC-5** (FR-11): Given một player vừa đặt quân tạo thành 5 quân liên tiếp theo hàng chéo, When
  nước đi đó được xác nhận, Then ván kết thúc ngay với kết quả thắng cho player đó.
- **AC-6** (FR-14): Given player A gửi yêu cầu xin hoà, When đối thủ B reject yêu cầu, Then ván
  tiếp tục bình thường, đồng hồ nước đi không bị ảnh hưởng bởi yêu cầu xin hoà.
- **AC-7** (FR-22): Given guest chưa đăng nhập mở trang lobby, When guest xem một ván công khai
  đang diễn ra, Then guest xem được bàn cờ và diễn biến nhưng không thấy được nút chat hoặc nút
  tham gia.
- **AC-8** (FR-6): Given hai player A và B đều chọn Quick Pair với cùng cấu hình (25x25, 15s),
  When cả hai đang chờ ghép cùng lúc, Then hệ thống tự động ghép A và B vào một ván công khai
  mới và chuyển cả hai vào bước chờ Start.
- **AC-9** (FR-5): Given một ván công khai đang ở trạng thái "đang tìm đối thủ" trong lobby, When
  một player khác bấm Join, Then player đó trở thành người chơi thứ hai của ván, ván chuyển
  sang chờ Start.
- **AC-10** (FR-24): Given player A đang chờ được ghép qua Quick Pair, When A bấm huỷ yêu cầu
  chờ trước khi có ai được ghép, Then A thoát khỏi hàng chờ Quick Pair và không bị ghép với ai.
- **AC-11** (FR-25): Given player B nhận thông báo mời chơi game từ A cho ván X, When A huỷ ván
  X trước khi B bấm vào thông báo, sau đó B bấm vào thông báo đó, Then hệ thống hiển thị màn
  hình "ván đã huỷ" cho B, không cho B tham gia ván X.
- **AC-12** (FR-4): Given player A mời B làm đối thủ cho ván riêng tư X, When B bấm "Từ chối",
  Then A nhận được thông báo B đã từ chối, và ván X vẫn ở trạng thái "đang tìm đối thủ" để A có
  thể mời một bạn bè khác.

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- Danh sách ván đang mở/đang diễn ra trong lobby phải cập nhật realtime cho mọi người đang xem.
- Đồng hồ nước đi (5-60s) phải được tính theo thời gian server (server-authoritative), không
  dựa vào đồng hồ client, để tránh gian lận hoặc lệch giờ khi xử thua do hết giờ nước đi.
- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Giả định "đối thủ" trong lời mời (FR-2) phải nằm trong danh sách bạn bè hiện tại của người
  tạo ván (theo [[BRD-ACCOUNT-SOCIAL-002]]).
- Giả định không giới hạn số lượng viewer cho một ván (theo Out of scope của idea gốc).
- Giả định Quick Pair chỉ ghép player với cấu hình giống hoàn toàn (cùng kích thước bàn và cùng
  thời gian nước đi), không ghép gần đúng/nới lỏng tiêu chí.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-CARO-GAME-001]] để có danh sách cấu hình ván cờ hợp lệ.
- Phụ thuộc [[BRD-ACCOUNT-SOCIAL-001]], [[BRD-ACCOUNT-SOCIAL-002]] để có khái niệm user/account
  và danh sách bạn bè (dùng cho lời mời đối thủ).
- Phụ thuộc [[BRD-TRUST-REPORT-001]] cho chức năng report trong ván.
- Phụ thuộc elo/profile ở [[BRD-CARO-GAME-004]]: kết quả ván (thắng/thua/hoà) là đầu vào để
  tính lại elo và cập nhật profile, lịch sử ván.
- [[BRD-NOTIFICATION-001]] phụ thuộc domain này để gửi thông báo "mời chơi game" và thông báo
  kết quả Chấp nhận/Từ chối lời mời.

## 10. Câu hỏi mở / Rủi ro

- Idea gốc chưa nêu rõ ai khác ngoài người tạo có thể huỷ ván đang "tìm đối thủ" (vd người được
  mời có quyền huỷ lời mời từ phía mình sau khi đã Chấp nhận nhưng trước Start không, hay chỉ
  người tạo mới huỷ được toàn bộ ván) — tạm giả định chỉ người tạo huỷ được ván (FR-23); cần xác
  nhận nếu cần thêm hành vi cho người được mời.
