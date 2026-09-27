/*
 * Listing ("Cửa hàng"): the lines follow the shop's moment. While Số 05 is open: all, Số 05 (default) or the fixed
 * line. Once it has closed: the fixed line (default) and Số 05, shown closed. Filter by type, sort; the view lives
 * in the query (?dong=so-05&loai=hoodie&sap-xep=gia-tang, plus ?state=) so a reload or a shared link opens it again.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const LINE = { "tat-ca": "all", "so-05": "05", "co-dinh": "fixed" };
  const TYPE = { "ao-thun": "TEE", hoodie: "HOODIE", khoac: "JACKET", "so-mi": "SHIRT", quan: "PANTS", gile: "VEST" };
  const SORT = { "moi-nhat": "new", "gia-tang": "asc", "gia-giam": "desc" };
  const back = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));

  const q = new URLSearchParams(location.search);
  const lines = F.shopLines(true);
  const state = {
    line: LINE[q.get("dong")] || lines[F.LIVE ? 1 : 0],
    fam: TYPE[q.get("loai")] || "ALL",
    sort: SORT[q.get("sap-xep")] || "new",
  };

  F.shop(document.querySelector("[data-shop]"), {
    lines,
    sort: true,
    title: "Cửa hàng",
    h: "h2",
    state,
    onChange(st) {
      const p = new URLSearchParams();
      p.set("dong", back(LINE)[st.line]);
      if (st.fam !== "ALL") p.set("loai", back(TYPE)[st.fam]);
      if (st.sort !== "new") p.set("sap-xep", back(SORT)[st.sort]);
      if (F.MODE !== "open") p.set("state", F.MODE);
      history.replaceState(null, "", "?" + p.toString());
    },
  });

  F.boot();
})();
