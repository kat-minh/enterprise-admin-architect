# Enterprise Admin Architect

[English](README.md) · **Tiếng Việt**

Bộ skill cho **Claude Code** để dựng một **hệ thống admin / back-office / CMS chuẩn enterprise** cho website *đã có sẵn* - thay vì một dashboard chung chung (sidebar + 4 thẻ thống kê + vài bảng CRUD).

> Website chính phục vụ người dùng. **Admin vận hành doanh nghiệp đằng sau website đó.**

Skill buộc Claude làm đúng thứ tự: **phân tích website trước → thiết kế kiến trúc admin → dựng design system → code từng module → kiểm thử thật**, có các điểm dừng để bạn duyệt.

## Điểm khác biệt

| Vấn đề thường gặp | Skill xử lý thế nào |
|---|---|
| AI nhảy vào code dashboard CRUD ngay | 3 cổng duyệt (gate); cấm viết code admin trước khi module inventory được duyệt |
| Module "bịa" ra, không liên quan nghiệp vụ | Mỗi module có nhãn bằng chứng: `confirmed` / `implied` / `proposed` (cần bạn duyệt) |
| Module bắt buộc và module đặc thù lẫn lộn | 3 lớp: **core** (web nào cũng phải có) → **foundation** (có điều kiện) → **domain** (sinh từ nghiệp vụ thật) |
| Dashboard toàn số liệu giả | "Real or documented": không mock, không fake success; thiếu backend thì ghi vào gap list |
| Phân quyền chỉ là ẩn nút | RBAC kiểm tra ở server, có test chứng minh API trả 403 cho từng role |
| Nói "xong" khi mới render được trang | `done` chỉ khi workflow chạy thật + có bằng chứng; validator đối chiếu docs với thực tế |
| UI mỗi trang một kiểu | Tokens trước, component dùng chung, spec cho table/form/detail/dashboard, tái dùng UI kit sẵn có (Ant Design, shadcn…) |
| Muốn xem UI trước khi có backend | **Chế độ FE-first**: duyệt UI trên mock layer có kiểm soát, rồi mới build backend theo API contract đã chốt |

## Bộ skill gồm gì

| Skill | Vai trò | Output |
|---|---|---|
| `enterprise-admin-architect` | **Điều phối** (gọi cái này): nguyên tắc, các gate, resume | - |
| `admin-discovery` | Phase 1: quét code, domain map, module inventory, backend gaps | `product-discovery.md`, `business-domain-map.md`, `module-inventory.md` |
| `admin-information-architecture` | Phase 2-3: sidebar, route, drawer/page/modal, roles & permission matrix | `information-architecture.md`, `permission-matrix.md` |
| `admin-design-system` | Phase 4: tokens, app shell, table/form/detail/dashboard, a11y, locale | `design-system.md` + shell + module mẫu |
| `admin-module-builder` | Phase 5-7: spec → backend → UI → RBAC → audit → bảo mật | `module-specifications/*.md`, code, `implementation-status.md` |
| `admin-qa-gate` | Phase 8: validator, test permission/workflow/state, báo cáo trung thực | `qa-report.md` |

Kèm theo:
- `admin-discovery/scripts/scan-project.mjs` - quét project (stack, route, API, model, enum/status, admin có sẵn, role, form công khai, env **chỉ lấy tên**). Không cần cài dependency.
- `admin-qa-gate/scripts/validate-admin-docs.mjs` - kiểm tra docs nhất quán (module ↔ permission ↔ route ↔ spec ↔ bằng chứng verify).
- `admin-discovery/references/domains/` - 14 playbook domain (e-commerce, travel/booking, education, corporate, news, SaaS, marketplace, phòng khám/đặt lịch, bất động sản, tuyển dụng, F&B, sự kiện/vé, cộng đồng/UGC, fintech/KYC) + playbook cho domain lạ (vd. xét nghiệm DNA).
- `examples/e-commerce/` - ví dụ `docs/admin` đầy đủ, qua được validator.

## Cài đặt

**Cách 1 - Plugin (khuyên dùng):**
```
/plugin marketplace add kat-minh/enterprise-admin-architect
/plugin install enterprise-admin-architect@enterprise-admin-architect
```
(Repo private vẫn cài được nếu git/GitHub trên máy bạn có quyền truy cập.)

