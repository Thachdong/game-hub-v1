---
name: brd-to-adr
description: Phân tích BRD trong 02-BRD của một nghiệp vụ để xác định các điểm cần ra quyết định kiến trúc (data model, realtime, concurrency, service boundary, auth, scaling...), đề xuất 2-3 phương án kèm trade-off cho từng điểm, hỏi user chọn, rồi ghi ADR (Architecture Decision Record) vào 03-ADR theo chuẩn Context/Decision/Consequences. Dùng khi user nói "tạo ADR", "ra quyết định kiến trúc", "thiết kế hệ thống từ BRD", "architecture decision record".
user-invocable: true
---

# brd-to-adr — 02-BRD → 03-ADR

Một ADR ghi lại **một** quyết định kiến trúc và lý do chọn nó giữa các phương án — không phải
một bản thiết kế tổng thể. Việc của skill này là đọc BRD để tìm ra những điểm bắt buộc phải
quyết định, đưa phương án thực tế (không lý thuyết suông) cho user chọn, rồi ghi lại đúng
quyết định đó. Skill **không tự chọn kiến trúc thay user** — nó đề xuất và chờ quyết định,
đúng tinh thần một ADR là quyết định *đã được đưa ra*, có thể truy vết ai/vì sao chọn.

Trước khi làm, đọc file quy ước chung:
`.claude/skills/_shared-ba-pipeline/CONVENTIONS.md`. Áp dụng nguyên ID/frontmatter/cấu trúc
thư mục mô tả trong đó.

## Workflow

1. **Chọn phạm vi BRD cần xử lý.** Nếu user chỉ định feature folder hoặc file BRD cụ thể,
   dùng đúng cái đó. Nếu không, đọc `02-BRD(Bussiness Requirement Document)/_INDEX.md`, liệt
   kê các feature folder, và với mỗi feature kiểm tra xem đã có folder tương ứng trong
   `03-ADR (Architecutre Decission Record)/` chưa / các BRD nào trong đó chưa được tham chiếu
   bởi `source_brd` của ADR nào — hỏi user muốn xử lý feature nào.

2. **Đọc toàn bộ BRD trong feature folder đó**, không chỉ một file — các file BRD con trong
   cùng feature (vd `match.md`, `tournament.md`, `leaderboard-profile.md` của `caro-game`)
   thường chia sẻ quyết định kiến trúc (vd cùng cần realtime, cùng cần một data model cho
   user/game session), nên phải có context đầy đủ của cả feature trước khi đề xuất phương án.
   Nếu feature này phụ thuộc feature khác (mục Dependencies trong BRD, vd `caro-game` phụ
   thuộc `account-social`), đọc nhanh BRD/ADR đã có của feature phụ thuộc đó để quyết định
   không mâu thuẫn (vd nếu `account-social` đã chọn auth theo JWT thì `caro-game` không tự
   chọn cơ chế khác).

3. **Xác định các "decision point"** — chỉ liệt kê những gì thực sự bắt nguồn từ một FR/NFR/
   Business Rule cụ thể trong BRD đang đọc, không áp đặt sẵn một danh sách chuẩn cho mọi
   feature. Một số nhóm quyết định thường gặp, dùng làm gợi ý rà soát (rà từng nhóm rồi bỏ
   qua nhóm không liên quan, đừng tạo ADR rỗng cho nhóm không áp dụng):
   - **Data model & lưu trữ**: cấu trúc dữ liệu chính, loại datastore phù hợp (vd cần truy vấn
     ranking/leaderboard hiệu quả, cần lưu lịch sử nước đi).
   - **Giao tiếp realtime**: cách cập nhật trạng thái sống cho người chơi/người xem/chat/danh
     sách phòng (WebSocket, SSE, long-poll...), khi BRD có yêu cầu "realtime" hoặc "ngay khi".
   - **Concurrency & consistency**: các điểm có thể race condition theo Business Rule (vd 2
     người cùng bấm "start" trong 15s, matchmaking ghép cặp tournament đồng thời).
   - **Service/module boundary**: ranh giới module, cách feature này giao tiếp với feature đã
     có ADR khác (đặc biệt khi nhiều feature cùng dùng chung dữ liệu, vd account dùng cho mọi
     game).
   - **Authentication/Authorization**: cách xác thực/uỷ quyền nếu BRD có yêu cầu phân quyền
     theo actor (player/viewer/admin/tạo-tournament...).
   - **Scaling/Availability**: chỉ khi NFR trong BRD có nêu cụ thể (vd số lượng người xem
     đồng thời, độ trễ chấp nhận được).
   Nếu rà hết các nhóm trên mà một feature chỉ có 1-2 decision point thực sự đáng ghi ADR, vậy
   là đủ — không cần ép đủ số lượng.

