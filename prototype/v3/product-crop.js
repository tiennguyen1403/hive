/* The crop sheet (round 7b, 24/09 — the user asked for a drag-to-crop frame).
   A 4:5 frame over the chosen file: drag it to move, drag a corner to resize
   (ratio locked), arrows to nudge, + and − to grow or shrink. Mock only. */
(function () {
  var sheet = document.getElementById("cropsheet");
  if (!sheet) return;
  var stage = sheet.querySelector("[data-cropper]"), img = stage.querySelector("img"), frame = stage.querySelector(".frame");
  var pending = null, scale = 1, drag = null;
  function F() { return window.PFORM; }

  function open(p) {
    pending = p;
    sheet.querySelector("[data-crop-name]").textContent = F().colors[p.c][0];
    img.onload = layout;
    img.src = p.src;
    window.openLayer("#cropsheet");
    if (img.complete && img.naturalWidth) layout();
  }
  function layout() {
    if (!pending || !img.clientWidth) return;
    scale = img.clientWidth / pending.nw;
    draw();
  }
  function clamp(c) {
    var nw = pending.nw, nh = pending.nh, minW = Math.min(200, nw, nh / 1.25);
    c.w = Math.max(minW, Math.min(c.w, nw, nh / 1.25)); c.h = c.w * 1.25;
    c.x = Math.max(0, Math.min(c.x, nw - c.w)); c.y = Math.max(0, Math.min(c.y, nh - c.h));
    return c;
  }
  function draw() {
    var c = clamp(pending.crop), f = F();
    frame.style.left = (img.offsetLeft + c.x * scale) + "px"; frame.style.top = (img.offsetTop + c.y * scale) + "px";
    frame.style.width = (c.w * scale) + "px"; frame.style.height = (c.h * scale) + "px";
    sheet.querySelector("[data-crop-preview]").style.cssText = f.cropStyle(pending, 120);
    var sw = f.saveW(c.w);
    sheet.querySelector("[data-crop-info]").innerHTML = "Vùng chọn <b>" + f.dims(c.w, c.h) + "</b><br>lưu " + f.dims(sw, sw * 1.25) +
      (c.w < 800 ? '<div class="err">' + f.icon("danger") + "<span>Hẹp hơn 800px, ảnh trên trang sẽ mờ</span></div>" : "");
  }
  function close() { pending = null; var x = sheet.querySelector("[data-crop-closer]"); if (x) x.click(); }
  function apply() {
    if (!pending) return;
    var p = pending, f = F();
    f.state.photos[p.c] = { kind: "file", name: p.name, bytes: p.bytes, src: p.src, nw: p.nw, nh: p.nh, crop: clamp(p.crop) };
    close(); f.render();
  }
  /* closing by the scrim, Esc or Huỷ keeps what was there: a freshly picked file is dropped */
  new MutationObserver(function () {
    if (sheet.hidden && pending) { if (pending.fresh) URL.revokeObjectURL(pending.src); pending = null; }
  }).observe(sheet, { attributes: true, attributeFilter: ["hidden"] });

  frame.addEventListener("pointerdown", function (e) {
    if (!pending) return;
    var h = e.target.getAttribute ? e.target.getAttribute("data-h") : null, c = pending.crop;
    drag = { mode: h || "move", sx: e.clientX, sy: e.clientY, s: { x: c.x, y: c.y, w: c.w, h: c.h } };
    frame.setPointerCapture(e.pointerId); frame.focus(); e.preventDefault();
  });
  frame.addEventListener("pointermove", function (e) {
    if (!drag || !pending) return;
    var dx = (e.clientX - drag.sx) / scale, dy = (e.clientY - drag.sy) / scale, s = drag.s, c;
    if (drag.mode === "move") c = { x: s.x + dx, y: s.y + dy, w: s.w, h: s.h };
    else {
      /* the corner opposite the handle stays put; the larger of the two pulls wins */
      var sx = drag.mode.indexOf("e") >= 0 ? 1 : -1, sy = drag.mode.indexOf("s") >= 0 ? 1 : -1;
      var tx = sx * dx, ty = sy * dy / 1.25, t = Math.abs(tx) >= Math.abs(ty) ? tx : ty;
      var right = s.x + s.w, bottom = s.y + s.h, nw = pending.nw, nh = pending.nh;
      var maxW = Math.min(sx > 0 ? nw - s.x : right, (sy > 0 ? nh - s.y : bottom) / 1.25);
      var w = Math.max(Math.min(200, maxW), Math.min(s.w + t, maxW)), h = w * 1.25;
      c = { x: sx > 0 ? s.x : right - w, y: sy > 0 ? s.y : bottom - h, w: w, h: h };
    }
    pending.crop = c; draw();
  });
  function endDrag(e) { if (drag) { drag = null; try { frame.releasePointerCapture(e.pointerId); } catch (x) {} } }
  frame.addEventListener("pointerup", endDrag);
  frame.addEventListener("pointercancel", endDrag);
  frame.addEventListener("keydown", function (e) {
    if (!pending) return;
    var step = e.shiftKey ? 40 : 8, c = pending.crop, k = e.key;
    if (k === "ArrowLeft") c.x -= step; else if (k === "ArrowRight") c.x += step;
    else if (k === "ArrowUp") c.y -= step; else if (k === "ArrowDown") c.y += step;
    else if (k === "+" || k === "=") { c.w *= 1.05; c.h = c.w * 1.25; }
    else if (k === "-") { c.w /= 1.05; c.h = c.w * 1.25; }
    else return;
    e.preventDefault(); draw();
  });
  sheet.addEventListener("click", function (e) {
    if (e.target.closest("[data-crop-apply]")) apply();
    else if (e.target.closest("[data-crop-reset]") && pending) { pending.crop = F().defaultCrop(pending.nw, pending.nh); draw(); }
  });
  window.addEventListener("resize", layout);
  window.CROP = { open: open };
})();