**Cách 2 - Copy thủ công** (copy **cả 6 thư mục** trong `skills/`, vì các skill dùng chung file của nhau):
```powershell
# Windows - cài cho 1 project
Copy-Item -Recurse .\skills\* <your-project>\.claude\skills\
# hoặc cài cho mọi project
Copy-Item -Recurse .\skills\* $HOME\.claude\skills\
```
```bash
# macOS / Linux
cp -r skills/* <your-project>/.claude/skills/     # hoặc ~/.claude/skills/
```

Yêu cầu: Node ≥ 18 để chạy 2 script (không cần `npm install`).

## Cách dùng (3 phiên làm việc)

Sau khi code xong website chính, mở Claude Code trong project và gọi:

```
/enterprise-admin-architect
```

| Phiên | Làm gì | Gate bạn duyệt |
|---|---|---|
| **1. Discovery & Architecture** | Đọc code + route + DB, lập domain map, danh sách module (core/foundation/domain, P0-P2), sidebar, roles, permission matrix, backend gaps, ≤ 7 câu hỏi kèm đề xuất mặc định | **Gate 1**: module nào build, role nào, thiếu backend gì, chọn delivery mode |
| **2. UI/UX & Design System** | Tokens, app shell, component dùng chung, dựng **1 module mẫu hoàn chỉnh** | **Gate 2**: duyệt look & feel, pattern tương tác |
| **3. Implement & QA** | Build từng module (spec → API → UI → quyền → audit), kiểm thử sau mỗi module, báo cáo cuối | **Gate 3**: qa-report + danh sách việc còn lại |

### Chế độ FE-first (xem giao diện trước, duyệt xong mới làm backend)

Ở Gate 1 bạn chọn **delivery mode**:

| Mode | Khi nào | Luồng |
|---|---|---|
| `full-stack` | Repo đã có API/DB cho admin, hoặc backend nhỏ | Build từng module với API thật |
| `fe-first` | Muốn **xem và duyệt UI trước**, hoặc backend P0 còn thiếu nhiều | Viết **API contract** → build toàn bộ UI trên **mock layer có kiểm soát** → **Gate 2b (FE Preview)**: bạn click thử và góp ý → đóng băng contract → build backend theo contract → đổi mock → API thật từng module → QA |

Mock layer giữ trung thực bằng cách nào (chi tiết: `skills/admin-module-builder/references/fe-first-mock-layer.md`):
- UI chỉ gọi **service interface**; mock và API thật cùng cài interface đó → đổi nguồn dữ liệu chỉ là 1 dòng, không phải làm lại UI.
- Mock **giả lập như server thật**: phân trang/lọc/sắp xếp server-side, độ trễ, lỗi 422/403/409, state machine.
- Mọi trang đều có banner **"Prototype data"**; role switcher để xem admin dưới góc nhìn từng role; có nút bật các trạng thái empty/error/slow/forbidden.
- **Chặn production** bằng biến môi trường triển khai (không dùng `NODE_ENV`, vì preview trên Vercel cũng chạy `NODE_ENV=production`) + check bundle; preview phải có bảo vệ truy cập và `noindex`.
- Module chạy trên mock có trạng thái `prototype` và **không bao giờ được là `done`**. Validator báo lỗi nếu module `done` mà vẫn dùng mock, hoặc module `prototype` mà thiếu `api-contract.md`.

### Câu nói tự nhiên kích hoạt đúng skill
- "Phân tích web này rồi liệt kê module admin cần có" → `admin-discovery`
- "Thiết kế lại menu và phân quyền cho admin" → `admin-information-architecture`
- "Implement module Orders trong admin" → `admin-module-builder`
- "QA lại admin, kiểm tra quyền" → `admin-qa-gate`
- "Làm luôn, đừng hỏi nhiều" → vẫn phân tích gọn và ghi rõ assumptions; **không bỏ qua** phân quyền ở server, audit log, verify.

Chạy script thủ công:
```bash
node skills/admin-discovery/scripts/scan-project.mjs <project> --md
node skills/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage build
```

## Tài liệu sinh ra trong project của bạn

