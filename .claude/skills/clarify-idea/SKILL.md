---
name: clarify-idea
description: Làm rõ một ý tưởng thô trong 00-Inbox bằng nghiệp vụ Business Analyst (5W1H, actor/stakeholder, user story, business rule, NFR, edge case, out-of-scope) thông qua hỏi đáp tương tác với user, sau đó ghi ý tưởng hoàn chỉnh vào 01-Ideas theo quy ước ID/frontmatter chung của vault. Dùng khi user nói "làm rõ ý tưởng", "process inbox", "clarify idea", "phân tích idea.md", hoặc nhắc tới việc đưa nội dung từ 00-Inbox sang 01-Ideas.
user-invocable: true
---

# clarify-idea — 00-Inbox → 01-Ideas

Skill này đóng vai một BA (Business Analyst) phỏng vấn lại người đưa ý tưởng: ý tưởng thô
trong `00-Inbox` luôn thiếu chi tiết (actor nào, ràng buộc nào, cái gì cố ý không làm), và
việc đoán bừa các chi tiết đó sẽ làm hỏng toàn bộ BRD/ADR ở các bước sau. Vì vậy skill **phải
hỏi user**, không tự bịa câu trả lời cho các điểm mơ hồ quan trọng.

Trước khi làm bất cứ điều gì, đọc file quy ước chung:
`.claude/skills/_shared-ba-pipeline/CONVENTIONS.md` (cùng cấp `.claude/skills/`, nằm ngoài
thư mục skill này). File đó định nghĩa cấu trúc thư mục, ID, frontmatter — áp dụng nguyên cho
output của skill này.

## Workflow

1. **Chọn ý tưởng cần xử lý.** Nếu user chỉ định file/đoạn cụ thể trong `00-Inbox`, dùng đúng
   cái đó. Nếu không, liệt kê các file trong `00-Inbox` chưa có callout `[!done]` ở đầu (xem
   CONVENTIONS.md) và hỏi user muốn xử lý file/đoạn nào.

2. **Phát hiện ranh giới ý tưởng.** Một file Inbox có thể chứa nhiều ý tưởng độc lập (ví dụ
   `idea.md` hiện có: ý tưởng "game platform" tổng quát + ý tưởng con "game Caro" + ý tưởng
   con "game Truy tìm kho báu" chỉ mới có 1 câu). Đọc toàn file rồi đề xuất cách tách thành
   các `IDEA-NNN` riêng, và **xác nhận với user** trước khi đi sâu làm rõ từng cái — đừng tự
   quyết ranh giới rồi làm rõ luôn, vì sai ranh giới ở bước này kéo sai toàn bộ pipeline.
   Ý tưởng con phụ thuộc ý tưởng mẹ (vd "Caro" phụ thuộc các tính năng chung của platform) thì
   ghi nhận quan hệ đó trong mục Dependencies, không gộp chung 1 file.

3. **Áp dụng kỹ thuật BA để tìm lỗ hổng**, theo từng ý tưởng đã tách. Dùng các khung sau làm
   checklist tư duy (không cần hỏi máy móc tất cả, chỉ hỏi phần thực sự còn thiếu/mơ hồ/rủi ro
   với ý tưởng cụ thể đang xử lý):
   - **5W1H**: Who (ai dùng/ai vận hành), What (làm được gì, không làm được gì), Why (giá trị
     nghiệp vụ, vì sao cần), When (thời điểm/tần suất), Where (browser/mobile/cả hai), How
     (luồng chính diễn ra thế nào).
   - **Actor & stakeholder**: tất cả vai trò liên quan (player, viewer, admin, hệ thống điểm
     elo, đối thủ, người tạo tournament...), quyền hạn khác nhau giữa các actor.
   - **User story**: "Là <actor>, tôi muốn <hành động> để <giá trị>" cho các luồng chính.
   - **Business rules**: ràng buộc nghiệp vụ cụ thể (vd cách tính điểm tournament, điều kiện
     bắt đầu trận, điều kiện thắng/thua/hoà).
   - **Non-functional requirements**: hiệu năng (realtime tới mức nào), bảo mật (chống gian
     lận, bảo vệ thông tin cá nhân), khả năng chịu tải, khả dụng.
   - **Assumptions & Out of scope**: cái gì đang giả định sẵn có (vd hệ thống email đã tồn
     tại để gửi mã xác thực?), cái gì rõ ràng chưa làm ở giai đoạn này.
   - **Edge case / exception flow**: trường hợp ngoại lệ (mất kết nối giữa trận, 1 trong 2
     người không bấm "start" trong 15s, report sai sự thật...).
   - **Success metric**: làm sao biết tính năng này thành công (không bắt buộc, hỏi nếu user
     có vẻ quan tâm đo lường).

