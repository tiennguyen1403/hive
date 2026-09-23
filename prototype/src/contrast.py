def lin(c):
    c = c/255
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def L(hx):
    hx = hx.lstrip('#')
    r,g,b = (int(hx[i:i+2],16) for i in (0,2,4))
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    la,lb = L(a),L(b)
    hi,lo = max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)

# Bang mau MAT ONG dang dung. Truoc day cho nay con giu cac cap cua huong
# xanh bien DA BI XOA — thuoc do hieu chinh theo mot du an khac thi do gi cung
# sai. Moi cap duoi day lay tu `:root` trong `app/globals.css`.
BG, INK, INK2 = "#FFFFFF", "#211D12", "#71674E"
FILL, FILL_INK, BAND = "#EBA400", "#211D12", "#FBE8BC"
MARK, LINK, LINE, HAIR, PLATE = "#C28800", "#9E6817", "#968B73", "#F4EBD7", "#FBF1DA"

pairs = [
 ("--- chu tren nen trang (4,5:1) ---", "#000000", "#FFFFFF", 0),
 ("ink on bg",            INK,  BG,    4.5),
 ("ink2 on bg",           INK2, BG,    4.5),
 ("link as text",         LINK, BG,    4.5),
 ("ink on plate",         INK,  PLATE, 4.5),
 ("ink2 on plate",        INK2, PLATE, 4.5),

 ("--- chu tren mang mau (4,5:1) ---", "#000000", "#FFFFFF", 0),
 ("fill-ink on fill",     FILL_INK, FILL, 4.5),
 ("white on fill",        "#FFFFFF", FILL, 4.5),   # PHAI FAIL: vang khong mang noi chu trang
 ("band-ink on band",     INK,  BAND,  4.5),
 ("fill-ink on mark",     FILL_INK, MARK, 4.5),
 ("white on hot",         "#FFFFFF", "#B61E32", 4.5),
 ("white on ok",          "#FFFFFF", "#1B6B3A", 4.5),
 ("white on warn",        "#FFFFFF", "#44505E", 4.5),
 ("white on info",        "#FFFFFF", "#0C6289", 4.5),

 ("--- vien dieu khien & do hoa (3:1) ---", "#000000", "#FFFFFF", 0),
 ("line (vien o nhap)",   LINE, BG,    3.0),
 ("mark (cot, vong chon)", MARK, BG,   3.0),
 ("fill (mang nut)",      FILL, BG,    3.0),       # PHAI FAIL: nen fill khong tu lam vien duoc
 ("fill-bd tren trang",   "#C28800", BG, 3.0),

 # Ke manh chi de chia khoi, khong mang thong tin va khong phai dieu khien,
 # nen WCAG khong doi nguong nao. In ra de BIET so, khong de cham diem —
 # nguong 0 la co y, dung nang len roi di "sua" cho dat.
 ("--- ke manh (khong co nguong) ---", "#000000", "#FFFFFF", 0),
 ("hair on bg",           HAIR, BG,    0),
]

for name,a,b,need in pairs:
    if name.startswith("---"):
        print(); print(name); continue
    v = cr(a,b)
    flag = "ok " if v >= need else "FAIL"
    print(f"  {flag} {v:5.2f}  (>= {need})  {name:22s} {a} on {b}")
