---
id: BRD-CARO-GAME-001
title: Cấu hình ván cờ (Game Admin)
feature: caro-game
status: draft
source_idea: "[[IDEA-002]]"
created: 2026-06-26
tags: [brd, caro-game]
---

# Cấu hình ván cờ (Game Admin)

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cho phép Game Admin (Caro) định nghĩa sẵn các cấu hình ván cờ hợp lệ (kích thước bàn, thời gian
mỗi nước đi) để player chọn khi tạo ván ở [[BRD-CARO-GAME-002]], đảm bảo mọi ván cờ trong hệ
thống tuân theo các tham số đã được kiểm soát.

## 2. Phạm vi

### In scope

- Game Admin tạo, sửa, xoá cấu hình ván cờ gồm: kích thước bàn (chọn trong 18x18, 25x25, 40x40)
  và thời gian cho mỗi nước đi (chọn trong 5s, 10s, 15s, 25s, 35s, 45s, 60s).
- Player chọn một cấu hình đã được Game Admin định nghĩa khi tạo ván mới.

### Out of scope

- Kích thước bàn hoặc mức thời gian nước đi ngoài danh sách đã liệt kê.
- Cơ chế cấp vai trò Game Admin (Caro) — xem mục 8, thuộc phạm vi ngoài idea này.
- Giới hạn số lượng cấu hình Game Admin có thể tạo (giả định không giới hạn).

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Game Admin (Caro)**: tạo/sửa/xoá cấu hình ván cờ.
- **Player**: chọn một cấu hình đã có khi tạo ván ([[BRD-CARO-GAME-002]]).

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép Game Admin tạo một cấu hình ván cờ mới gồm kích thước bàn (một
  trong 18x18/25x25/40x40) và thời gian mỗi nước đi (một trong 5/10/15/25/35/45/60 giây).
- **FR-2**: Hệ thống cho phép Game Admin sửa hoặc xoá một cấu hình ván cờ đã tạo.
- **FR-3**: Hệ thống cung cấp danh sách cấu hình ván cờ hiện có cho player chọn khi tạo ván
  mới.
- **FR-4**: Hệ thống từ chối tạo/sửa cấu hình nếu kích thước bàn hoặc thời gian nước đi không
  thuộc danh sách giá trị hợp lệ.

## 5. Business Rules

- Kích thước bàn chỉ chấp nhận một trong 3 giá trị: 18x18, 25x25, 40x40.
- Thời gian mỗi nước đi chỉ chấp nhận một trong 7 giá trị: 5s, 10s, 15s, 25s, 35s, 45s, 60s.
- Một cấu hình ván cờ là tổ hợp (kích thước bàn, thời gian nước đi); không có tham số khác ở
  giai đoạn này.

## 6. Acceptance Criteria

- **AC-1** (FR-1): Given Game Admin chọn kích thước 25x25 và thời gian nước đi 15s, When Game
  Admin lưu cấu hình, Then hệ thống tạo một cấu hình mới với 2 giá trị đó và hiển thị nó trong
  danh sách cấu hình khả dụng.
- **AC-2** (FR-4): Given Game Admin nhập kích thước bàn 20x20 (không thuộc danh sách hợp lệ),
  When Game Admin lưu cấu hình, Then hệ thống từ chối và báo lỗi giá trị không hợp lệ.
- **AC-3** (FR-2): Given một cấu hình đã tồn tại và chưa được dùng cho ván nào đang diễn ra,
  When Game Admin xoá cấu hình đó, Then cấu hình không còn xuất hiện trong danh sách cho player
  chọn khi tạo ván mới.

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Giả định vai trò Game Admin (Caro) tồn tại và được gán bởi cơ chế ngoài phạm vi BRD này (có
  thể do Platform Admin gán thủ công) — xem [[IDEA-002]] mục Giả định.
- Giả định xoá một cấu hình đang được dùng cho ván chưa kết thúc không ảnh hưởng tới ván đó
  (ván giữ nguyên tham số đã chọn lúc tạo) — cần xác nhận, xem mục 10.

## 9. Phụ thuộc (Dependencies)

- [[BRD-CARO-GAME-002]] (Ván cờ) phụ thuộc domain này: player chỉ chọn được cấu hình do Game
  Admin đã tạo khi tạo ván mới.
- Phụ thuộc khái niệm Game Admin/role do [[game-platform|IDEA-001]] hoặc cơ chế gán role ngoài
  phạm vi platform định nghĩa.

## 10. Câu hỏi mở / Rủi ro

- Idea gốc chưa nêu rõ điều gì xảy ra với các ván đang diễn ra/đang chờ nếu Game Admin xoá cấu
  hình đang dùng cho ván đó — giả định tạm ở mục 8 là ván giữ nguyên tham số đã chọn.
- Idea gốc chưa nêu Game Admin có thể đặt tên/mô tả riêng cho mỗi cấu hình hay chỉ hiển thị
  thẳng tổ hợp (kích thước, thời gian) cho player chọn — chi tiết UI, không chặn tiến độ BRD.
