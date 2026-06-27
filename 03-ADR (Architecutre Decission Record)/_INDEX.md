# Index — 03-ADR

Mục lục các feature folder (nghiệp vụ). Mỗi feature có `_INDEX.md` riêng bên trong folder của
nó, 1 ADR ứng với đúng 1 BRD cùng số NNN. Skill `brd-to-adr` đọc và cập nhật file này. ADR
`accepted` được tổng hợp vào [[_ADR-TONG]] — file duy nhất dùng làm input cho
`/speckit.constitution`. Xem quy ước tại `.claude/skills/_shared-ba-pipeline/CONVENTIONS.md`.

| Feature | Slug | Số ADR | Mô tả |
|---|---|---|---|
| Account & Social | [[account-social/_INDEX|account-social]] | 1 accepted, 1 rejected | Modular monolith + JWT (từ BRD-001); BRD-002 không có quyết định technology-layer |
| Trust & Report | [[trust-report/_INDEX|trust-report]] | 2 accepted | Admin-tunable config pattern (BRD-001); atomic update cho counter đồng thời (BRD-002) |
| Notification | [[notification/_INDEX|notification]] | 1 accepted | Event-driven giữa module + WebSocket/SSE realtime (BRD-001) |
| Caro Game | [[caro-game/_INDEX|caro-game]] | 3 accepted, 1 rejected | Server-authoritative timer (BRD-002); DB row-lock matchmaking (BRD-003); leaderboard query (BRD-004) |
