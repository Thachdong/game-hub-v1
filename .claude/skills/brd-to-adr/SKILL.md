---
name: brd-to-adr
description: Phân tích BRD trong 02-BRD của một nghiệp vụ theo vai trò Tech Lead để rút ra quyết định technology-layer (tech stack, architecture pattern, package, coding convention, testing, security/infra) — không phải business logic. Ghi đúng 1 ADR cho mỗi BRD vào 03-ADR, rồi tổng hợp các ADR này thành 1 file ADR tổng (03-ADR/_ADR-TONG.md) làm input trực tiếp cho lệnh /speckit.constitution. Dùng khi user nói "tạo ADR", "ra quyết định kiến trúc", "thiết kế hệ thống từ BRD", "architecture decision record", "constitution".
user-invocable: true
---

# brd-to-adr — 02-BRD → 03-ADR → ADR tổng → constitution

## Bản chất ADR trong vault này

ADR ở đây tồn tại với **đúng một mục đích**: làm input cho `/speckit.constitution`. Ba quy tắc
sau chi phối toàn bộ skill, áp dụng nghiêm ngặt hơn nguyên tắc ADR thông thường:

- **Rule 1 — Chỉ chứa thứ KHÔNG THAY ĐỔI theo feature.** Phạm vi hợp lệ: tech stack/runtime
  version, software architecture pattern, package được phép dùng/bị cấm, coding convention,
  testing approach, security/infra rule. **Không** chứa business content từ BRD — không feature
  list, không user story, không business logic, không thiết kế schema cho một entity nghiệp vụ
  cụ thể (vd một bảng riêng cho một loại dữ liệu chỉ tồn tại vì 1 feature cụ thể yêu cầu — đó là
  business/domain modeling, không phải technology layer, dù trông có vẻ "kiến trúc").
- **Rule 2 — Nguồn gốc từ ADR (đọc BRD), không phải copy BRD.** Pipeline:
  `BRD → đọc với vai trò Tech Lead → quyết định kỹ thuật → ADR → ADR tổng → constitution.md`.
  BRD là nguyên liệu để suy ra quyết định kỹ thuật; nội dung BRD (FR/AC/business rule) **không**
  được chép thẳng vào ADR tổng/constitution — ADR (file riêng theo từng BRD) được phép trích dẫn
  ngắn FR/NFR nào đã kích hoạt quyết định (để truy vết), nhưng câu quyết định cuối cùng phải đọc
  được độc lập, không cần biết BRD gốc nói gì.
- **Rule 3 — Là guardrail tự động, không phải tài liệu để đọc.** Output cuối (ADR tổng) phải là
  các câu khẳng định ngắn, declarative, kiểu constraint mà mọi lệnh Speckit sau (`/specify`,
  `/plan`, `/tasks`) đọc ngầm để không vi phạm. Một câu tóm gọn: constitution nói **"build theo
  chuẩn nào"**, không nói "build cái gì".

Vì vậy: nếu một decision point chỉ tồn tại *vì có đúng 1 business requirement cụ thể yêu cầu*
(tức nếu xoá feature đó đi thì quyết định cũng không còn lý do tồn tại), nó **không** đạt Rule 1
dù có vẻ "kiến trúc" — loại đó để `/speckit.plan` xử lý trực tiếp khi implement feature, không
ghi ADR ở đây.

## Cấu trúc 3 tầng

1. **`02-BRD(...)/<feature>/<brd>.md`** — business content, giữ nguyên, skill này không sửa nội
   dung nghiệp vụ.
2. **`03-ADR(...)/<feature>/<cùng-slug-với-brd>.md`** — **đúng 1 file ADR cho mỗi 1 file BRD**
   (`ADR-<FEATURE>-NNN` ứng với `BRD-<FEATURE>-NNN`, cùng số NNN, không đánh số độc lập). Một
   BRD có thể sinh ra 0, 1, hoặc nhiều quyết định technology-layer — nếu nhiều, viết nhiều
   section `## Quyết định N` trong cùng 1 file, không tách nhiều file. Nếu rà hết BRD mà không
   có quyết định nào đạt Rule 1, vẫn tạo file với `status: rejected` và ghi rõ lý do (đã rà,
   không có gì thuộc technology layer) — để biết BRD đó đã được audit, không phải bị bỏ sót.
