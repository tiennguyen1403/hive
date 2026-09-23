# -*- coding: utf-8 -*-
"""Máy chủ tĩnh cho bản chạy thử — y như `python -m http.server`, thêm đúng
một thứ: **cấm cache**.

Vì sao cần hẳn một file: bản chạy thử dựng lại liên tục. CSS và JS đã có
`?v=` nên luôn mới, nhưng CHÍNH TRANG HTML thì không có gì bắt trình duyệt
hỏi lại. `python -m http.server` chỉ trả `Last-Modified`, và Chrome tự phỏng
đoán thời hạn rồi giữ trang trong cache — mở lại đúng địa chỉ cũ là thấy bản
cũ dù trên đĩa đã mới. Đã mất hai lượt xem xét vì chuyện này.

Thẻ `<meta http-equiv="Cache-Control">` KHÔNG cứu được: Chrome bỏ qua nó cho
tài liệu HTTP. Phải là tiêu đề thật, tức là phải có máy chủ của riêng mình.

    cd prototype && python serve.py        # cổng 4320
    cd prototype && python serve.py 4400   # cổng khác
"""
import http.server
import os
import sys


class KhongCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):      # bớt ồn: chỉ kêu khi hỏng
        if not str(args[1] if len(args) > 1 else "").startswith("2"):
            super().log_message(fmt, *args)


def main():
    cong = int(sys.argv[1]) if len(sys.argv) > 1 else 4320
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    may = http.server.ThreadingHTTPServer(("127.0.0.1", cong), KhongCache)
    print("Ban chay thu: http://127.0.0.1:%d  (Ctrl-C de dung)" % cong)
    try:
        may.serve_forever()
    except KeyboardInterrupt:
        may.server_close()


if __name__ == "__main__":
    main()
