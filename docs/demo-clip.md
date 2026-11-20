# Floorwise — kịch bản clip demo

> **Dành cho AI dựng clip.** Đọc hết file này trước khi quay. Mọi nhãn nút trong `ngoặc kép` là chữ hiển thị đúng
> trên giao diện (tiếng Anh). Làm theo đúng thứ tự cảnh; không bịa tính năng không có ở đây.

## 1. Tóm tắt

| Mục           | Nội dung                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sản phẩm      | **Floorwise** — nhập bản vẽ mặt bằng PDF/DXF, tự nhận tường, cửa, phòng, rồi sửa, bày nội thất bằng AI và xem 3D ngay trong trình duyệt. Chạy trên nền **Roomcraft** (trình thiết kế 2D → 3D). |
| Mục tiêu clip | Cho thấy trọn hành trình: bản vẽ kỹ thuật → mặt bằng sửa được → nhà 3D có nội thất → xuất lại DXF cho CAD.                                                                                     |
| Khán giả      | Nhà tuyển dụng / khách hàng xem portfolio; kiến trúc sư, người làm nội thất.                                                                                                                   |
| Độ dài        | Bản chính **80–90 giây**. Bản ngắn 30 giây (mục 7).                                                                                                                                            |
| Khung hình    | 16:9, 1920×1080, 30 fps. Bản ngắn có thể cắt 9:16.                                                                                                                                             |
| Giọng điệu    | Bình tĩnh, chính xác, kiểu công cụ chuyên nghiệp. Không khoa trương, không emoji.                                                                                                              |
| Ngôn ngữ      | Lồng tiếng tiếng Anh (có sẵn bản tiếng Việt bên dưới). Phụ đề theo ngôn ngữ lồng tiếng.                                                                                                        |

## 2. Nơi quay

- **Bản Artifact trên claude.ai (dùng bản này):** https://claude.ai/artifact/Ua1d6kNmTnyRrDnc1te8Qz
  - Phải đăng nhập claude.ai. Nút AI dùng tài khoản Claude của người xem, không cần API key.
  - Lần đầu bấm "Furnish" và lần đầu "Export", claude.ai hiện hộp xin phép: bấm cho phép, rồi **cắt hộp này khỏi clip**.
- Bản GitHub Pages: https://quangduy222002.github.io/meridian-tryon/studio/ — giống hệt nhưng nút AI đòi API key. Chỉ
  dùng nếu không quay được trên claude.ai, và khi đó bỏ cảnh AI (cảnh 7).
- **Không quay bản `localhost`**: thanh công cụ dev của Astro hiện ở đáy màn hình.

## 3. Chuẩn bị trước khi quay

