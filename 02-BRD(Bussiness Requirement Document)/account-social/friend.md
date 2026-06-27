---
id: BRD-ACCOUNT-SOCIAL-002
title: Kết bạn
feature: account-social
status: draft
source_idea: "[[IDEA-001]]"
created: 2026-06-26
tags: [brd, account-social]
---

# Kết bạn

## 1. Mục tiêu nghiệp vụ (Business Objective)

Cho phép player mở rộng danh sách bạn bè trên platform qua lời mời kết bạn bằng email, làm nền
cho các tính năng xã hội dùng chung của mọi game (vd mời bạn vào ván cờ).

## 2. Phạm vi

### In scope

- Gửi lời mời kết bạn tới một email đã có account trên platform.
- Người nhận lời mời chấp nhận (accept) hoặc từ chối (reject) lời mời.
- Quan hệ bạn bè chỉ chính thức khi cả hai bên đồng ý (mutual).

### Out of scope

- Gửi lời mời tới email chưa có account trên platform (không lưu lời mời chờ, không gửi mời
  qua email ngoài hệ thống).
- Hủy kết bạn (unfriend) sau khi đã là bạn — chưa được idea gốc đề cập, xem mục 10.
- Chat giữa bạn bè ở cấp platform (out of scope của toàn idea, chat chỉ tồn tại trong context
  riêng của từng game).

## 3. Đối tượng liên quan (Stakeholders & Actors)

- **Player**: gửi lời mời, nhận lời mời, accept/reject.

## 4. Yêu cầu chức năng (Functional Requirements)

- **FR-1**: Hệ thống cho phép player gửi lời mời kết bạn tới một địa chỉ email.
- **FR-2**: Khi player nhận được lời mời kết bạn, hệ thống cho phép player đó accept hoặc
  reject lời mời.
- **FR-3**: Hệ thống xác nhận hai user là bạn bè (friend) chỉ sau khi người nhận accept lời
  mời.
- **FR-4**: Hệ thống thông báo cho người gửi biết kết quả accept/reject lời mời của họ (qua
  domain notification — xem [[BRD-NOTIFICATION-001]]).

## 5. Business Rules

- Lời mời kết bạn chỉ gửi được tới email đã có account đăng ký trên platform; nếu không tìm
  thấy account khớp email, hệ thống báo lỗi ngay và không lưu lời mời chờ.
- Quan hệ bạn bè chỉ chính thức khi cả hai bên đồng ý (mutual accept) — gửi lời mời không tự
  động tạo quan hệ một chiều hiển thị là "bạn".
- Một cặp user không thể có nhiều hơn một lời mời kết bạn đang chờ xử lý cùng lúc theo cùng một
  chiều gửi.

## 6. Acceptance Criteria

- **AC-1** (FR-1): Given một email chưa có account trên platform, When player gửi lời mời kết
  bạn tới email đó, Then hệ thống báo lỗi và không tạo lời mời.
- **AC-2** (FR-1, FR-3): Given email người nhận đã có account, When player A gửi lời mời tới
  player B, Then lời mời được tạo ở trạng thái "đang chờ" và chưa coi A, B là bạn bè.
- **AC-3** (FR-2, FR-3): Given player B có một lời mời đang chờ từ player A, When B accept lời
  mời, Then hệ thống ghi nhận A và B là bạn bè (mutual) và cả hai đều thấy nhau trong danh sách
  bạn bè ở trang Account.
- **AC-4** (FR-2): Given player B có một lời mời đang chờ từ player A, When B reject lời mời,
  Then quan hệ bạn bè không được tạo và lời mời chuyển trạng thái "đã từ chối".

## 7. Yêu cầu phi chức năng (Non-functional Requirements)

- API business logic của domain này phải độc lập với client (API-first) để dùng chung được cho
  web app và mobile app sau này.

## 8. Giả định & Ràng buộc (Assumptions & Constraints)

- Mỗi email chỉ map tới đúng một account (đã giả định ở [[BRD-ACCOUNT-SOCIAL-001]]), nên việc
  tìm account theo email khi gửi lời mời là duy nhất.

## 9. Phụ thuộc (Dependencies)

- Phụ thuộc [[BRD-ACCOUNT-SOCIAL-001]] để có khái niệm account/user tồn tại trên platform.
- [[BRD-NOTIFICATION-001]] phụ thuộc domain này để gửi thông báo "lời mời kết bạn".

## 10. Câu hỏi mở / Rủi ro

- Idea gốc không đề cập khả năng hủy kết bạn (unfriend) sau khi đã chính thức là bạn — cần hỏi
  user có cần tính năng này ở giai đoạn này hay để lại cho phiên bản sau.
- Idea gốc không nêu giới hạn số lượng bạn bè hoặc số lời mời gửi đi tối đa — giả định chưa cần
  giới hạn ở giai đoạn này, sẽ bổ sung nếu phát sinh yêu cầu chống spam.

## ADR liên quan

- [[ADR-ACCOUNT-SOCIAL-002]] — status: rejected. Đã rà BRD này, không có quyết định
  technology-layer nào (race condition khi gửi lời mời kết bạn đồng thời là business logic, để
  `/speckit.plan` xử lý trực tiếp khi implement feature).