3. **`03-ADR(...)/_ADR-TONG.md`** — file tổng hợp **duy nhất cho toàn project**, gom mọi quyết
   định `accepted` từ tầng 2 thành các nguyên tắc declarative (đúng style Core Principle của
   `/speckit.constitution`), đã lược bỏ hết tham chiếu FR/AC/BRD cụ thể. Đây là file đưa thẳng
   vào `/speckit.constitution`. Cập nhật (amend) file này mỗi lần có ADR mới ở tầng 2, không chờ
   xử lý hết toàn bộ vault rồi mới viết một lần.

Trước khi làm, đọc file quy ước chung `.claude/skills/_shared-ba-pipeline/CONVENTIONS.md` và áp
dụng nguyên ID/frontmatter/cấu trúc thư mục mô tả trong đó (trừ phần đánh số ADR độc lập theo
feature — ở skill này, số NNN của ADR luôn khớp số NNN của BRD nguồn).

## Workflow

1. **Chọn phạm vi BRD cần xử lý.** Nếu user chỉ định feature folder hoặc file BRD cụ thể, dùng
   đúng cái đó. Nếu không, đọc `02-BRD(Bussiness Requirement Document)/_INDEX.md`, liệt kê các
   feature folder, và với mỗi BRD kiểm tra đã có file ADR cùng slug trong
   `03-ADR (Architecutre Decission Record)/<feature>/` chưa — hỏi user muốn xử lý BRD/feature
   nào tiếp.

2. **Đọc BRD đang xử lý với vai trò Tech Lead**, không phải Business Analyst: mục tiêu không
   phải hiểu "feature làm gì" (đã có trong BRD) mà là "feature này có ép buộc một quyết định
   technology-layer nào mới không, hoặc có mâu thuẫn với quyết định đã chốt ở ADR khác không".
   Nếu BRD/feature này phụ thuộc feature khác (mục Dependencies), đọc nhanh ADR tổng hiện có để
   không chọn lại cái đã chốt (vd đã chọn JWT thì không tự chọn cơ chế khác).

3. **Lọc decision point qua đúng 2 phép kiểm tra của Rule 1**, theo thứ tự:
   - **Phép kiểm tra A (tính chất)**: quyết định có thuộc 1 trong các nhóm sau không — tech
     stack/runtime, software architecture pattern (service boundary, layering...), package được
     phép dùng/bị cấm, coding convention, testing approach, security/infra (auth, rate limit,
     encryption...)? Nếu không thuộc nhóm nào, loại — đó là business/domain modeling (vd thiết
     kế schema riêng cho 1 loại entity nghiệp vụ), không phải technology layer.
   - **Phép kiểm tra B (tính bất biến theo feature)**: nếu feature/BRD này không tồn tại, quyết
     định này còn cần thiết không? Nếu quyết định *chỉ* sinh ra để phục vụ đúng yêu cầu của BRD
     này (xoá BRD thì quyết định cũng mất lý do tồn tại), loại — nó là business content trong lốt
     kiến trúc, để `/speckit.plan` xử lý.
   Chỉ giữ lại decision point qua được cả 2 phép kiểm tra. Gợi ý nhóm để rà (không áp đặt, bỏ qua
   nhóm không liên quan): data store/tech stack, realtime transport, service/module boundary,
   authentication/authorization mechanism, coding/testing convention, security/infra constraint.
   Nếu rà hết mà không có decision point nào qua được cả 2 phép kiểm tra, đó là kết quả hợp lệ
   (xem bước 6 — vẫn tạo 1 file ADR, status rejected, không phải lỗi).

4. **Trình bày từng decision point hợp lệ cho user**, theo thứ tự ảnh hưởng/rủi ro cao hơn
   trước. Nêu rõ FR/NFR nào kích hoạt việc phải quyết định, đưa 2-3 phương án thực tế kèm ưu/
   nhược điểm gắn với chính ngữ cảnh đó. Dùng `AskUserQuestion`, luôn cho phép "Khác". Hỏi theo
   nhóm 2-4 câu liên quan, không dồn hết vào một lượt nếu số lượng lớn.

