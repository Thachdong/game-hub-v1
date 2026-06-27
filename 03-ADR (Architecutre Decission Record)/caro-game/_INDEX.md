# Index — caro-game

Mục lục các ADR trong feature `caro-game`. Mỗi ADR ứng với đúng 1 BRD cùng số NNN (xem
`.claude/skills/brd-to-adr/SKILL.md`). Xem quy ước tại
`.claude/skills/_shared-ba-pipeline/CONVENTIONS.md`.

| ID | Title | Status | File | Source |
|---|---|---|---|---|
| ADR-CARO-GAME-001 | Không có quyết định technology-layer mới (đã bao phủ bởi ADR khác) | rejected | [[game-admin-config]] | [[BRD-CARO-GAME-001]] |
| ADR-CARO-GAME-002 | Server-authoritative timer cho hành động giới hạn thời gian | accepted | [[match]] | [[BRD-CARO-GAME-002]] |
| ADR-CARO-GAME-003 | DB row-lock cho claim player trong matchmaking đồng thời | accepted | [[tournament]] | [[BRD-CARO-GAME-003]] |
| ADR-CARO-GAME-004 | Query trực tiếp DB có index cho leaderboard top-N | accepted | [[leaderboard-profile]] | [[BRD-CARO-GAME-004]] |
