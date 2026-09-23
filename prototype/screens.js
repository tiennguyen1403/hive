/* Sinh ra từ gen_app.py — đừng sửa tay. */
window.SCREENS = [
{
"slug": "trang-chu",
"num": "1",
"title": "Trang chủ",
"group": "mua",
"kind": "m",
"note": "Đợt đang mở, đếm ngược, mười mẫu của đợt.",
"href": "trang-chu.html"
},
{
"slug": "danh-muc",
"num": "2",
"title": "Danh mục",
"group": "mua",
"kind": "m",
"note": "Chip lọc, mẫu hết hàng vẫn hiện và phủ mờ.",
"href": "danh-muc.html"
},
{
"slug": "bo-loc",
"num": "3",
"title": "Bộ lọc",
"group": "mua",
"kind": "sheet",
"note": "Tấm trượt lên từ đáy trang danh mục.",
"href": "danh-muc.html#bo-loc"
},
{
"slug": "chon-size",
"num": "",
"title": "Chọn size",
"group": "mua",
"kind": "sheet",
"note": "Nút trên thẻ sản phẩm mở tấm này: màu đang xem, và số còn lại từng size.",
"href": "danh-muc.html#chon-size"
},
{
"slug": "tim-kiem",
"num": "4",
"title": "Tìm kiếm",
"group": "mua",
"kind": "m",
"note": "Kết quả hiện ngay dưới ô tìm.",
"href": "tim-kiem.html"
},
{
"slug": "tim-kiem-rong",
"num": "5",
"title": "Tìm không ra",
"group": "mua",
"kind": "m",
"note": "Nói rõ đợt này có gì thay vì chỉ báo lỗi.",
"href": "tim-kiem-rong.html"
},
{
"slug": "san-pham",
"num": "6",
"title": "Trang sản phẩm",
"group": "mua",
"kind": "m",
"note": "Chọn size, thêm vào giỏ, mở bảng size.",
"href": "san-pham.html"
},
{
"slug": "bang-size",
"num": "7",
"title": "Bảng size",
"group": "mua",
"kind": "sheet",
"note": "Tấm trượt lên từ trang sản phẩm.",
"href": "san-pham.html#bang-size"
},
{
"slug": "san-pham-het",
"num": "8",
"title": "Sản phẩm đã hết",
"group": "mua",
"kind": "m",
"note": "Nút chính đổi vai: báo khi có lại.",
"href": "san-pham-het.html"
},
{
"slug": "gio-hang",
"num": "9",
"title": "Giỏ hàng",
"group": "mua",
"kind": "m",
"note": "Tăng giảm số lượng, tiền tự tính lại.",
"href": "gio-hang.html"
},
{
"slug": "gio-hang-loi",
"num": "10",
"title": "Giỏ có món vừa hết",
"group": "mua",
"kind": "m",
"note": "Không cho đi tiếp tới khi xử lý xong.",
"href": "gio-hang-loi.html"
},
{
"slug": "gio-hang-rong",
"num": "11",
"title": "Giỏ rỗng",
"group": "mua",
"kind": "m",
"note": "Gợi lại mẫu đã xem thay vì để trống.",
"href": "gio-hang-rong.html"
},
{
"slug": "thanh-toan",
"num": "12",
"title": "Thanh toán",
"group": "mua",
"kind": "m",
"note": "Một trang. Địa chỉ Tỉnh → Quận → Phường.",
"href": "thanh-toan.html"
},
{
"slug": "dat-hang-xong",
"num": "13",
"title": "Xác nhận đơn",
"group": "mua",
"kind": "m",
"note": "Số tiền và nội dung chuyển khoản.",
"href": "dat-hang-xong.html"
},
{
"slug": "dot-sap-mo",
"num": "",
"title": "Trang chủ · đợt chưa mở",
"group": "mua",
"kind": "m",
"note": "Việc duy nhất làm được là đặt nhắc.",
"href": "dot-sap-mo.html"
},
{
"slug": "dot-da-dong",
"num": "",
"title": "Trang chủ · đợt đã đóng",
"group": "mua",
"kind": "m",
"note": "Trạng thái sống lâu nhất của trang chủ.",
"href": "dot-da-dong.html"
},
{
"slug": "trang-chu-pc",
"num": "",
"title": "Trang chủ · máy tính",
"group": "mua",
"kind": "pc",
"note": "Cùng hệ, lưới ba cột.",
"href": "trang-chu-pc.html"
},
{
"slug": "san-pham-pc",
"num": "",
"title": "Trang sản phẩm · máy tính",
"group": "mua",
"kind": "pc",
"note": "Ảnh bên trái, quyết định bên phải.",
"href": "san-pham-pc.html"
},
{
"slug": "the-san-pham",
"num": "",
"title": "Thẻ sản phẩm",
"group": "mua",
"kind": "adm",
"note": "Bốn cách dựng lại thẻ — bản so sánh, chưa áp dụng.",
"href": "the-san-pham.html"
},
{
"slug": "dang-nhap",
"num": "14",
"title": "Đăng nhập",
"group": "tk",
"kind": "m",
"note": "Có lối mua không cần tài khoản.",
"href": "dang-nhap.html"
},
{
"slug": "dang-ky",
"num": "15",
"title": "Đăng ký",
"group": "tk",
"kind": "m",
"note": "Đang hiện trạng thái lỗi.",
"href": "dang-ky.html"
},
{
"slug": "quen-mat-khau",
"num": "16",
"title": "Quên mật khẩu",
"group": "tk",
"kind": "m",
"note": "Một ô, một nút.",
"href": "quen-mat-khau.html"
},
{
"slug": "quen-mat-khau-da-gui",
"num": "17",
"title": "Đã gửi liên kết",
"group": "tk",
"kind": "m",
"note": "Nói rõ gửi đi đâu, bao giờ gửi lại được.",
"href": "quen-mat-khau-da-gui.html"
},
{
"slug": "tai-khoan",
"num": "18",
"title": "Trang tài khoản",
"group": "tk",
"kind": "m",
"note": "Cửa vào của mọi mục.",
"href": "tai-khoan.html"
},
{
"slug": "thong-tin",
"num": "19",
"title": "Thông tin cá nhân",
"group": "tk",
"kind": "m",
"note": "Xoá tài khoản nói rõ cái gì mất.",
"href": "thong-tin.html"
},
{
"slug": "doi-mat-khau",
"num": "20",
"title": "Đổi mật khẩu",
"group": "tk",
"kind": "m",
"note": "Điều kiện chạy theo từng ký tự bạn gõ.",
"href": "doi-mat-khau.html"
},
{
"slug": "don-hang",
"num": "21",
"title": "Lịch sử đơn",
"group": "tk",
"kind": "m",
"note": "Trạng thái là nhãn có chữ, không chỉ màu.",
"href": "don-hang.html"
},
{
"slug": "don-chi-tiet",
"num": "22",
"title": "Chi tiết đơn",
"group": "tk",
"kind": "m",
"note": "Dòng thời gian trả lời tới đâu rồi.",
"href": "don-chi-tiet.html"
},
{
"slug": "don-da-huy",
"num": "23",
"title": "Đơn đã huỷ",
"group": "tk",
"kind": "m",
"note": "Nói thẳng vì sao huỷ.",
"href": "don-da-huy.html"
},
{
"slug": "theo-doi",
"num": "24",
"title": "Theo dõi vận chuyển",
"group": "tk",
"kind": "m",
"note": "Đối tác chưa chốt nên ghi rõ là chưa có.",
"href": "theo-doi.html"
},
{
"slug": "dia-chi",
"num": "25",
"title": "Sổ địa chỉ",
"group": "tk",
"kind": "m",
"note": "Địa chỉ mặc định điền sẵn ở thanh toán.",
"href": "dia-chi.html"
},
{
"slug": "dia-chi-them",
"num": "26",
"title": "Thêm địa chỉ",
"group": "tk",
"kind": "m",
"note": "Ba cấp hành chính là ô chọn thật.",
"href": "dia-chi-them.html"
},
{
"slug": "yeu-thich",
"num": "27",
"title": "Yêu thích",
"group": "tk",
"kind": "m",
"note": "Báo ngay mẫu nào sắp hết.",
"href": "yeu-thich.html"
},
{
"slug": "yeu-thich-rong",
"num": "28",
"title": "Yêu thích rỗng",
"group": "tk",
"kind": "m",
"note": "Nói rõ cách lưu và lợi ích của việc lưu.",
"href": "yeu-thich-rong.html"
},
{
"slug": "qt-tong-quan",
"num": "29",
"title": "Tổng quan",
"group": "qt",
"kind": "adm",
"note": "Biểu đồ kèm bảng số, đọc không cần màu.",
"href": "qt-tong-quan.html"
},
{
"slug": "qt-dot-ban",
"num": "30",
"title": "Đợt bán",
"group": "qt",
"kind": "adm",
"note": "Mở và đóng đợt. Đóng là đóng hẳn.",
"href": "qt-dot-ban.html"
},
{
"slug": "qt-san-pham",
"num": "31",
"title": "Sản phẩm",
"group": "qt",
"kind": "adm",
"note": "Tồn kho theo size hiện ngay ở bảng.",
"href": "qt-san-pham.html"
},
{
"slug": "qt-san-pham-them",
"num": "32",
"title": "Thêm sản phẩm",
"group": "qt",
"kind": "adm",
"note": "Số lượng cắt khoá lại khi đợt đã mở.",
"href": "qt-san-pham-them.html"
},
{
"slug": "qt-san-pham-sua",
"num": "33",
"title": "Sửa sản phẩm",
"group": "qt",
"kind": "adm",
"note": "Tồn kho tách theo size: cắt / bán / còn.",
"href": "qt-san-pham-sua.html"
},
{
"slug": "qt-don-hang",
"num": "34",
"title": "Đơn hàng",
"group": "qt",
"kind": "adm",
"note": "Chọn nhiều đơn để xử lý hàng loạt.",
"href": "qt-don-hang.html"
},
{
"slug": "qt-don-chi-tiet",
"num": "35",
"title": "Chi tiết đơn",
"group": "qt",
"kind": "adm",
"note": "Đủ thứ cần để đóng gói và đối soát.",
"href": "qt-don-chi-tiet.html"
},
{
"slug": "qt-khach-hang",
"num": "36",
"title": "Khách hàng",
"group": "qt",
"kind": "adm",
"note": "Nhóm khách để biết ai nên báo trước.",
"href": "qt-khach-hang.html"
},
{
"slug": "qt-khach-chi-tiet",
"num": "37",
"title": "Chi tiết khách hàng",
"group": "qt",
"kind": "adm",
"note": "Mở từ bảng khách hàng.",
"href": "qt-khach-chi-tiet.html"
},
{
"slug": "qt-khuyen-mai",
"num": "38",
"title": "Khuyến mãi",
"group": "qt",
"kind": "adm",
"note": "Tạo mã ngay dưới bảng.",
"href": "qt-khuyen-mai.html"
},
{
"slug": "qt-bang",
"num": "",
"title": "Hệ bảng dữ liệu",
"group": "qt",
"kind": "adm",
"note": "Đặc tả component bảng — mảnh nào ứng với API nào của TanStack.",
"href": "qt-bang.html"
},
{
"slug": "qt-nut-loc",
"num": "",
"title": "Kiểu nút lọc",
"group": "qt",
"kind": "adm",
"note": "Bốn cách làm nút thả xuống nền vàng — bản so sánh, chưa áp dụng.",
"href": "qt-nut-loc.html"
},
{
"slug": "gioi-thieu",
"num": "39",
"title": "Giới thiệu",
"group": "nd",
"kind": "m",
"note": "Chỗ chưa chốt để trống có nhãn, không bịa.",
"href": "gioi-thieu.html"
},
{
"slug": "cau-hoi",
"num": "40",
"title": "Câu hỏi thường gặp",
"group": "nd",
"kind": "m",
"note": "Sáu câu, gập mở được.",
"href": "cau-hoi.html"
},
{
"slug": "doi-tra",
"num": "41",
"title": "Chính sách đổi trả",
"group": "nd",
"kind": "m",
"note": "Nói cả cái không đổi trả được.",
"href": "doi-tra.html"
},
{
"slug": "lien-he",
"num": "42",
"title": "Liên hệ",
"group": "nd",
"kind": "m",
"note": "Ba kênh đang trống thật, chờ bạn điền.",
"href": "lien-he.html"
},
{
"slug": "khong-tim-thay",
"num": "43",
"title": "Không tìm thấy trang",
"group": "nd",
"kind": "m",
"note": "Lý do gắn với mô hình bán đợt.",
"href": "khong-tim-thay.html"
}
];
window.GROUPS = [{"id": "mua", "name": "Mua hàng"}, {"id": "tk", "name": "Tài khoản"}, {"id": "qt", "name": "Quản trị"}, {"id": "nd", "name": "Nội dung & hỗ trợ"}];
window.ICONS = {"back": "<path stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-miterlimit=\"10\" stroke-width=\"1.5\" d=\"M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08\"></path>", "grid": "<path d=\"M5 10h2c2 0 3-1 3-3V5c0-2-1-3-3-3H5C3 2 2 3 2 5v2c0 2 1 3 3 3ZM17 10h2c2 0 3-1 3-3V5c0-2-1-3-3-3h-2c-2 0-3 1-3 3v2c0 2 1 3 3 3ZM17 22h2c2 0 3-1 3-3v-2c0-2-1-3-3-3h-2c-2 0-3 1-3 3v2c0 2 1 3 3 3ZM5 22h2c2 0 3-1 3-3v-2c0-2-1-3-3-3H5c-2 0-3 1-3 3v2c0 2 1 3 3 3Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>", "x": "<path d=\"M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10ZM9.17 14.83l5.66-5.66M14.83 14.83 9.17 9.17\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>", "chev": "<path stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-miterlimit=\"10\" stroke-width=\"1.5\" d=\"M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08\"></path>", "confirm": "<path d=\"M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path><path d=\"m7.75 12 2.83 2.83 5.67-5.66\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>", "bag": "<path d=\"M7.5 7.67V6.7c0-2.25 1.81-4.46 4.06-4.67a4.5 4.5 0 0 1 4.94 4.48v1.38M9 22h6c4.02 0 4.74-1.61 4.95-3.57l.75-6C20.97 9.99 20.27 8 16 8H8c-4.27 0-4.97 1.99-4.7 4.43l.75 6C4.26 20.39 4.98 22 9 22Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path><path d=\"M15.495 12h.01M8.495 12h.008\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>", "search": "<path d=\"M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM22 22l-2-2\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>"};
window.KHO = {"khoi": {"ten": "KHÓI", "loai": "Áo thun oversize", "form": "Oversize", "gia": "390.000₫", "con": {"S": 5, "M": 6, "L": 4, "XL": 2}, "mau": [{"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1503341338985-c0477be52513?auto=format&fit=crop&w=260&q=70"}, {"ten": "Kem", "hex": "#E6DFD1", "anh": "https://images.unsplash.com/photo-1611817757591-c3f345024273?auto=format&fit=crop&w=260&q=70"}]}, "bui": {"ten": "BỤI", "loai": "Áo hoodie", "form": "Oversize", "gia": "890.000₫", "con": {"S": 0, "M": 0, "L": 1, "XL": 1}, "mau": [{"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?auto=format&fit=crop&w=260&q=70"}, {"ten": "Xám", "hex": "#8C8C8C", "anh": "https://images.unsplash.com/photo-1614214191247-5b2d3a734f1b?auto=format&fit=crop&w=260&q=70"}]}, "nguoi": {"ten": "NGUỘI", "loai": "Áo hoodie in", "form": "Oversize", "gia": "1.290.000₫", "con": {"S": 1, "M": 2, "L": 1, "XL": 1}, "mau": [{"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1680292783974-a9a336c10366?auto=format&fit=crop&w=260&q=70"}]}, "nang": {"ten": "NẮNG", "loai": "Áo thun", "form": "Regular", "gia": "450.000₫", "con": {"S": 3, "M": 4, "L": 3, "XL": 2}, "mau": [{"ten": "Trắng", "hex": "#F2F1ED", "anh": "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=260&q=70"}, {"ten": "Kem", "hex": "#E6DFD1", "anh": "https://images.unsplash.com/photo-1688111421205-a0a85415b224?auto=format&fit=crop&w=260&q=70"}, {"ten": "Rêu", "hex": "#4A5240", "anh": "https://images.unsplash.com/photo-1565978771542-0db9ab9ad3de?auto=format&fit=crop&w=260&q=70"}]}, "suong": {"ten": "SƯƠNG", "loai": "Áo khoác dù", "form": "Oversize", "gia": "1.450.000₫", "con": {"S": 0, "M": 1, "L": 1, "XL": 1}, "mau": [{"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?auto=format&fit=crop&w=260&q=70"}, {"ten": "Rêu", "hex": "#4A5240", "anh": "https://images.unsplash.com/photo-1633292750937-120a94f5c2bb?auto=format&fit=crop&w=260&q=70"}]}, "muoi": {"ten": "MUỐI", "loai": "Quần jogger", "form": "Regular", "gia": "690.000₫", "con": {"S": 0, "M": 0, "L": 0, "XL": 0}, "mau": [{"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1601063476271-a159c71ab0b3?auto=format&fit=crop&w=260&q=70"}, {"ten": "Xám", "hex": "#8C8C8C", "anh": "https://images.unsplash.com/photo-1542327534-59a1fe8daf73?auto=format&fit=crop&w=260&q=70"}]}, "than": {"ten": "THAN", "loai": "Áo khoác bomber", "form": "Oversize", "gia": "1.350.000₫", "con": {"S": 1, "M": 2, "L": 2, "XL": 1}, "mau": [{"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1508216310976-c518daae0cdc?auto=format&fit=crop&w=260&q=70"}, {"ten": "Xanh than", "hex": "#2B3A52", "anh": "https://images.unsplash.com/photo-1632682582909-2b3a2581eef7?auto=format&fit=crop&w=260&q=70"}]}, "cat": {"ten": "CÁT", "loai": "Áo thun tay lỡ", "form": "Oversize", "gia": "420.000₫", "con": {"S": 4, "M": 5, "L": 4, "XL": 2}, "mau": [{"ten": "Kem", "hex": "#E6DFD1", "anh": "https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?auto=format&fit=crop&w=260&q=70"}, {"ten": "Trắng", "hex": "#F2F1ED", "anh": "https://images.unsplash.com/photo-1561151593-7059b6b4ff57?auto=format&fit=crop&w=260&q=70"}, {"ten": "Nâu", "hex": "#5C4536", "anh": "https://images.unsplash.com/photo-1611817757591-c3f345024273?auto=format&fit=crop&w=260&q=70"}]}, "gio": {"ten": "GIÓ", "loai": "Áo sơ mi dệt", "form": "Regular", "gia": "750.000₫", "con": {"S": 2, "M": 3, "L": 2, "XL": 0}, "mau": [{"ten": "Trắng", "hex": "#F2F1ED", "anh": "https://images.unsplash.com/photo-1615397587950-3cbb55f95b77?auto=format&fit=crop&w=260&q=70"}, {"ten": "Xanh than", "hex": "#2B3A52", "anh": "https://images.unsplash.com/photo-1614214191247-5b2d3a734f1b?auto=format&fit=crop&w=260&q=70"}]}, "da": {"ten": "ĐÁ", "loai": "Quần cargo", "form": "Regular", "gia": "980.000₫", "con": {"S": 1, "M": 2, "L": 2, "XL": 1}, "mau": [{"ten": "Rêu", "hex": "#4A5240", "anh": "https://images.unsplash.com/photo-1542406775-ade58c52d2e4?auto=format&fit=crop&w=260&q=70"}, {"ten": "Đen", "hex": "#1C1C1C", "anh": "https://images.unsplash.com/photo-1688111421205-a0a85415b224?auto=format&fit=crop&w=260&q=70"}]}};
window.SIZES = ["S", "M", "L", "XL"];
