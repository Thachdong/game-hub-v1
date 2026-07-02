webapp sẽ bao gồm một vài page sau:
- Page login with google: không cần logedin
- Page account: cần logedin
- Page game-caro: không cần logined (chỉ xem, cần login để join game)
- Page game-caro-detail: không cần logedin (nhưng cần loged in để chat/report/chơi cờ)
- Page tournament: cần loggedin
- Page admin: cần loggedin

api: sẽ trả về accessToken + refreshToken dưới dạng response body
api: sẽ authorization thông qua Bearer toekn