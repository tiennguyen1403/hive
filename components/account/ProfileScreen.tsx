"use client";

import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { dayMonthYear } from "@/lib/datetime";
import { formatPhone } from "@/lib/phone";
import { AccountGuard } from "./AccountGuard";

/**
 * Personal details, in the v3 frame.
 *
 * Read-only in this build, and it says so once at the top rather than
 * putting a dead "Sửa" on every row. An edit control that does nothing is
 * worse than no control: it costs a tap to find out.
 *
 * Changing the password is the exception — that screen exists, so its row
 * links to it. Google and "Xoá tài khoản" are stated as what they are: not
 * connected, and not switched on. Neither is drawn as a button.
 */
export function ProfileScreen() {
  return (
    <AccountGuard title="Hồ sơ" active="profile">
      {(me) => (
        <>
          <div className="pghead">
            <h1>Hồ sơ</h1>
            <span className="meta">từ tài khoản mẫu đang đăng nhập</span>
          </div>

          <p className="note3">
            <Icon name="info" className="ic sm" />
            <span>
              Chưa sửa được trong bản dựng này: lưu hồ sơ cần máy chủ. Dữ liệu dưới đây
              lấy từ tài khoản mẫu đang đăng nhập.
            </span>
          </p>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h3>Thông tin</h3>
            <dl className="kvs">
              <dt>Họ và tên</dt>
              <dd>{me.name}</dd>
              <dt>Email</dt>
              <dd>{me.email}</dd>
              <dt>Số điện thoại</dt>
              <dd className="nw">{formatPhone(me.phone)}</dd>
              <dt>Mật khẩu</dt>
              <dd>
                ••••••••{" "}
                <Link className="lnk" href="/account/password">
                  Đổi
                </Link>
              </dd>
              <dt>Thành viên từ</dt>
              <dd>{dayMonthYear(me.joinedAt)}</dd>
            </dl>
          </section>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h3>
              Đăng nhập
              <span className="meta">đang chuẩn bị</span>
            </h3>
            <div className="prefrow">
              <div>
                <b>Tiếp tục với Google</b>
                <span>Chưa liên kết — cổng đăng nhập chưa nối.</span>
              </div>
            </div>
            <div className="prefrow" style={{ borderBottom: 0 }}>
              <div>
                <b>Xoá tài khoản</b>
                {/* Says exactly what would go and what would stay. A delete
                    that does not is a delete nobody can consent to. */}
                <span>
                  Xoá hồ sơ và sổ địa chỉ. Đơn đã đặt vẫn được giữ để đối soát. Chưa bật
                  trong bản dựng này.
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </AccountGuard>
  );
}
