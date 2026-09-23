import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { dayMonthYear } from "@/lib/datetime";
import type { Me } from "@/lib/me";
import { formatPhone } from "@/lib/phone";

/**
 * Personal details, read from `public.profiles`.
 *
 * No `"use client"` since slice B1: there is nothing to click here except a
 * link, and the row it prints now comes from the database through the page
 * above it rather than from a context the browser had to fill in.
 *
 * Read-only, and it says so once at the top rather than putting a dead "Sửa"
 * on every row. An edit control that does nothing is worse than no control:
 * it costs a tap to find out. Changing the password is the exception — that
 * screen exists and writes for real, so its row links to it.
 *
 * Google and "Xoá tài khoản" are stated as what they are: not connected, and
 * not switched on. Neither is drawn as a button.
 */
export function ProfileScreen({ me }: { me: Me }) {
  return (
    <>
      <div className="pghead">
        <h1>Hồ sơ</h1>
        <span className="meta">tài khoản đang đăng nhập</span>
      </div>

      <p className="note3">
        <Icon name="info" className="ic sm" />
        <span>
          Đọc từ tài khoản của bạn. Sửa tên và số điện thoại chưa mở trong bản này; đổi
          mật khẩu thì được.
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
          {/* An account created here has none yet, and the sign-up screen
              says where one comes from: the first order. Printing an empty
              row would read as a number that failed to load. */}
          <dd className={me.phone ? "nw" : undefined}>
            {me.phone ? formatPhone(me.phone) : "Chưa có — lấy từ đơn đầu tiên."}
          </dd>
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
  );
}