5. **Lấy ID.** ID của ADR luôn dùng đúng số NNN của BRD nguồn: `BRD-<FEATURE>-NNN` →
   `ADR-<FEATURE>-NNN`. Không đánh số độc lập theo feature như ADR thông thường — mục đích là
   giữ 1 BRD ↔ 1 ADR rõ ràng, nhìn số là biết file nào tương ứng file nào.

6. **Ghi đúng 1 file ADR cho BRD đang xử lý**, đặt cùng slug tên file với BRD nguồn (vd
   `02-BRD.../account-social/auth-account.md` → `03-ADR.../account-social/auth-account.md`):

   ```markdown
   ---
   id: ADR-<FEATURE>-NNN
   title: <tóm tắt các quyết định technology-layer của BRD này, dạng hành động>
   status: accepted | rejected
   source_brd: ["[[BRD-<FEATURE>-NNN]]"]
   created: <ngày hôm nay>
   tags: [adr, <feature-slug>]
   ---

   # <Title>

   ## Status
   Accepted | Rejected (<ngày hôm nay>)
   <!-- nếu rejected: 1 câu giải thích đã rà BRD này, không có decision point nào qua được
        Rule 1 (phép kiểm tra A/B), không phải bị bỏ sót -->

   ## Quyết định 1 — <tên ngắn>
   ### Context
   <!-- FR/NFR nào kích hoạt, trích ngắn không copy nguyên văn BRD -->
   ### Decision Drivers
   ### Các phương án đã xét (Options Considered)
   ### Quyết định (Decision)
   <!-- câu quyết định phải tự đứng vững, không cần đọc lại BRD mới hiểu -->
   ### Hệ quả (Consequences)

   ## Quyết định 2 — <tên ngắn>
   <!-- lặp lại cấu trúc trên nếu BRD này có nhiều hơn 1 quyết định technology-layer -->

   ## Loại khỏi phạm vi (nếu có)
   <!-- decision point tìm được nhưng không qua phép kiểm tra A hoặc B — ghi 1-2 câu lý do để
        không bị hiểu nhầm là bỏ sót, không cần viết đầy đủ Options Considered -->

   ## Liên quan (Related)
   <!-- [[ADR-...]] khác nếu phụ thuộc hoặc supersede nhau -->
   ```

   Nếu một quyết định chưa đủ thông tin chốt dứt điểm, vẫn ghi nhưng đặt trạng thái phụ "để ngỏ"
   ngay trong section đó (frontmatter `status` ở mức file vẫn là `accepted` nếu có ít nhất 1
   quyết định đã chốt trong file).

7. **Cập nhật `_INDEX.md`** của feature folder và `03-ADR.../_INDEX.md` tổng (chỉ liệt kê feature
   + số ADR accepted/rejected, không cần liệt kê lại từng quyết định con).

8. **Cập nhật BRD liên quan**: thêm/cập nhật `## ADR liên quan` trong file BRD, liệt kê đúng 1
   `[[ADR-<FEATURE>-NNN]]` (liên kết hai chiều 1-1).

9. **Cập nhật `03-ADR(...)/_ADR-TONG.md`** (tạo mới nếu chưa có): với mỗi quyết định `accepted`
   vừa ghi ở bước 6, thêm hoặc amend 1 Core Principle vào file này — câu nguyên tắc phải:
   - Declarative, đọc độc lập, không nhắc FR/AC/tên BRD/tên feature cụ thể nào.
   - Có rationale ngắn (1 câu) nếu không hiển nhiên.
   - Nhóm theo loại (Architecture, Authentication/Security, Data Access, Coding Convention,
     Testing, Infra...) giống cấu trúc Core Principles của `/speckit.constitution`.
   Nếu một quyết định mới mâu thuẫn với nguyên tắc đã có trong `_ADR-TONG.md`, dừng lại, báo cho
   user — không tự âm thầm ghi đè.

10. **Báo cáo**: BRD nào vừa được audit, ADR nào accepted/rejected, nguyên tắc nào vừa thêm/amend
    vào `_ADR-TONG.md`, và nhắc rằng `_ADR-TONG.md` là file cần copy nội dung khi chạy
    `/speckit.constitution` (không phải toàn bộ `03-ADR`).
