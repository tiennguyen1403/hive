/* Mock runtime for the style form (round 7, 24/09): the seven colour chips,
   one photo slot per chosen colour, the cut grid, and a save button that
   names whatever is still missing. Mock only — the app builds this in React. */
(function () {
  var COLORS = {
    black: ["Đen", "#1C1C1C"], cream: ["Kem", "#E6DFD1"], grey: ["Xám", "#8C8C8C"], moss: ["Rêu", "#4A5240"],
    brown: ["Nâu", "#5C4536"], white: ["Trắng", "#F2F1ED"], navy: ["Xanh than", "#2B3A52"]
  };
  var PALETTE = ["black", "cream", "grey", "moss", "brown", "white", "navy"];
  var SIZES = ["S", "M", "L", "XL"];
  /* the 18 borrowed stand-ins the catalogue already wears (lib/photos.ts) */
  var LOANS = [["khoi", "KHÓI"], ["bui", "BỤI"], ["nguoi", "NGUỘI"], ["nang", "NẮNG"], ["suong", "SƯƠNG"], ["muoi", "MUỐI"],
    ["than", "THAN"], ["cat", "CÁT"], ["gio", "GIÓ"], ["da", "ĐÁ"], ["reu", "RÊU"], ["tro", "TRO"], ["song", "SÓNG"],
    ["vo", "VỎ"], ["mua", "MƯA"], ["kho", "KHÔ"], ["dat", "ĐẤT"], ["lua", "LỬA"]];

  var root = document.querySelector("[data-pform]");
  if (!root) return;
  var mode = root.getAttribute("data-mode") || "new";
  var S = JSON.parse(document.getElementById("pform-state").textContent);
  var picking = null;   /* colour whose borrowed grid is open */
  var busy = false;     /* the fake upload is running */
  var saved = false;

  function icon(n, cls) { return window.iconHtml ? window.iconHtml(n, { cls: cls === undefined ? "sm" : cls }) : ""; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function size(bytes) { return bytes >= 1048576 ? (bytes / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.round(bytes / 1024) + " KB"; }
  function loanName(key) { for (var i = 0; i < LOANS.length; i++) if (LOANS[i][0] === key) return LOANS[i][1]; return key; }
  function photo(c) { return S.photos[c] || { kind: "none" }; }
  function rowTotal(c) { var n = 0; SIZES.forEach(function (s) { n += (S.cells[c] && S.cells[c][s]) || 0; }); return n; }
  function grand() { var n = 0; S.order.forEach(function (c) { n += rowTotal(c); }); return n; }
  function missing() { return S.order.filter(function (c) { return photo(c).kind === "none"; }); }
  function loans() { return S.order.filter(function (c) { return photo(c).kind === "loan"; }); }
  function files() { return S.order.filter(function (c) { return photo(c).kind === "file"; }); }
  /* v3.js listens for clicks on [data-sim] anywhere under .s.adm3: toast + count */
  function toast(msg) { var b = document.createElement("button"); b.type = "button"; b.hidden = true; b.setAttribute("data-sim", msg); root.appendChild(b); b.click(); b.remove(); }

  function fileBtn(c, label) {
    return '<label class="btn3 sec sm">' + esc(label) + '<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" data-file="' + c + '" aria-label="' + esc(label) + " cho " + COLORS[c][0] + '"></label>';
  }
  function lnk(c, act, label) { return '<button type="button" class="lnk" data-act="' + act + '" data-c="' + c + '">' + esc(label) + "</button>"; }
  function fileLnk(c, label) { return '<label class="lnk">' + esc(label) + '<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" data-file="' + c + '" aria-label="' + esc(label) + " cho " + COLORS[c][0] + '"></label>'; }
  function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }
  function dims(w, h) { return fmt(w) + "×" + fmt(h); }
  function saveW(w) { return Math.min(1200, Math.round(w)); }
  function defaultCrop(nw, nh) { var w = Math.min(nw, nh / 1.25), h = w * 1.25; return { x: (nw - w) / 2, y: (nh - h) / 2, w: w, h: h }; }
  /* the chosen region, drawn into a 4:5 box of height H by positioning the whole image behind it */
  function cropStyle(p, H) { var k = H / p.crop.h; return "background-image:url(" + p.src + ");background-size:" + (p.nw * k).toFixed(1) + "px auto;background-position:" + (-p.crop.x * k).toFixed(1) + "px " + (-p.crop.y * k).toFixed(1) + "px;background-repeat:no-repeat"; }
  function measure(src, cb) { var im = new Image(); im.onload = function () { cb(im.naturalWidth, im.naturalHeight); }; im.src = src; }

  function slotHtml(c, i) {
    var p = photo(c), name = COLORS[c][0], n = S.order.length, shot, file, acts;
    if (p.kind === "file") {
      shot = '<span class="shot"' + (p.crop ? ' style="' + cropStyle(p, 120) + '"' : "") + ">" + (p.crop ? "" : '<img src="' + esc(p.src) + '" alt="">') + '<span class="prog" hidden><i></i></span></span>';
      file = "<b>" + esc(p.name) + "</b> · " + size(p.bytes) + (p.crop ? " · vùng cắt " + dims(p.crop.w, p.crop.h) + " · lưu " + dims(saveW(p.crop.w), saveW(p.crop.w) * 1.25) : " · đang đọc ảnh…");
      acts = '<button type="button" class="btn3 sec sm" data-act="crop" data-c="' + c + '">Khung cắt</button>' + fileLnk(c, "Đổi ảnh") + lnk(c, "loan", "Mượn tạm");
    } else if (p.kind === "loan") {
      shot = '<span class="shot"><img src="../v2/img/' + p.key + '.webp" alt=""><span class="prog" hidden><i></i></span></span>';
      file = '<span class="tag3 shut"><i></i>mượn tạm</span> ảnh của mẫu ' + loanName(p.key) + " · thay bằng ảnh thật khi có";
      acts = fileBtn(c, "Tải ảnh thật") + lnk(c, "loan", "Đổi ảnh mượn");
    } else {
      shot = '<span class="shot blank">' + icon("gallery", "") + "</span>";
      file = "Chưa có ảnh · JPG, PNG hoặc WebP, tối đa 10 MB · kéo thả vào ô hoặc chọn tệp";
      acts = fileBtn(c, "Chọn tệp") + lnk(c, "loan", "Mượn tạm");
    }
    var ord = '<span class="ord">' +
      '<button type="button" data-move="' + c + '" data-dir="-1" aria-label="Đưa ' + name + ' lên trước"' + (i === 0 ? " disabled" : "") + ">" + icon("down", "sm flip") + "</button>" +
      '<button type="button" data-move="' + c + '" data-dir="1" aria-label="Đưa ' + name + ' xuống sau"' + (i === n - 1 ? " disabled" : "") + ">" + icon("down") + "</button>" +
      (mode === "new" ? '<button type="button" data-unpick="' + c + '" aria-label="Bỏ màu ' + name + '">' + icon("x") + "</button>" : "") + "</span>";
    var pick = "";
    if (picking === c) {
      pick = '<div class="photopick" role="radiogroup" aria-label="Ảnh mượn tạm cho ' + name + '">' + LOANS.map(function (l) {
        var on = p.kind === "loan" && p.key === l[0];
        return '<button type="button" role="radio" aria-checked="' + on + '" aria-label="Ảnh của ' + l[1] + '" data-loan="' + c + '" data-key="' + l[0] + '"' + (on ? ' class="on"' : "") + '><img src="../v2/img/' + l[0] + '.webp" alt=""></button>';
      }).join("") + "</div>";
    }
    return '<div class="cslot" data-slot="' + c + '">' + shot + '<div><div class="hd"><i class="swatch" style="background:' + COLORS[c][1] + '"></i><b>' + name + "</b>" + ord + '</div><div class="file">' + (i === 0 ? "Ảnh đại diện · " : "") + file + '</div><div class="acts">' + acts + "</div>" + pick + "</div></div>";
  }

  function renderChips() {
    var box = root.querySelector("[data-chips]");
    if (!box) return;
    box.innerHTML = PALETTE.map(function (c) {
      var i = S.order.indexOf(c), on = i >= 0;
      return '<button type="button" class="chip3' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-chip="' + c + '"><i class="dot" style="background:' + COLORS[c][1] + '"></i>' + COLORS[c][0] + (on ? '<span class="pos">' + (i + 1) + "</span>" : "") + "</button>";
    }).join("");
  }
  function renderSlots() {
    root.querySelector("[data-slots]").innerHTML = S.order.map(slotHtml).join("");
  }
  function renderGrid() {
    var table = root.querySelector("[data-grid]"), none = root.querySelector("[data-grid-none]");
    table.hidden = !S.order.length; none.hidden = !!S.order.length;
    table.querySelector("tbody").innerHTML = S.order.map(function (c) {
      return '<tr data-row="' + c + '"><td><i class="swatch" style="background:' + COLORS[c][1] + '"></i>' + COLORS[c][0] + "</td>" + SIZES.map(function (s) {
        return '<td><span class="cell"><input inputmode="numeric" value="' + ((S.cells[c] && S.cells[c][s]) || 0) + '" aria-label="' + COLORS[c][0] + " " + s + '" data-cell="' + c + "/" + s + '"></span></td>';
      }).join("") + "<td><b data-total>" + rowTotal(c) + "</b></td></tr>";
    }).join("");
    renderTotals();
  }
  function renderTotals() {
    S.order.forEach(function (c) { var b = root.querySelector('[data-row="' + c + '"] [data-total]'); if (b) b.textContent = rowTotal(c); });
    root.querySelector("[data-cut-meta]").textContent = mode === "new" ? "tổng " + grand() + " chiếc" : "đã cắt " + S.cut + " · còn " + grand();
  }
  function renderBar() {
    var n = S.order.length, miss = missing(), lo = loans();
    root.querySelector("[data-ca-meta]").textContent = !n ? "chưa chọn màu" : n + " màu · " + (miss.length ? "thiếu " + miss.length + " ảnh" : lo.length ? lo.length + " ảnh mượn tạm" : "đủ ảnh");
    var name = (root.querySelector("#p-name") || { value: "" }).value, price = (root.querySelector("#p-price") || { value: "" }).value;
    var block = null;
    if (mode === "new" && !saved) {
      if (!name.trim()) block = "Nhập tên mẫu";
      else if (!price.trim()) block = "Nhập giá bán";
      else if (!n) block = "Chọn màu";
      else {
        var zero = S.order.filter(function (c) { return rowTotal(c) === 0; });
        if (zero.length) block = "Điền số cắt cho " + COLORS[zero[0]][0];
        else if (miss.length) block = "Chọn ảnh cho " + COLORS[miss[0]][0];
      }
    }
    var btn = root.querySelector("[data-save]");
    btn.disabled = !!block || busy || saved;
    btn.innerHTML = saved ? icon("check") + (mode === "new" ? "Đã tạo" : "Đã lưu") : block ? esc(block) : icon("check") + (mode === "new" ? "Tạo mẫu · " + grand() + " chiếc" : "Lưu thay đổi");
    root.querySelector("[data-bar]").innerHTML = mode === "new"
      ? "Giá đang nhập: <b>" + (price.trim() ? esc(price) + "₫" : "chưa nhập") + "</b> · <b>" + n + "</b> màu · lưới <b>" + grand() + "</b> chiếc" + (miss.length ? " · <b>" + miss.length + "</b> ảnh chưa có" : lo.length ? " · <b>" + lo.length + "</b> ảnh mượn tạm" : "")
      : "Giá: <b>" + esc(price) + "₫</b> · còn <b>" + grand() + "</b> / " + S.cut + " chiếc" + (lo.length ? " · <b>" + lo.length + "</b> ảnh mượn tạm" : "");
  }
  function renderAll() { renderChips(); renderSlots(); renderGrid(); renderBar(); }

  function setFile(c, f) {
    if (!f || !/^image\//.test(f.type)) { toast("Chỉ nhận JPG, PNG hoặc WebP"); return; }
    if (f.size > 10 * 1048576) { toast("Tệp quá 10 MB · chọn ảnh nhỏ hơn"); return; }
    var src = URL.createObjectURL(f);
    measure(src, function (nw, nh) {
      picking = null;
      window.CROP.open({ c: c, name: f.name, bytes: f.size, src: src, nw: nw, nh: nh, crop: defaultCrop(nw, nh), fresh: true });
    });
  }
  function fakeUpload(done) {
    var up = files(), n = up.length, k = 0, bar = root.querySelector("[data-bar]");
    if (!n) { done(); return; }
    busy = true; renderBar();
    function step() {
      var c = up[k], prog = root.querySelector('[data-slot="' + c + '"] .prog');
      if (prog) { prog.hidden = false; prog.querySelector("i").style.width = "100%"; }
      bar.innerHTML = "Đang tải ảnh lên… <b>" + (k + 1) + "</b> / " + n;
      k += 1;
      if (k < n) setTimeout(step, 600); else setTimeout(function () { busy = false; done(); }, 500);
    }
    step();
  }

  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-chip], [data-move], [data-unpick], [data-act], [data-loan], [data-save]");
    if (!t || t.disabled) return;
    if (t.hasAttribute("data-chip")) {
      var c = t.getAttribute("data-chip"), i = S.order.indexOf(c);
      if (i < 0) { S.order.push(c); if (!S.cells[c]) S.cells[c] = {}; }
      else { S.order.splice(i, 1); if (rowTotal(c)) toast("Đã bỏ " + COLORS[c][0] + " · " + rowTotal(c) + " chiếc đã điền xoá theo"); S.cells[c] = {}; delete S.photos[c]; }
      if (picking === c) picking = null;
      renderAll();
    } else if (t.hasAttribute("data-unpick")) {
      var u = t.getAttribute("data-unpick"), ui = S.order.indexOf(u);
      if (ui >= 0) { S.order.splice(ui, 1); if (rowTotal(u)) toast("Đã bỏ " + COLORS[u][0] + " · " + rowTotal(u) + " chiếc đã điền xoá theo"); S.cells[u] = {}; delete S.photos[u]; }
      if (picking === u) picking = null;
      renderAll();
    } else if (t.hasAttribute("data-move")) {
      var m = t.getAttribute("data-move"), d = parseInt(t.getAttribute("data-dir"), 10), mi = S.order.indexOf(m), to = mi + d;
      if (mi < 0 || to < 0 || to >= S.order.length) return;
      S.order.splice(mi, 1); S.order.splice(to, 0, m);
      renderAll();
      var again = root.querySelector('[data-move="' + m + '"][data-dir="' + d + '"]');
      if (again && !again.disabled) again.focus();
    } else if (t.hasAttribute("data-act")) {
      var a = t.getAttribute("data-act"), ac = t.getAttribute("data-c");
      if (a === "crop") { var cp = photo(ac); if (cp.crop) window.CROP.open({ c: ac, name: cp.name, bytes: cp.bytes, src: cp.src, nw: cp.nw, nh: cp.nh, crop: { x: cp.crop.x, y: cp.crop.y, w: cp.crop.w, h: cp.crop.h }, fresh: false }); return; }
      if (a === "loan") picking = picking === ac ? null : ac;
      if (a === "drop") { S.photos[ac] = { kind: "none" }; if (picking === ac) picking = null; }
      renderSlots(); renderBar();
    } else if (t.hasAttribute("data-loan")) {
      var lc = t.getAttribute("data-loan");
      S.photos[lc] = { kind: "loan", key: t.getAttribute("data-key") };
      picking = null; renderSlots(); renderBar();
    } else if (t.hasAttribute("data-save")) {
      var nUp = files().length;
      fakeUpload(function () {
        saved = true; renderBar();
        var nm = (root.querySelector("#p-name") || { value: "" }).value.trim().toUpperCase();
        toast(mode === "new"
          ? "Đã tạo " + nm + " · " + S.order.length + " màu · " + grand() + " chiếc" + (nUp ? " · " + nUp + " ảnh tải lên" : "") + " · ghi nhật ký"
          : "Đã lưu " + nm + (nUp ? " · " + nUp + " ảnh thật thay ảnh mượn" : "") + " · ghi nhật ký");
        root.querySelector("[data-bar]").innerHTML = mode === "new"
          ? "Đã tạo · <b>" + esc(nm) + "</b> hiện ở bảng Mẫu" + (nUp ? " · " + nUp + " ảnh đã tải lên" : "")
          : "Đã lưu · thứ tự dải màu" + (nUp ? " và " + nUp + " ảnh mới" : "") + " đã ghi";
      });
    }
  });
  root.addEventListener("change", function (e) {
    var f = e.target.closest("[data-file]");
    if (f) { setFile(f.getAttribute("data-file"), f.files && f.files[0]); f.value = ""; }
  });
  root.addEventListener("input", function (e) {
    var cell = e.target.closest("[data-cell]");
    if (cell) {
      var parts = cell.getAttribute("data-cell").split("/"), v = Math.max(0, Math.min(999, parseInt(cell.value.replace(/\D/g, ""), 10) || 0));
      if (!S.cells[parts[0]]) S.cells[parts[0]] = {};
      S.cells[parts[0]][parts[1]] = v;
      renderTotals(); renderBar();
      return;
    }
    if (e.target.id === "p-name" || e.target.id === "p-price") renderBar();
  });
  /* drag a file onto the photo box */
  root.addEventListener("dragover", function (e) { var s = e.target.closest(".shot"); if (s) { e.preventDefault(); s.classList.add("over"); } });
  root.addEventListener("dragleave", function (e) { var s = e.target.closest(".shot"); if (s) s.classList.remove("over"); });
  root.addEventListener("drop", function (e) {
    var s = e.target.closest(".shot"); if (!s) return;
    e.preventDefault(); s.classList.remove("over");
    var slot = s.closest("[data-slot]"); if (slot && e.dataTransfer && e.dataTransfer.files[0]) setFile(slot.getAttribute("data-slot"), e.dataTransfer.files[0]);
  });

  renderAll();
  /* a sample file arrives without its size: read it, then give it the largest centred 4:5 frame */
  S.order.forEach(function (c) { var p = photo(c); if (p.kind === "file" && !p.crop) measure(p.src, function (nw, nh) { p.nw = nw; p.nh = nh; p.crop = defaultCrop(nw, nh); renderSlots(); }); });
  window.PFORM = { state: S, colors: COLORS, icon: icon, dims: dims, saveW: saveW, defaultCrop: defaultCrop, cropStyle: cropStyle, render: function () { renderSlots(); renderBar(); } };
})();
