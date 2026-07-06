webapp sẽ bao gồm một vài page sau:
- Page login with google: không cần logedin
- Page account: cần logedin
- Page game-caro: không cần logined (chỉ xem, cần login để join game)
- Page game-caro-detail: không cần logedin (nhưng cần loged in để chat/report/chơi cờ)
- Page tournament: cần loggedin
- Page admin: cần loggedin

api: sẽ trả về accessToken + refreshToken dưới dạng response body
api: sẽ authorization thông qua Bearer token

================
layout: tất cả các pages dùng chung môt layout với header
header: là flex box với 2 phần tách biệt
- bên trái: logo với DongT (click sẽ quay về trang danh sách game)
- bên phải:s
  + chưa đăng nhập: button login (click => dẫn đến trang đăng nhập)
  + đã đăng nhập: icon chuông (hiển thị notification) + icon user (danh sách bạn bè) + email (dropdown với danh sách profile đã tạo => click navigate đến page profile tương ứng)

1. Nội dung page login:
hiển thị button "Login with google"

1. Nội dung page danh sách game: chưa các card (game banner + tên game) => click vào card => navigate đến game

2. Nội dung page game caro:
   - Tab với 3 items: Lobby(1), Tournament(2), Quick pair(3)
   - bên phải là leader board với 10 player có điểm Elo cao nhất (dạng card với các thông tin Avatar + username (phần tên trước @ của email) + Elo  + highlight cho top 1, 2 ,3 + badge "bạn" nếu bản thân có trên top 10)
   - (1) list các card với các thông tin: username + elo + type của game + buttons join/view (nếu chưa đăng nhập => click join => navigate đến page login) + button tạo game (4)
   - (2) list các card với các thông tin: title + loại game + thời gian bắt đầu + số người đăng ký + buttons view/register (chưa đăng nhập click register => navigate đến page login)
   - (3) danh sách type của game: card với thông tin: số bàn cờ + time => click tìm và match game tương ứng
   - (4) modal tạo game với các thông tin tương ứng
  
3. Nội dung page gameboard:
   - bên trái: hiển thị bàn cờ với số ô tương ứng với setting
   - bên phải chứa danh sách các components ứng với các trạng thái:
        - chưa có đối thủ: 
          - player card (bản thân)
          - player card (Text đang chờ đối thủ)
          - danh sách player views (nếu có)
          - chat box
        - có đối thủ (game chưa bắt đầu)
          - player card (bản thân) (1)
          - player card (đối thủ) (1)
          - danh sách player views (nếu có)
          - button bắt đầu + count down 15s => hết 15s chưa bắt đầu => kết thúc game
          - chat box
        - đã bắt đầu game
          - player card (bản thân) (1)
          - player card (đối thủ) (1)
          - danh sách player views (nếu có)
          - cta (xin hoà, đầu hàng)
          - chat box
        - game đã kết thúcs
          - player card (bản thân) (1)
          - player card (đối thủ) (1)
          - danh sách player views (nếu có)
          - button xem lại các nước đã chơi
          - chat box

4. Nội dung page tournament:
    - countdown thời gian (kết thúc - bắt đầu) + button pause để tạm dừng bắt cập
    - danh sách player xấp xếp theo điểm giảm dần + có phân trang
    - player ở page này khi được match với player khác thì sẽ navigate vào page gameboard => game bắt đầu ngay sau 5s
    - sau khi kêt thúc 1 game + user + button back về tournament => player được navigate về page tournament => tiếp tục ghép cập

5. Nội dung page profile game caro
    - số bàn thắng/thua/hoà
    - chart thắng/thua/hoà theo thời gian
    - danh sách game đã chơi (phân trang, dạng card, click card => xem game đã chơi)