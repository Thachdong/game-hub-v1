# Quy ước chung — pipeline 00-Inbox → 01-Ideas → 02-BRD → 03-ADR → Speckit

File này được 3 skill `clarify-idea`, `idea-to-brd`, `brd-to-adr` đọc trước khi chạy.
Đây không phải là một skill (không có SKILL.md trong thư mục này) — chỉ là tài liệu quy ước
dùng chung để 3 skill không lệch nhau về ID, frontmatter, cấu trúc thư mục.

## Cấu trúc thư mục

- `00-Inbox/` — ý tưởng thô, ghi tự do, không cấu trúc. Không bị skill chỉnh sửa nội dung gốc,
  chỉ được thêm một callout đánh dấu đã xử lý (xem mục "Trạng thái xử lý ở 00-Inbox").
- `01-Ideas/` — mỗi ý tưởng đã làm rõ = 1 file `<slug>.md` (kebab-case, không dấu).
- `02-BRD(Bussiness Requirement Document)/` — mỗi nghiệp vụ (business domain) = 1 folder con
  `<feature-slug>/`, chứa nhiều file BRD nhỏ theo nhóm chức năng trong domain đó.
- `03-ADR (Architecutre Decission Record)/` — mỗi nghiệp vụ = 1 folder con `<feature-slug>/`
  cùng tên với folder tương ứng trong 02-BRD, chứa **đúng 1 file ADR cho mỗi 1 file BRD** (cùng
  slug tên file với BRD nguồn, ID dùng chung số NNN — xem `brd-to-adr/SKILL.md`). ADR chỉ ghi
  quyết định technology-layer (tech stack, architecture pattern, package, coding convention,
  testing, security/infra) — không ghi business content/quyết định hẹp cho riêng 1 feature
  (loại đó để `/speckit.plan` xử lý). Các ADR `accepted` được tổng hợp vào
  `03-ADR (...)/_ADR-TONG.md` — file duy nhất, là input trực tiếp cho `/speckit.constitution`.
- `04-Projects/` — nơi Speckit sinh spec/code từ BRD + ADR. Ngoài phạm vi 3 skill này.

Tên folder feature (`<feature-slug>`) phải giống nhau giữa 02-BRD và 03-ADR để dễ đối chiếu.

## Mã định danh (ID) và traceability

- `IDEA-NNN` — ý tưởng trong 01-Ideas. NNN 3 chữ số, tăng dần toàn vault.
- `BRD-<FEATURE>-NNN` — `<FEATURE>` là slug viết HOA không dấu của feature folder
  (vd `caro-game` → `CARO-GAME`, hoặc rút gọn `CARO` nếu không gây nhầm lẫn). NNN tăng dần
  riêng theo từng feature.
- `ADR-<FEATURE>-NNN` — cùng quy tắc, tăng dần riêng theo từng feature.

Số tiếp theo luôn lấy từ file `_INDEX.md` của đúng thư mục (xem mục kế tiếp) — không tự đoán,
không suy ra từ số file đang có (tránh trùng ID khi có file bị xoá/đổi tên).

## File `_INDEX.md`

Mỗi thư mục sau có một file `_INDEX.md` dạng bảng markdown, là nguồn sự thật duy nhất cho ID
tiếp theo và là trang mục lục khi mở trong Obsidian:

- `01-Ideas/_INDEX.md`
- `02-BRD(Bussiness Requirement Document)/_INDEX.md` (mục lục feature folder)
- `02-BRD(Bussiness Requirement Document)/<feature-slug>/_INDEX.md` (mục lục BRD trong feature đó)
- `03-ADR (Architecutre Decission Record)/_INDEX.md` (mục lục feature folder)
- `03-ADR (Architecutre Decission Record)/<feature-slug>/_INDEX.md` (mục lục ADR trong feature đó)

Định dạng bảng:

```
| ID | Title | Status | File | Source |
|---|---|---|---|---|
| IDEA-001 | Game platform đa game | clarified | [[game-platform]] | [[00-Inbox/idea.md]] |
```

Quy trình bắt buộc khi tạo file mới: đọc `_INDEX.md` liên quan → lấy số NNN tiếp theo →
tạo file → append một dòng mới vào `_INDEX.md`. Nếu `_INDEX.md` chưa tồn tại (feature mới),
tạo file với header bảng rồi thêm dòng đầu tiên.

## Frontmatter chuẩn (YAML, tương thích Obsidian)

### `01-Ideas/*.md`

```yaml
---
id: IDEA-001
title: <tên ý tưởng>
status: draft | clarified
source: "[[00-Inbox/idea.md]]"
created: YYYY-MM-DD
tags: [idea]
---
```

### `02-BRD(...)/<feature-slug>/*.md`

```yaml
---
id: BRD-CARO-001
title: <tên nhóm chức năng>
feature: <feature-slug>
status: draft | reviewed | approved
source_idea: "[[IDEA-001]]"
created: YYYY-MM-DD
tags: [brd, <feature-slug>]
---
```

### `03-ADR (...)/<feature-slug>/*.md`

```yaml
---
id: ADR-CARO-001
title: <tên quyết định, dạng hành động>
status: proposed | accepted | rejected | superseded
source_brd: ["[[BRD-CARO-001]]"]
created: YYYY-MM-DD
tags: [adr, <feature-slug>]
---
```

`status` dùng để biết file đã sẵn sàng cho bước kế tiếp hay chưa — skill ở bước sau nên ưu
tiên các file có status đủ "chín" (`clarified`, `approved`...) và hỏi user nếu định xử lý
một file còn `draft`.

## Liên kết hai chiều (Obsidian backlink)

Sau khi tạo file ở bước sau, luôn quay lại cập nhật file ở bước trước bằng một heading liên
kết ngược, ví dụ trong idea thêm `## BRD liên quan` liệt kê `[[BRD-CARO-001]]`, trong BRD
thêm `## ADR liên quan` liệt kê `[[ADR-CARO-001]]`. Mục đích: mở 1 file trong Obsidian là
thấy được toàn bộ truy vết xuôi/ngược qua graph view.

## Trạng thái xử lý ở 00-Inbox

Sau khi một ý tưởng trong 00-Inbox đã được ghi đầy đủ vào 01-Ideas, thêm vào **đầu** file gốc
một callout (giữ nguyên phần nội dung thô phía dưới, không xoá, không di chuyển file):

```
> [!done] Đã xử lý → [[IDEA-001]]
```

Nếu một file Inbox chứa nhiều ý tưởng độc lập (ví dụ vừa có ý tưởng platform vừa có ý tưởng
game con), mỗi ý tưởng tách ra một `IDEA-NNN` riêng và callout liệt kê đủ các ID, hoặc đặt
callout ngay phía trên đoạn nội dung tương ứng nếu cần phân biệt theo từng đoạn trong cùng
file.

## Ngôn ngữ

Toàn bộ nội dung sinh ra (Idea, BRD, ADR) viết bằng tiếng Việt. Giữ nguyên thuật ngữ kỹ
thuật/nghiệp vụ tiếng Anh khi đó là cách gọi tự nhiên trong ngành (vd `elo`, `realtime`,
`matchmaking`, `WebSocket`) thay vì dịch gượng.
