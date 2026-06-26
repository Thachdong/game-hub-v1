---
name: idea-to-brd
description: Phân tích một ý tưởng đã làm rõ trong 01-Ideas, tách thành các nghiệp vụ (business domain) độc lập theo nguyên tắc bounded-context, và sinh BRD (Business Requirement Document) cho từng nghiệp vụ vào 02-BRD theo cấu trúc 1 folder/nghiệp vụ chứa nhiều file BRD con theo nhóm chức năng. Dùng khi user nói "tạo BRD", "phân tích nghiệp vụ", "breakdown idea thành BRD", "viết business requirement".
user-invocable: true
---

# idea-to-brd — 01-Ideas → 02-BRD

Đầu vào là một `IDEA-XXX` đã ở trạng thái `clarified`. Việc của skill này là hai bước tách
biệt: (1) **bóc tách nghiệp vụ** — quyết định ranh giới domain/feature, việc này cần xác nhận
của user trước khi sinh file vì sai ở đây làm sai toàn bộ cấu trúc 02-BRD; rồi (2) **viết BRD**
chi tiết cho từng domain đã chốt.

Trước khi làm, đọc file quy ước chung:
`.claude/skills/_shared-ba-pipeline/CONVENTIONS.md`. Áp dụng nguyên ID/frontmatter/cấu trúc
thư mục mô tả trong đó.

## Workflow

1. **Chọn idea nguồn.** Nếu user chỉ định `IDEA-XXX` cụ thể, dùng đúng cái đó. Nếu không, đọc
   `01-Ideas/_INDEX.md`, tìm các idea có `status: clarified` mà chưa có BRD nào tham chiếu tới
   (chưa xuất hiện trong `source_idea` của bất kỳ file `02-BRD(...)/**/*.md`), và hỏi user
   muốn xử lý idea nào. Nếu idea được chọn còn `status: draft` hoặc còn mục "Câu hỏi mở" quan
   trọng, cảnh báo user trước khi tiếp tục (BRD viết trên idea chưa rõ sẽ phải sửa lại).

2. **Bóc tách nghiệp vụ (domain decomposition).** Đọc kỹ idea, liệt kê các domain/feature lớn
   độc lập. Nguyên tắc tách:
   - Một domain = một nhóm chức năng có chung actor chính + chung dữ liệu cốt lõi + có thể
     được mô tả độc lập mà không cần nhắc liên tục tới domain khác (chỉ cần khai báo
     dependency). Ví dụ với ý tưởng game platform: `account-social` (đăng ký/đăng nhập, kết
     bạn, chat, report, account page), `notification`, `caro-game` (toàn bộ nghiệp vụ cờ
     caro). Nếu một domain quá lớn và rõ ràng có nhiều mảng độc lập bên trong (vd `caro-game`
     có "ván cờ", "tournament", "leaderboard/profile") thì vẫn là **một** feature folder
     `caro-game/`, nhưng sẽ tách thành nhiều **file BRD** trong bước 4 — không tạo feature
     folder riêng cho mỗi mảng nhỏ đó.
   - Không tách quá nhỏ (vd không tách riêng "đổi avatar" thành 1 domain).
   - Không gộp quá lớn (vd không gộp toàn bộ platform + mọi game vào 1 domain).
   - Ghi nhận quan hệ phụ thuộc giữa domain (vd `caro-game` phụ thuộc `account-social` để có
     user, friend list, chat).

3. **Xác nhận với user** danh sách domain đề xuất (tên feature-slug, mô tả 1 câu, các user
   story nguồn nào thuộc về domain này) trước khi tạo bất kỳ file nào. Cho user cơ hội gộp/tách
   lại trước khi đi tiếp.

4. **Với mỗi domain đã chốt**, xác định xem cần một hay nhiều file BRD:
   - Domain nhỏ, mạch lạc → 1 file BRD duy nhất trong folder đó.
   - Domain lớn (như `caro-game`) → nhiều file, mỗi file là một nhóm chức năng gắn kết chặt
     (vd `match.md` cho luồng tạo/chơi ván cờ, `tournament.md` cho giải đấu,
     `leaderboard-profile.md` cho top điểm và profile). Chỉ tách file khi nhóm chức năng đó đủ
     lớn để có Acceptance Criteria, Business Rules riêng — đừng tách máy móc theo từng bullet
     của idea gốc.

5. **Lấy ID.** Với mỗi feature folder `02-BRD(Bussiness Requirement Document)/<feature-slug>/`:
   nếu folder chưa tồn tại, tạo folder + file `_INDEX.md` mới (header bảng, `<FEATURE>` =
   slug viết hoa). Nếu đã tồn tại, đọc `_INDEX.md` của folder đó để lấy `NNN` tiếp theo —
   số này tăng riêng theo từng feature, không chia sẻ giữa các feature khác nhau.

6. **Viết từng file BRD** theo template:

   ```markdown
   ---
   id: BRD-<FEATURE>-NNN
   title: <tên nhóm chức năng>
   feature: <feature-slug>
   status: draft
   source_idea: "[[IDEA-XXX]]"
   created: <ngày hôm nay>
   tags: [brd, <feature-slug>]
   ---

   # <Title>

   ## 1. Mục tiêu nghiệp vụ (Business Objective)

   ## 2. Phạm vi
   ### In scope
   ### Out of scope

   ## 3. Đối tượng liên quan (Stakeholders & Actors)

   ## 4. Yêu cầu chức năng (Functional Requirements)
   <!-- đánh số FR-1, FR-2... mỗi FR là một hành vi quan sát được, không phải implementation -->

   ## 5. Business Rules
   <!-- các ràng buộc nghiệp vụ cụ thể, vd công thức tính điểm, điều kiện trạng thái -->

   ## 6. Acceptance Criteria
   <!-- Given/When/Then cho các FR quan trọng/rủi ro cao -->

   ## 7. Yêu cầu phi chức năng (Non-functional Requirements)

   ## 8. Giả định & Ràng buộc (Assumptions & Constraints)

   ## 9. Phụ thuộc (Dependencies)
   <!-- [[BRD-...]] khác trong cùng hoặc khác feature, nêu rõ phụ thuộc cái gì -->

   ## 10. Câu hỏi mở / Rủi ro
   ```

   Functional Requirements phải viết ở mức **hành vi nghiệp vụ quan sát được** (vd "Hệ thống
   cho phép người chơi mời bạn bè vào ván cờ qua nút mời"), không lẫn quyết định kỹ thuật (vd
   không viết "dùng WebSocket") — quyết định kỹ thuật thuộc về ADR ở bước sau. Nếu nội dung
   idea gốc còn thiếu để viết đủ một mục (vd thiếu NFR cụ thể), hỏi user thay vì tự bịa số
   liệu/ràng buộc không có cơ sở; nếu là chi tiết nhỏ không chặn tiến độ, ghi vào "Câu hỏi mở".

7. **Cập nhật `_INDEX.md`** của feature folder (append dòng mới) và
   `02-BRD(Bussiness Requirement Document)/_INDEX.md` tổng (thêm feature folder mới nếu lần
   đầu xuất hiện, dạng `| Feature | Slug | Số BRD | Mô tả |`).

8. **Cập nhật idea gốc**: thêm/cập nhật heading `## BRD liên quan` trong file `01-Ideas/...`
   liệt kê toàn bộ `[[BRD-...]]` vừa tạo (liên kết hai chiều).

9. **Báo cáo**: danh sách feature folder + file BRD đã tạo, và mọi "Câu hỏi mở" quan trọng cần
   user lưu ý trước khi chuyển sang bước `brd-to-adr`.