```
docs/admin/
  product-discovery.md   business-domain-map.md   module-inventory.md
  information-architecture.md   permission-matrix.md   design-system.md
  module-specifications/<module-id>.md
  api-contract.md            (bắt buộc ở chế độ fe-first)
  implementation-status.md   qa-report.md
```
`module-inventory.md` là **nguồn sự thật duy nhất** về trạng thái module; `implementation-status.md` ghi bằng chứng verify.

**Ngôn ngữ:** Claude trả lời và viết phần nội dung tự do bằng ngôn ngữ của bạn, nhưng giữ nguyên tiếng Anh cho tiêu đề mục, tiêu đề cột bảng và giá trị enum (`core`, `P0`, `in-progress`…) đúng như template - vì validator kiểm tra những chỗ này.

## Ba lớp module

- **core** (bắt buộc cho mọi web): auth & session, RBAC, dashboard theo nghiệp vụ, admin accounts, audit log, settings, my account/security.
- **foundation** (có điều kiện, loại bỏ phải ghi lý do): users/customers, notifications, media, import/export, trash, **site content** (menu/banner/trang tĩnh/SEO/redirect), **leads inbox** (form liên hệ), templates, jobs monitor, search/command, localization…
- **domain** (sinh từ website): Orders, Bookings, Courses, Articles, Organizations… hoặc module riêng cho nghiệp vụ lạ.

## Trạng thái & hạn chế đã biết

- **Chưa test end-to-end trên project thật.** Đã test: scanner trên fixture giả lập (Next.js/Prisma/Drizzle/SQL/Express/Mongoose/TypeORM/NestJS/Django/Laravel/Remix), validator trên docs mẫu và docs cố tình phá hỏng, và `claude plugin validate`.
- Scanner dựa trên regex: nó là **bản đồ, không phải sự thật**. Framework lạ/monorepo phức tạp có thể bị sót; skill được dặn phải đọc file để xác nhận.
- Các gate là chỉ dẫn cho Claude, không phải khoá cứng.
- Phần stack adapters (Ant Design, shadcn, MUI…) nêu API điển hình; hãy đối chiếu với phiên bản bạn đang cài.
- Đường dẫn script giữa các skill giả định các thư mục `admin-*` nằm cạnh nhau (đúng với cả 2 cách cài).

Phản hồi từ những lần chạy thật là thứ quý nhất - nhất là phần nhận diện domain và cách gom nhóm sidebar.

## Mở rộng

- Thêm domain: tạo `skills/admin-discovery/references/domains/<ten>.md` theo cấu trúc các file sẵn có và thêm một dòng vào `_index.md`.
- Thêm stack UI: bổ sung mục vào `skills/admin-design-system/references/stack-adapters.md`.
- Mỗi `SKILL.md` giữ ngắn; chi tiết nằm trong `references/` (chỉ nạp khi cần).

## So với bản nháp ban đầu (chat GPT)

Giữ nguyên ý tưởng gốc (discovery trước, universal vs domain, enterprise UX, 3 phiên làm việc), đồng thời:
1. Tách một prompt ~600 dòng thành 6 skill + references (nạp theo nhu cầu, đỡ tốn context).
2. Giải mâu thuẫn "tự khám phá năng lực còn thiếu" vs "không bịa chức năng" bằng nhãn `confirmed/implied/proposed`.
3. Phân tầng rõ core / foundation / domain (bản gốc để tất cả ở dạng "nếu phù hợp").
4. Bổ sung module hay bị bỏ sót: site content, leads inbox, message templates, jobs/integration health, my account/security.
5. Thêm gate duyệt, resume protocol, fast path, scale theo cỡ website, chế độ FE-first.
6. Công cụ thật: scanner project + validator docs (module `done` mà thiếu bằng chứng thì fail).
7. Bảo mật & an toàn dữ liệu cụ thể: IDOR, mass-assignment, CSV-injection, upload, impersonation, optimistic concurrency, idempotency, audit append-only.
8. QA chạy được: ma trận role × permission test trực tiếp API, test scale, regression site công khai.
9. Phù hợp Việt Nam: VND, múi giờ, tìm kiếm không dấu, font tiếng Việt.

## License

MIT
