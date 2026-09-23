"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { Select, type SelectOption } from "@/components/ui/Select";
import { COLORS } from "@/data/colors";
import { SIZES, type ColorKey, type Size } from "@/data/types";
import { LEX } from "@/lib/lexicon";
import { moneyInitial, moneyInput, parseVnd, plainVnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

export interface ProductFormValues {
  name: string;
  kind: string;
  slug: string;
  priceVnd: number;
  dropNo: number;
  material: string;
  colors: ColorKey[];
  /** `stock[color][size]`. Empty for a new style. */
  stock: Record<string, Record<string, number>>;
  photoKeys: string[];
}

interface ProductFormProps {
  mode: "new" | "edit";
  values: ProductFormValues;
  kindOptions: SelectOption[];
  dropOptions: SelectOption[];
  /**
   * Units the issue cut, for the heading line. A plain number, because
   * per-size sales are not recorded anywhere — deriving them would mean
   * apportioning a total nobody measured.
   */
  cutUnits?: number;
}

/**
 * Add or edit a style — the v2 form, wearing the v3 frame.
 *
 * The stock grid is COLOUR × SIZE, where the approved mock had size alone.
 * The data model was widened in Phase 1 — every row in `data/catalog.ts`
 * spells out units per size AND per colour — and a grid that cannot express
 * "hết XL màu đen" would be unable to edit what the shop actually stores.
 *
 * NOTHING IS SAVED. There is no server behind this build, and a Save button
 * that quietly did nothing would be the same lie as an invented figure — so
 * the button says what it is and pressing it says what happened. Everything
 * else on the screen is real: typing in the grid recomputes the totals live,
 * because that arithmetic is the reason the screen exists.
 *
 * Editing the shelf of a style that already exists belongs on the products
 * table instead ("Điều chỉnh tồn kho"), where it is recorded with a reason
 * and reaches the rest of the back office. This grid is the DRAFT of a style
 * nobody has cut yet.
 */
export function ProductForm({ mode, values, kindOptions, dropOptions, cutUnits }: ProductFormProps) {
  const [name, setName] = useState(values.name);
  const [kind, setKind] = useState(values.kind);
  const [slug, setSlug] = useState(values.slug);
  const [price, setPrice] = useState(moneyInitial(values.priceVnd));
  const [dropNo, setDropNo] = useState(String(values.dropNo));
  const [material, setMaterial] = useState(values.material);
  const [stock, setStock] = useState(values.stock);
  const [saidNoServer, setSaidNoServer] = useState(false);

  const colors = values.colors;

  /** What the grid currently adds up to — recomputed as it is typed in. */
  const onHandTotal = useMemo(() => {
    let n = 0;
    for (const c of colors) for (const s of SIZES) n += stock[c]?.[s] ?? 0;
    return n;
  }, [stock, colors]);

  function setCell(color: ColorKey, size: Size, raw: string) {
    const n = Math.max(0, Math.min(999, Number(raw.replace(/\D/g, "")) || 0));
    setStock((prev) => ({ ...prev, [color]: { ...(prev[color] ?? {}), [size]: n } }));
  }

  return (
    <>
      <div className="split3" style={{ marginTop: 0 }}>
        <div>
          <section className="panel3">
            <h2>Thông tin cơ bản</h2>
            <div className="bd">
              <Field3 label="Tên mẫu">
                {({ id }) => (
                  <input
                    id={id}
                    className="inp"
                    placeholder="VD: KHÓI"
                    style={{ textTransform: "uppercase" }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </Field3>
              <div className="fgrid" style={{ marginTop: 14 }}>
                <Field3 label="Loại">
                  {({ id }) => (
                    <Select
                      id={id}
                      options={kindOptions}
                      value={kind}
                      onChange={setKind}
                      placeholder="Chọn loại"
                    />
                  )}
                </Field3>
                <Field3 label={LEX.t}>
                  {({ id }) => (
                    <Select
                      id={id}
                      options={dropOptions}
                      value={dropNo}
                      onChange={setDropNo}
                      placeholder={`Chọn ${LEX.tl}`}
                    />
                  )}
                </Field3>
                <Field3 label="Mã trên địa chỉ" help="Tự sinh từ tên nếu để trống.">
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      className="inp"
                      aria-describedby={describedBy}
                      placeholder="khoi"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  )}
                </Field3>
                {/* The box shows `390.000` like every other amount in the
                    app, the form keeps the integer, and `parseVnd` accepts
                    whatever shape a paste arrives in. A new style starts
                    EMPTY, not at 0: nobody has decided a price yet, and a
                    zero sitting in the box is a figure the screen made up. */}
                <Field3 label="Giá bán (₫)">
                  {({ id }) => (
                    <input
                      id={id}
                      className="inp"
                      inputMode="numeric"
                      placeholder="VD: 390.000"
                      value={moneyInput(price)}
                      onChange={(e) => setPrice(String(parseVnd(e.target.value) || ""))}
                    />
                  )}
                </Field3>
              </div>
              <Field3 label="Chất liệu & form">
                {({ id }) => (
                  <textarea
                    id={id}
                    className="inp area"
                    rows={4}
                    placeholder="Chất liệu, form dáng, cách bảo quản"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                )}
              </Field3>
            </div>
          </section>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h2>
              {mode === "new" ? "Số lượng sẽ cắt" : "Tồn kho"}
              <span className="meta">
                {mode === "new"
                  ? `tổng ${onHandTotal} chiếc`
                  : `đã cắt ${cutUnits ?? onHandTotal} · còn ${onHandTotal}`}
              </span>
            </h2>
            <div className="bd">
              {colors.length === 0 ? (
                <p className="fine3" style={{ marginTop: 0 }}>
                  Chọn màu trước thì lưới size mới có cột để điền.
                </p>
              ) : (
                <table className="invgrid">
                  <thead>
                    <tr>
                      <th>Màu</th>
                      {SIZES.map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                      <th>Cộng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((c) => {
                      const rowTotal = SIZES.reduce((n, s) => n + (stock[c]?.[s] ?? 0), 0);
                      return (
                        <tr key={c}>
                          <td>
                            <i
                              className="swatch"
                              style={{ background: COLORS[c].hex }}
                              aria-hidden="true"
                            />
                            {COLORS[c].label}
                          </td>
                          {SIZES.map((s) => (
                            <td key={s}>
                              <span className="cell">
                                <input
                                  inputMode="numeric"
                                  aria-label={`${COLORS[c].label} ${s}`}
                                  value={stock[c]?.[s] ?? 0}
                                  onChange={(e) => setCell(c, s, e.target.value)}
                                />
                              </span>
                            </td>
                          ))}
                          <td>
                            <b>{rowTotal}</b>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {mode === "edit" && (
                <p className="fine3">
                  Sửa ở đây là sửa bản nháp. Đổi số trên kệ thật thì dùng “Điều chỉnh tồn kho” ở
                  bảng Mẫu — thao tác đó có lý do và vào nhật ký.
                </p>
              )}
            </div>
          </section>
        </div>

        <div>
          <section className="panel3">
            <h2>
              Ảnh<span className="meta">{values.photoKeys.length} bộ</span>
            </h2>
            <div className="bd">
              {values.photoKeys.length > 0 && (
                <div className="teasers" style={{ marginBottom: 12 }}>
                  {values.photoKeys.map((k) => (
                    <div className="t" key={k}>
                      <Image src={photoUrl(k, 120)} alt="" width={44} height={55} />
                    </div>
                  ))}
                </div>
              )}
              <div className="prep">
                <b>Kéo thả hoặc chọn tệp · ảnh tỉ lệ 4:5.</b> Chưa có ảnh sản phẩm thật, nên ảnh
                đang thấy là ảnh mượn tạm: một bộ cho mỗi màu.
              </div>
            </div>
          </section>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h2>
              Màu<span className="meta">{colors.length} màu</span>
            </h2>
            <div className="bd">
              {colors.length === 0 ? (
                <p className="fine3" style={{ marginTop: 0 }}>
                  Chưa chọn màu nào.
                </p>
              ) : (
                <div className="teasers">
                  {colors.map((c) => (
                    <span className="t" key={c}>
                      <i
                        className="swatch"
                        style={{ background: COLORS[c].hex }}
                        aria-hidden="true"
                      />
                      {COLORS[c].label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="formbar3">
        <span>
          Giá đang nhập: <b>{price === "" ? "chưa nhập" : `${plainVnd(Number(price))}₫`}</b> · lưới
          đang có <b>{onHandTotal}</b> chiếc
        </span>
        <ButtonLink tone="ink sm" icon="back" href="/admin/products">
          Huỷ
        </ButtonLink>
        <Button tone="sm" icon="check" onClick={() => setSaidNoServer(true)}>
          {mode === "new" ? "Lưu nháp" : "Lưu thay đổi"}
        </Button>
      </div>

      {saidNoServer && (
        <p className="note3" role="status">
          <Icon name="info" className="ic sm" />
          <span>
            Chưa nối máy chủ, nên chưa lưu được. Những gì vừa sửa đang nằm trong trình duyệt này và
            sẽ mất khi tải lại trang — màn hình này dựng để xem và thử, không phải để ghi.
          </span>
        </p>
      )}
    </>
  );
}