4. **Trình bày từng decision point cho user**, theo thứ tự decision có ảnh hưởng/rủi ro cao
   hơn trước. Với mỗi decision point: nêu rõ FR/NFR/Business Rule nào trong BRD dẫn tới việc
   phải quyết định, rồi đưa 2-3 phương án thực tế kèm ưu/nhược điểm ngắn gọn **gắn với chính
   yêu cầu đó** (không nói chung kiểu "X nhanh hơn Y" mà không liên hệ ngữ cảnh). Dùng
   `AskUserQuestion` để user chọn — luôn cho phép user nêu phương án khác ngoài danh sách đề
   xuất (đó là việc `AskUserQuestion` tự hỗ trợ qua lựa chọn "Khác"). Hỏi theo từng decision
   point hoặc nhóm 2-4 câu liên quan, không dồn hết mọi quyết định của cả feature vào một lượt
   hỏi nếu số lượng lớn.

5. **Lấy ID.** Với feature folder `03-ADR (Architecutre Decission Record)/<feature-slug>/`:
   nếu chưa tồn tại, tạo folder + `_INDEX.md` mới. Nếu đã có, đọc `_INDEX.md` để lấy `NNN`
   tiếp theo (tăng riêng theo feature, độc lập với BRD).

6. **Ghi một file ADR cho mỗi decision point đã được user quyết định** — không dồn nhiều
   quyết định không liên quan vào một file, nhưng các quyết định cùng nằm trong một
   trade-off lớn (vd chọn datastore kéo theo chọn luôn cách đánh index cho leaderboard) có thể
   ghi trong cùng một ADR nếu tách ra sẽ rời rạc khó hiểu — dùng phán đoán, ưu tiên "1 ADR dễ
   đọc độc lập" hơn là tách máy móc.

   ```markdown
   ---
   id: ADR-<FEATURE>-NNN
   title: <tên quyết định, dạng hành động, vd "Dùng WebSocket cho cập nhật ván cờ realtime">
   status: accepted
   source_brd: ["[[BRD-<FEATURE>-NNN]]"]
   created: <ngày hôm nay>
   tags: [adr, <feature-slug>]
   ---

   # <Title>

   ## Status
   Accepted (<ngày hôm nay>)

   ## Context
   <!-- vấn đề/yêu cầu từ BRD dẫn tới phải quyết định, trích rõ FR/NFR/Business Rule nào -->

   ## Decision Drivers
   <!-- tiêu chí ảnh hưởng quyết định: hiệu năng, chi phí, độ phức tạp vận hành, thời gian... -->

   ## Các phương án đã xét (Options Considered)
   ### Option A — ...
   Ưu điểm / Nhược điểm
   ### Option B — ...
   Ưu điểm / Nhược điểm

   ## Quyết định (Decision)
   <!-- chọn option nào, vì sao, theo đúng lựa chọn user đã chọn ở bước 4 -->

   ## Hệ quả (Consequences)
   <!-- tích cực / tiêu cực / rủi ro cần theo dõi sau này -->

   ## Liên quan (Related)
   <!-- [[ADR-...]] khác nếu phụ thuộc hoặc supersede nhau -->
   ```

   Nếu một decision point chưa đủ thông tin để chốt dứt điểm (user muốn để ngỏ, cần thử
   nghiệm thêm), vẫn tạo file nhưng đặt `status: proposed` thay vì `accepted`, và nêu rõ trong
   Decision điều kiện để chuyển sang accepted.

7. **Cập nhật `_INDEX.md`** của feature folder và
   `03-ADR (Architecutre Decission Record)/_INDEX.md` tổng.

8. **Cập nhật các BRD liên quan**: thêm/cập nhật heading `## ADR liên quan` trong từng file
   BRD đã tham chiếu, liệt kê `[[ADR-...]]` tương ứng (liên kết hai chiều).

9. **Báo cáo**: danh sách ADR đã ghi nhận (status accepted/proposed), quyết định chính của mỗi
   ADR, và những decision point nào còn để ngỏ do thiếu thông tin hoặc user muốn cân nhắc
   thêm trước khi đưa vào Speckit ở `04-Projects`.
