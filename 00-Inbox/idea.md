Một game platform cho phép user có thể chơi các trò chơi khác nhau trên cùng một account
Mỗi game sẽ có data và cách quản lý data khác nhau
Game sẽ chạy trên: browser và mobile app (có thể cả 2, chỉ trên browser, chỉ trên mobile app)
Tất cả các game sẽ có một số tính năng chung như:
- Có thể đăng ký/đăng nhập và bảo vệ thông tin cá nhân (đăng ký bằng email)
- Chat với user khác
- Nhận thông báo từ hệ thống
- Report user khác gian lận
- Kết bạn thông qua email
- Account page: chứa thông tin cơ bản như: username, email, avatar, danh sách bạn bè, danh sách các game đã chơi

Game caro:
- Người chơi có thể tạo ván cờ với các config khác nhau
- Một số người chơi nhất định có thể tạo được tournament
- Người chơi có thể thấy danh sách top 10 người chơi có điểm số cao nhất
- Người chơi có thể thấy ván cờ do người khác tạo (ở trạng thái đang tìm đối thủ / đang diễn ra)
- Người chơi có thể thấy tournament do người khác tạo (ở trạng thái đang mở / đang diễn ra)
- Cách tính điểm game: tính theo "elo" của cờ vua, tham khảo lichess.com
- Ván cờ:
  + admin của game có thể tạo config để cho user chọn lúc tạo game (về thời lượng, cách chơi)
  + người chơi có thể tạo ván cờ private (không cho người khác thấy)
  + người chơi có thể mời bạn bè chơi game bằng cách click vào button mời bạn bè
  + người chơi có thể thấy thông tin cơ bản của bản thân (tên, elo, tỉ lệ thắng, timmer)
  + người chơi có thể thấy thông tin cơ bản của đối thủ (tên, elo, tỉ lệ thắng, timmer)
  + người chơi có thể thấy thông tin của những người xem (nếu có) gôm username
  + người chơi, người xem (đã đăng nhập) điều có quyền chat
  + người chơi có quyền cấm chat người xem
  + người chơi có quyền report đối thủ / người xem nếu phát hiện gian lận hoặc bị làm phiền
  + sau khi có đủ 2 người chơi thì người tạo game có thể start game trong vòng 15s => không bắt đầu thì xem như game kết thúc
  + ngay khi bắt đầu game sẽ xác định quân cờ cho người chơi (ngẫu nhiên X/O, X đi trước) => bắt đầu timmer 
  + sau khi bắt đầu game, người có thể gửi request xin hoà
  + người chơi có quyền từ chối request xin hoà
  + người chơi có quyền đầu hàng
  + ván cờ sẽ kết thúc khi: có quân thắng, hết bàn cờ hoặc bàn cờ không cho phép đấnh tiếp để có người thắng
  + sau khi ván cờ kết thúc người chơi có thể xem lại lịch sử các nước cở đã đi
- Tournament:
  + chỉ một vài user nhất định có quyền tạo tournament
  + tournamen sẽ có thông tin bắt buộc như: thời gian bắt đầu, thời gian kết thúc, loại config của game, ràng buộc về elo
  + tournament sẽ bắt đầu khi: đến thời gian bắt đầu + số người tham gia >= 5
  + người chơi sẽ được match sao cho người chơi có điểm số tournament cao có tỉ lệ match với nhau
  + điểm số tournament sẽ được tính như sau: thắng 2, hoà 1, thua 0; thắng liên tiếp từ 3 trận trở lên là 4 điểm, hoà sau khi thắng liên tiếp 3 trần trở lên là 2 điểm sau đó về 1 (tham khảo lichess.com)
  + diểm số trong tournament và game là độc lập với nhau
  + danh sách người chơi trong tourname sẽ cập nhật realtime
  + trong tourname sẽ có room chat chung
- Người chơi có thể xem profile cờ caro: tỉ lệ thăng/thua/hoà, số ván đã chơi, danh sách các ván cờ đã chơi
- Người chơi chưa đăng ký / đăng nhập vẫn có thể vào hệ thống, nhưng chỉ được phép xem

Game "Truy tìm kho báo":
sẽ được triển khai sau khi làm xong tính năng cơ bản và game caro