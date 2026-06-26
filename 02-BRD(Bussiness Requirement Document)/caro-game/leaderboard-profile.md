---
id: BRD-CARO-GAME-004
title: Leaderboard & Profile
feature: caro-game
status: draft
source_idea: "[[IDEA-002]]"
created: 2026-06-26
tags: [brd, caro-game]
---

# Leaderboard & Profile

## 1. Mục tiêu nghiệp vụ (Business Objective)

Theo dõi và phản ánh năng lực thi đấu của player qua elo, tạo bảng xếp hạng cạnh tranh, và cho
phép player xem lại quá trình chơi của bản thân/người khác qua profile riêng của game Caro.

## 2. Phạm vi

### In scope

- Tính lại elo của player sau mỗi ván cờ kết thúc có kết quả (thắng/thua/hoà) — bao gồm cả ván
  thường và ván trong tournament, theo cùng một công thức.
- Leaderboard hiển thị top 10 player có elo cao nhất.
- Profile Caro của mỗi player: tỉ lệ thắng/thua/hoà, tổng số ván đã chơi, danh sách ván đã chơi.

### Out of scope

- Elo riêng cho tournament (điểm tournament là hệ thống điểm độc lập, xem
  [[BRD-CARO-GAME-003]] — điểm tournament và elo cùng được tính cho mỗi trận, nhưng theo hai
  công thức độc lập, không ảnh hưởng nhau).
- Leaderboard theo điểm tournament hoặc theo khung thời gian (chỉ có 1 leaderboard top 10 theo
  elo toàn thời gian).
- Mùa giải / reset elo theo chu kỳ — idea gốc không đề cập.

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: có elo và profile riêng, xem leaderboard và profile của mình/người khác.

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống khởi tạo elo bằng **1200** cho mỗi player khi player đó chơi ván Caro đầu
  tiên (xác lập có profile Caro).
- **FR-2**: Sau mỗi ván cờ kết thúc với kết quả thắng/thua/hoà (kể cả ván trong tournament), hệ
  thống tính lại elo của cả hai player theo công thức elo ở mục 5.
- **FR-3**: Ván cờ bị huỷ do không bấm Start kịp (xem [[BRD-CARO-GAME-002]] FR-6) không làm
  thay đổi elo của ai.
- **FR-4**: Hệ thống cung cấp leaderboard hiển thị top 10 player có elo cao nhất, cập nhật sau
  mỗi lần elo thay đổi.
- **FR-5**: Hệ thống cung cấp trang profile Caro của một player gồm: tỉ lệ thắng/thua/hoà, tổng
  số ván đã chơi, danh sách các ván đã chơi (có thể mở xem lại lịch sử nước đi của từng ván qua
  [[BRD-CARO-GAME-002]]).
- **FR-6**: Hệ thống cho phép player xem profile Caro của người chơi khác.

## 5. Business Rules

- **Elo khởi tạo**: 1200 cho mọi player khi chơi ván Caro đầu tiên.
- **Công thức elo** (chuẩn Elo cờ vua, theo Arpad Elo, cùng cách FIDE/USCF áp dụng):
  - Điểm kỳ vọng của player A trước player B:
    `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
  - Elo mới của A sau ván: `R_A' = R_A + K × (S_A - E_A)`, trong đó `S_A` = 1 nếu A thắng, 0.5
    nếu hoà, 0 nếu A thua. Áp dụng tương tự cho B với `E_B = 1 - E_A`.
  - **K-factor** (hệ số biến động) chia theo số ván đã hoàn thành của player tại thời điểm tính:
    - `K = 40` nếu player đã chơi **dưới 30 ván** (giai đoạn "provisional" — elo hội tụ nhanh để
      phản ánh đúng năng lực thật sớm).
    - `K = 20` nếu player đã chơi **từ 30 ván trở lên** (elo đã ổn định, biến động chậm hơn để
      tránh dao động mạnh vì một vài ván bất thường).
  - Mỗi player trong ván dùng K-factor riêng theo số ván đã chơi của chính mình (hai bên có thể
    dùng K khác nhau trong cùng một ván).