1. Chrome, cửa sổ nội dung **1440×900**, zoom trình duyệt 100%, chế độ sáng.
2. Mở trang trong cửa sổ ẩn danh hoặc xoá dữ liệu trang để Floorwise bắt đầu từ màn hình nhập file (không có "Continue
   your last plan").
3. Bật hiệu ứng làm nổi con trỏ chuột và vòng sáng khi click.
4. File mẫu có sẵn trong app (nút "Open the sample plan · Flat A.26"), không cần chuẩn bị file.
5. Che hoặc không quay: email, tên tài khoản claude.ai, thanh dấu trang, thông báo hệ thống.
6. Quay mỗi cảnh thành một đoạn riêng, dư 1–2 giây đầu và cuối để dựng.

## 4. Danh sách cảnh (bản chính ~88 giây)

### Cảnh 1 — Mở đầu (0:00–0:05)

- **Hình:** kết quả cuối cùng — chế độ "Dollhouse" của căn hộ đã có nội thất, xoay chậm (kéo chuột ngang trên khung 3D).
  Quay cảnh này **sau cùng** rồi đặt lên đầu.
- **Chữ trên hình:** `From a PDF floor plan to a 3D home — in the browser.`
- **Lồng tiếng EN:** "This is Floorwise. It turns an architect's floor plan into a home you can edit, furnish and walk
  through."
- **Lồng tiếng VI:** "Đây là Floorwise. Nó biến bản vẽ mặt bằng của kiến trúc sư thành một ngôi nhà bạn có thể sửa,
  bày nội thất và đi dạo bên trong."

### Cảnh 2 — Nhập bản vẽ (0:05–0:12)

- **Thao tác:**
  1. Màn hình "Import a floor plan". Rê chuột qua ô "Drop a PDF or DXF here" (viền chuyển xanh).
  2. Bấm "Open the sample plan · Flat A.26".
  3. Hai ảnh thu nhỏ "Sheet 1" và "Sheet 2" hiện ra. Bấm **"Sheet 1"**.
- **Chữ trên hình:** `PDF or DXF · read in your browser, nothing uploaded`
- **EN:** "Drop in a PDF exported from CAD, or a DXF. Everything is read right in the browser."
- **VI:** "Thả vào file PDF xuất từ CAD, hoặc file DXF. Mọi thứ được đọc ngay trong trình duyệt."

### Cảnh 3 — Chọn căn hộ trên bản vẽ (0:12–0:22)

- **Thao tác:**
  1. Bản vẽ khổ lớn hiện ra. Zoom nhẹ cho thấy cột "Scale" bên phải ghi `1 : 59 · from … dimensions` (tỉ lệ tự đọc từ
     các con số kích thước).
  2. Kéo một khung chữ nhật quanh **mặt bằng ở góc dưới bên trái** của tờ bản vẽ (bản vẽ có tiêu đề
     "1 MẶT BẰNG KÍCH THƯỚC TƯỜNG XÂY"). Khung phải ôm trọn căn hộ và các đường kích thước, không lấy bảng ghi chú phía
     trên hay mặt bằng trần bên phải.
  3. Bấm **"Build the plan"**.
- **Chữ trên hình:** `Scale read from the dimensions`
- **EN:** "Pick your flat on the sheet. Floorwise reads the scale from the dimension lines."
- **VI:** "Khoanh căn hộ trên tờ bản vẽ. Floorwise tự đọc tỉ lệ từ các đường kích thước."

### Cảnh 4 — Kết quả nhận diện (0:22–0:34)

- **Thao tác:**
  1. Workspace hiện ra: mặt bằng 2D bên trái (đè lên bản vẽ gốc), 3D bên phải. Thông báo nổi:
     `Found 23 walls, 9 doors and windows, 3 closed rooms · named: Balcony, Bathroom — check them against the drawing.`
     Giữ khung hình đủ lâu để đọc.
  2. Lăn chuột phóng to 2D vào góc trên: nhãn **Bathroom 4.5 m²** (hộp kỹ thuật ở góc đã gộp vào phòng tắm, không còn vách), cung mở cửa phòng tắm.
  3. Bấm nút "Drawing" (biểu tượng khung, cạnh nút "Import") để tắt bản vẽ gốc → còn mặt bằng sạch.
- **Chữ trên hình:** `Walls, doors, windows and rooms — detected and named`
- **EN:** "Walls, doors and windows are detected from the drawing itself. Rooms are named from labels, fixtures, or
  how they're built: the small room that holds the service shaft is the bathroom."
- **VI:** "Tường, cửa đi, cửa sổ được nhận ra từ chính bản vẽ. Phòng được đặt tên theo nhãn chữ, thiết bị, hoặc cách bố
  trí: phòng nhỏ có hộp kỹ thuật là nhà vệ sinh."

### Cảnh 5 — Ký hiệu kiến trúc và ban công (0:34–0:44)

- **Thao tác:**
  1. Trên 2D, phóng to vào **Balcony 3.8 m²**: vách vào ban công là ký hiệu cửa trượt hai cánh; mép ngoài là lan can
     (dải nhạt).
  2. Chuyển sang khung 3D, giữ "Dollhouse", kéo xoay để nhìn từ phía ban công: thấy **cửa kính trượt** cao từ sàn và
     **lan can kính** thấp ở mép ngoài.
  3. Xoay tiếp tới cửa phòng tắm: cánh cửa mở vào trong phòng tắm.
- **Chữ trên hình:** `Sliding glass door · railing · door swings`
- **EN:** "It knows its symbols: a sliding door onto the balcony, a railing instead of a wall, which way every door
  swings."
- **VI:** "Nó hiểu ký hiệu: cửa trượt ra ban công, lan can thay vì tường, và chiều mở của từng cánh cửa."

### Cảnh 6 — Sửa mặt bằng (0:44–0:52)

- **Thao tác:**
  1. Trên 2D, bấm vào phòng lớn **Room 43.3 m²** → bảng thông tin hiện ra.
  2. Gõ tên phòng `Living` vào ô "Name".
  3. Ở mục "Floor" chọn **"Walnut planks"** → sàn 3D đổi màu ngay.
- **Chữ trên hình:** `Every change shows in 3D instantly`
- **EN:** "Everything stays editable. Rename a room, change the floor, and the 3D view follows."
- **VI:** "Mọi thứ đều sửa được. Đổi tên phòng, đổi sàn, khung 3D cập nhật ngay."

### Cảnh 7 — Bày nội thất bằng AI (0:52–1:06) — chỉ quay trên claude.ai

- **Thao tác:**
  1. Bấm nút **"AI"** trên thanh trên cùng → hộp "Furnish with AI". Dòng dưới ghi "Uses your Claude account."
  2. "Room": chọn **Living · 43.3 m²**.
  3. Gõ vào "What should it be?":
     `A bright living room with a sofa facing the TV, a dining table for four near the kitchen wall, and a reading corner by the window.`
  4. Bấm **"Furnish"**. (Hộp xin phép của claude.ai lần đầu: cho phép rồi cắt. Thời gian chờ 20–60 giây: cắt, chỉ giữ
     1 giây chữ "Arranging the room…".)
  5. Nội thất hiện trong 2D và 3D. Xoay 3D chậm để khoe bố cục.
- **Chữ trên hình:** `Furnished by Claude — no API key`
- **EN:** "Describe the room and Claude lays it out from the catalogue, keeping doors and walkways clear."
- **VI:** "Mô tả căn phòng, Claude tự bày nội thất từ danh mục, chừa lối đi và cửa ra vào."

### Cảnh 8 — Đi dạo và ánh sáng (1:06–1:14)

- **Thao tác:**
  1. Bấm **"Walk"** (góc trên phải khung 3D). Dòng hướng dẫn: "Drag to look · WASD or arrows to walk".
  2. Giữ W đi từ phòng khách ra phía ban công, kéo chuột nhìn quanh.
  3. Bấm **"Dollhouse"** để quay lại. Kéo thanh **"Sun"** từ 15:00 sang khoảng 18:30: ánh nắng chiều vàng, bóng đổ dài
     qua cửa sổ.
- **Chữ trên hình:** `Walk through it · real sun at any hour`
- **EN:** "Walk through it at eye level, and check the light at any time of day."
- **VI:** "Đi dạo trong nhà ở tầm mắt, và xem ánh sáng vào bất kỳ giờ nào trong ngày."

### Cảnh 9 — Chiếu sáng (1:14–1:18)

- **Thao tác:** bấm **"Lighting"** → **"Design the lighting"**, rồi kéo thanh **"Sun"** qua 19:00: đèn âm trần, đèn
  thả bàn ăn và đèn đầu giường bật sáng.
- **Chữ trên hình:** `A lighting plan for every room`
- **EN:** "A lighting plan for every room, and the home at night."
- **VI:** "Bố trí đèn cho từng phòng, và ngôi nhà về đêm."

### Cảnh 10 — Xuất file (1:18–1:26)

- **Thao tác:**
  1. Bấm **"Export"** → hộp có 4 lựa chọn: DXF, SVG, PNG, 3D view.
  2. Bấm **"SVG"** (hoặc "PNG"), cho phép tải file, mở file vừa tải: bản vẽ sạch với tường đặc, cung cửa, tên và diện
     tích phòng, thước tỉ lệ 1 m.
  3. (Tuỳ chọn) Bấm **"DXF"**, mở trong một trình xem DXF/AutoCAD, cho thấy các lớp `A-WALL`, `A-DOOR`, `A-GLAZ`,
     `A-ROOM`, `A-FURN`. Trên claude.ai file DXF nằm trong một file `.zip`.
- **Chữ trên hình:** `Back to CAD: DXF on layers · SVG · PNG`
- **EN:** "And when you're done, take it back to CAD — a layered DXF in millimetres, or a clean drawing."
- **VI:** "Xong thì mang về lại CAD — file DXF chia lớp, đơn vị milimét, hoặc bản vẽ sạch để in."

### Cảnh 11 — Kết (1:26–1:30)

- **Hình:** cảnh 3D cuối, mờ dần sang màn hình trắng có chữ.
- **Chữ trên hình:** `Floorwise` (dòng lớn) · `Import · Fix · Redesign` (dòng nhỏ) · đường link
  `quangduy222002.github.io/meridian-tryon/studio`
- **EN:** "Floorwise. Import, fix, redesign."
- **VI:** "Floorwise. Nhập, sửa, thiết kế lại."

## 5. Phong cách hình ảnh khi dựng

- **Phụ đề và chữ trên hình:** phông Inter, chữ trắng trên nền `#101828` bo góc 8 px, hoặc chữ `#101828` trên nền trắng.
  Đặt ở 1/3 dưới màn hình, không che vùng đang thao tác.
- **Màu nhấn:** xanh `#2563eb` (trùng màu nút chính của app). Nền xám nhạt của app: `#f2f4f7`.
- **Chuyển cảnh:** cắt thẳng hoặc mờ chéo ngắn (≤ 8 khung hình). Không dùng hiệu ứng lật, xoáy.
- **Zoom:** dùng zoom kỹ thuật số nhẹ (110–130%) vào vùng đang thao tác; giữ con trỏ trong khung.
- **Nhạc nền:** nhạc điện tử/piano tối giản, nhịp vừa, không lời, nhỏ hơn giọng đọc ~18 dB.
- **Tốc độ:** tua nhanh 2–4× các đoạn chờ (tải bản vẽ, AI đang xếp đồ). Không tua các đoạn cần đọc chữ.

## 6. Những điều không được làm

- Không nói hay ghi rằng nhận diện luôn chính xác 100%: app tự ghi "check them against the drawing".
- Không quay ô nhập API key, email, tên tài khoản hay bất kỳ thông tin cá nhân nào.
- Không quay hộp xin phép của claude.ai (cắt bỏ).
- Không dùng tên, logo hay giao diện của sản phẩm khác.

## 7. Bản ngắn 30 giây (mạng xã hội)

| Thời gian | Hình                                                 | Chữ trên hình                    |
| --------- | ---------------------------------------------------- | -------------------------------- |
| 0:00–0:03 | Cảnh 1 (3D xoay)                                     | `PDF floor plan → 3D home`       |
| 0:03–0:08 | Cảnh 3: kéo khung quanh căn hộ, bấm "Build the plan" | `Pick your flat`                 |
| 0:08–0:13 | Cảnh 4: thông báo kết quả, nhãn Bathroom / Balcony   | `Walls, doors, rooms — detected` |
| 0:13–0:20 | Cảnh 7: gõ yêu cầu, nội thất hiện ra trong 3D        | `Furnished by Claude`            |
| 0:20–0:25 | Cảnh 8: Walk + kéo thanh Sun                         | `Walk through it`                |
| 0:25–0:30 | Cảnh 10: Export SVG, rồi logo                        | `Back to CAD · Floorwise`        |

Không lồng tiếng; chỉ nhạc và chữ trên hình.

## 8. Kiểm tra trước khi xuất clip

- [ ] Mọi nhãn nút trong clip khớp giao diện thật.
- [ ] Thông báo kết quả nhận diện đọc được (đứng ≥ 2 giây).
- [ ] Cảnh AI dùng bản claude.ai; không lộ API key hay hộp xin phép.
- [ ] Không có thanh công cụ dev, email hay thông tin cá nhân trong khung hình.
- [ ] Phụ đề khớp lồng tiếng; độ dài bản chính 80–90 giây.
- [ ] Xuất MP4 H.264, 1920×1080, 30 fps; bản ngắn thêm 1080×1920.