4. **Hỏi theo từng vòng nhỏ, ưu tiên rủi ro cao nhất trước.** Mỗi vòng hỏi 3–5 câu liên quan
   đến nhau (đừng dồn tất cả checklist trên thành một câu hỏi khổng lồ). Dùng `AskUserQuestion`
   khi câu trả lời có thể đóng khung thành lựa chọn rõ ràng (vd "Cách tính điểm khi hoà sau khi
   thắng liên tiếp, làm theo lichess hay quy tắc riêng?"); dùng câu hỏi dạng text mở khi cần
   user diễn giải tự do (vd "Khi nào thì coi là gian lận để cho phép report?"). Tiếp tục thêm
   vòng hỏi cho tới khi không còn điểm mơ hồ **quan trọng** (ảnh hưởng tới luồng chính hoặc
   business rule) — những thứ chi tiết nhỏ có thể để lại thành "Câu hỏi mở" trong file kết quả
   thay vì hỏi tới cùng.

5. **Lấy ID kế tiếp.** Đọc `01-Ideas/_INDEX.md` (tạo mới với header bảng nếu chưa có) để biết
   `IDEA-NNN` tiếp theo, tăng dần qua các ý tưởng được tạo trong cùng lần chạy.

6. **Viết file ý tưởng** vào `01-Ideas/<slug>.md` (slug kebab-case không dấu theo tên ý
   tưởng), theo template:

   ```markdown
   ---
   id: IDEA-XXX
   title: <tên ý tưởng>
   status: clarified
   source: "[[00-Inbox/<file gốc>]]"
   created: <ngày hôm nay>
   tags: [idea]
   ---

   # <Title>

   ## Tóm tắt / Business Goal

   ## Đối tượng sử dụng (Actors & Stakeholders)

   ## User Stories chính

   ## Phạm vi (In scope)

   ## Ngoài phạm vi (Out of scope)

   ## Business Rules

   ## Yêu cầu phi chức năng (NFR)

   ## Giả định (Assumptions)

   ## Phụ thuộc (Dependencies)
   <!-- liên kết [[IDEA-YYY]] khác nếu ý tưởng này phụ thuộc ý tưởng khác -->

   ## Câu hỏi mở
   <!-- chỉ những điểm nhỏ, không chặn việc viết BRD, để lại cho bước sau xử lý hoặc hỏi tiếp -->
   ```

   Nếu mục nào không có nội dung thực sự (vd không có câu hỏi mở), bỏ hẳn heading đó —
   không để heading rỗng.

7. **Cập nhật `01-Ideas/_INDEX.md`**: append dòng `| IDEA-XXX | <title> | clarified |
   [[<slug>]] | [[00-Inbox/<file gốc>]] |`.

8. **Đánh dấu nguồn trong `00-Inbox`**: thêm callout ở đầu file gốc (không xoá nội dung thô):
   `> [!done] Đã xử lý → [[IDEA-XXX]]` (liệt kê đủ các ID nếu một file tách ra nhiều ý tưởng).
   Nếu chỉ một phần của file được xử lý (còn phần khác trong cùng file chưa làm rõ), đặt
   callout ngay phía trên đoạn tương ứng và nói rõ với user phần nào còn lại chưa xử lý.

9. **Báo cáo kết quả** ngắn gọn: những `IDEA-XXX` đã tạo (đường dẫn), và nếu còn "Câu hỏi mở"
   thì nêu rõ để user biết trước khi chuyển sang bước `idea-to-brd`.
