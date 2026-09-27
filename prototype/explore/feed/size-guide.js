/*
 * Bảng size, simulated measurements in cm: the tops by fit (HIVE.sizeChart: oversize, regular) and the trousers by
 * length (HIVE.pantsChart: long, and shorts with their own lengths), each chart with the pieces on sale in it and each
 * pair with one line on how to measure a piece already worn. A row of heights picks the sizes that suit one (the
 * "Hợp chiều cao" column, the same in every chart) and marks them in all four; when a height sits between two sizes,
 * the last line says how to choose.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const el = document.querySelector("[data-sg]");
  const FITS = ["OVERSIZE", "REGULAR"];
  const HEIGHTS = [155, 160, 165, 170, 175, 180, 185];
  const saved = F.store("height", null);
  const num = (n) => Number(n).toLocaleString("vi-VN");

  // "1m55-1m65" -> [155, 165]
  const range = (t) => {
    const m = String(t).match(/(\d)m(\d{2})\s*-\s*(\d)m(\d{2})/);
    return m ? [Number(m[1]) * 100 + Number(m[2]), Number(m[3]) * 100 + Number(m[4])] : null;
  };
  const label = (cm) => Math.floor(cm / 100) + "m" + H.pad(cm % 100);
  // The height column is the same in every chart.
  const sizesFor = (cm) => H.sizeChart(FITS[0]).filter((r) => { const x = range(r.height); return x && cm >= x[0] && cm <= x[1]; }).map((r) => r.size);

  // What is on sale now: tops by fit, trousers by length.
  const onSale = (F.LIVE ? H.ISSUE_05 : []).concat(H.FIXED).filter((s) => F.canBuy(s));
  const trousers = H.ISSUE_05.concat(H.FIXED).filter((s) => s.family === "PANTS");
  const LENGTHS = [
    { id: "long", title: "Quần dài", style: trousers.find((s) => !H.isShorts(s)), is: (s) => !H.isShorts(s) },
    { id: "short", title: "Quần short", style: trousers.find((s) => H.isShorts(s)), is: (s) => H.isShorts(s) },
  ];
  const names = (list) => (list.length ? `<p class="b-fit-names">${list.map((s) => F.esc(s.name)).join(", ")}</p>` : "");

  const head = (cols) => `<thead><tr><th scope="col">Size</th>${cols.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead>`;
  const topTable = (fit) => `<table class="fit-table">
      <caption class="vh">Áo ${H.FITS[fit].toLowerCase()}, số đo mô phỏng, cm</caption>
      ${head(["Ngang ngực", "Dài áo", "Ngang vai", "Hợp chiều cao"])}
      <tbody>${H.sizeChart(fit).map((r) => `<tr data-size="${r.size}"><td>${r.size}</td><td>${r.chest}</td><td>${r.length}</td><td>${r.shoulder}</td><td>${r.height}</td></tr>`).join("")}</tbody>
    </table>`;
  const pantsTable = (L) => `<table class="fit-table b-pants">
      <caption class="vh">${L.title}, số đo mô phỏng, cm</caption>
      ${head(["Vòng eo", "Vòng mông", "Dài quần", "Ngang đùi", "Hợp chiều cao"])}
      <tbody>${H.pantsChart(L.style).map((r) => `<tr data-size="${r.size}"><td>${r.size}</td><td>${num(r.waist)}</td><td>${num(r.hip)}</td><td>${num(r.length)}</td><td>${num(r.thigh)}</td><td>${r.height}</td></tr>`).join("")}</tbody>
    </table>`;

  const measure = (text) => `<p class="b-measure">${F.icon("ruler")}<span>${text}</span></p>`;

  el.innerHTML = `<div class="b-head"><h1 class="b-title disp">Bảng size</h1></div>
    <p class="b-sg-cap">Số đo mô phỏng, cm</p>
    <section class="b-hpick" aria-labelledby="h-height">
      <p class="sh-label" id="h-height">Chiều cao của bạn</p>
      <div class="chips" role="group" aria-labelledby="h-height">${HEIGHTS.map((h) => `<button class="chip" type="button" data-h="${h}" aria-pressed="false">${label(h)}</button>`).join("")}</div>
      <p class="b-hres" aria-live="polite" data-hres></p>
    </section>
    <div class="b-fits">
      ${FITS.map((fit) => `<section class="b-fit" aria-labelledby="fit-${fit}">
        <h2 class="b-fit-title disp" id="fit-${fit}">Áo ${H.FITS[fit].toLowerCase()}</h2>
        ${names(onSale.filter((s) => s.fit === fit && s.family !== "PANTS"))}
        ${topTable(fit)}
      </section>`).join("")}
      ${measure("Trải phẳng một chiếc áo đang mặc vừa, đo ngang ngực rồi so với cột Ngang ngực.")}
    </div>
    <div class="b-fits">
      ${LENGTHS.filter((L) => L.style).map((L) => `<section class="b-fit" aria-labelledby="fit-${L.id}">
        <h2 class="b-fit-title disp" id="fit-${L.id}">${L.title}</h2>
        ${names(onSale.filter((s) => s.family === "PANTS" && L.is(s)))}
        ${pantsTable(L)}
      </section>`).join("")}
      ${measure("Trải phẳng một chiếc quần đang mặc vừa: đo ngang cạp rồi nhân đôi để so với cột Vòng eo, đo từ cạp tới gấu để so với cột Dài quần.")}
    </div>
    <section class="b-tips" aria-labelledby="h-tips">
      <h2 class="sect-title" id="h-tips">Giữa hai size</h2>
      <p>Muốn vừa người, lấy size nhỏ. Muốn rộng, lấy size lớn.</p>
    </section>`;

  const res = el.querySelector("[data-hres]");
  function pick(cm) {
    const sizes = cm ? sizesFor(cm) : [];
    el.querySelectorAll("[data-h]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.h) === cm)));
    el.querySelectorAll("tr[data-size]").forEach((tr) => tr.classList.toggle("on", sizes.includes(tr.dataset.size)));
    res.innerHTML = sizes.length ? `Hợp size ${sizes.map((z) => `<b>${z}</b>`).join(" hoặc ")}` : "";
    saved.set(cm || null);
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-h]");
    if (!b) return;
    const cm = Number(b.dataset.h);
    pick(b.getAttribute("aria-pressed") === "true" ? null : cm);
  });

  // The phone bar shows the title once the page's own has scrolled away.
  const bar = document.querySelector(".mbar");
  if (bar && "IntersectionObserver" in window) {
    bar.classList.add("title-late");
    new IntersectionObserver(([en]) => bar.classList.toggle("title-on", !en.isIntersecting), { rootMargin: "-56px 0px 0px 0px" })
      .observe(el.querySelector(".b-title"));
  }

  const start = Number(saved.get());
  if (HEIGHTS.includes(start)) pick(start);
  F.boot();
})();