- Ván trong tournament dùng đúng công thức và K-factor này, không có công thức elo riêng cho
  tournament.
- Ván bị huỷ (không Start kịp) không tính vào số ván đã chơi và không ảnh hưởng elo.
- Leaderboard chỉ hiển thị đúng 10 vị trí cao nhất theo elo.

## 6. Acceptance Criteria

- **AC-1** (FR-1): Given một player chưa từng chơi Caro, When player đó hoàn thành ván cờ đầu
  tiên, Then hệ thống tạo profile Caro cho player với elo khởi tạo 1200 (trước khi tính kết quả
  ván đó) và 1 ván đã chơi được ghi nhận.
- **AC-2** (FR-2): Given player A có elo 1200 (đã chơi 10 ván, K=40) và player B có elo 1200
  (đã chơi 10 ván, K=40) đang chơi một ván, When A thắng B, Then elo của A tăng 20 điểm (lên
  1220) và elo của B giảm 20 điểm (xuống 1180), theo `E_A = 0.5`, `R_A' = 1200 + 40×(1-0.5)`.
- **AC-3** (FR-2): Given player A có elo 1200 (đã chơi 40 ván, K=20) thắng player B có elo 1400
  (đã chơi 40 ván, K=20), When ván kết thúc, Then elo A tăng nhiều hơn mức tăng khi thắng đối
  thủ cùng elo (vì `E_A < 0.5` khi elo thấp hơn), cụ thể tăng khoảng 15 điểm (lên ~1215), theo
  `E_A = 1/(1+10^(200/400)) ≈ 0.24`, `R_A' = 1200 + 20×(1-0.24)`.
- **AC-4** (FR-3): Given một ván cờ bị huỷ vì người tạo không bấm Start trong 15s, When ván
  chuyển trạng thái huỷ, Then elo của cả hai player liên quan không thay đổi và ván đó không
  xuất hiện trong danh sách ván đã chơi của profile.
- **AC-5** (FR-4): Given elo của một player vừa tăng vượt qua vị trí thứ 10 hiện tại trên
  leaderboard, When elo được tính lại, Then leaderboard cập nhật để phản ánh đúng top 10 mới.

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Elo khởi tạo (1200) và mốc K-factor (40 dưới 30 ván, 20 từ 30 ván) là đề xuất dựa trên cách
  FIDE/USCF và phần lớn nền tảng cờ online áp dụng phiên bản Elo cổ điển; đây là giá trị khởi
  điểm hợp lý cho MVP, có thể điều chỉnh sau khi có dữ liệu thực tế (xem mục 10).
- Lichess thực tế dùng Glicko-2 (có thêm rating deviation/volatility) thay vì Elo cổ điển; BRD
  này chọn Elo cổ điển vì đơn giản hơn để triển khai và giải thích cho MVP, đánh đổi việc không
  có "độ tin cậy" (confidence interval) của rating như Glicko-2 cung cấp.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-CARO-GAME-002]]: kết quả ván cờ là đầu vào để tính elo và ghi nhận lịch sử ván.
- [[BRD-CARO-GAME-003]] phụ thuộc domain này: ràng buộc elo để tham gia tournament đọc dữ liệu
  elo từ đây; mỗi trận trong tournament cũng ghi elo mới về đây.

## 10. Câu hỏi mở / Rủi ro

- Elo khởi tạo 1200 và K-factor (40/20 theo mốc 30 ván) là đề xuất của BA dựa trên thông lệ phổ
  biến (FIDE/USCF-style), idea gốc chỉ nói "tham khảo lichess.com" — cần user xác nhận lại các
  số cụ thể này trước khi chuyển sang ADR/implementation, vì đây là quyết định ảnh hưởng trực
  tiếp tới cảm nhận công bằng của player.
- Nếu sau này muốn chuyển sang Glicko-2 (như lichess thực tế dùng) để có rating deviation chính
  xác hơn khi player mới chơi ít ván, đây sẽ là một quyết định kiến trúc (ADR) riêng, không thay
  đổi phạm vi BRD này.
