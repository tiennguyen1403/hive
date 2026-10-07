    // ── shop overlays and states (selectors from slices E1, E2, E3a) ──
    sortSheet: async ({ page }) => {
      await page.locator("[data-ui='feed'] .sort-btn").first().click();
      await page.locator("dialog[open]").last().waitFor();
    },
    quickAdd: async ({ page }) => {
      await page.locator("[data-ui='feed'] .gcard-add").first().click();
      await page.locator("dialog[open]").last().waitFor();
    },
    quickAddGuide: async ({ page }) => {
      await page.locator("[data-ui='feed'] .gcard-add").first().click();
      const d = page.locator("dialog[open]").last();
      await d.waitFor();
      await d.locator(".sh-label .link").click();
      await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 2);
    },
    added: async ({ page }) => {
      await page.locator("[data-ui='feed'] .gcard-add").first().click();
      const sheet = page.locator("dialog[open]").last();
      await sheet.waitFor();
      const cta = sheet.locator(".sh-cta");
      if (await cta.isDisabled()) await sheet.locator(".size input:not(:disabled)").first().check({ force: true });
      await cta.click();
      await page.locator("dialog[open] #added-title").waitFor();
    },
    pdpGuide: async ({ page }) => {
      await page.locator("[data-ui='feed'] .pinfo .sh-label .link").first().click();
      await page.locator("dialog[open]").last().waitFor();
    },
    pdpBuy: async ({ page }) => {
      const bar = page.locator("[data-ui='feed'] .buybar .btn:visible").first();
      if (await bar.count()) await bar.click();
      else await page.locator("[data-ui='feed'] .pinfo .btn-blue:visible").first().click();
      await page.waitForTimeout(600);
    },
    searchType: async ({ page, T }) => {
      await page.locator("[data-ui='feed'] .sform input").first().fill(T("hoodie", "hoodie"));
      await page.waitForTimeout(800);
    },
    pickProvince: async ({ page }) => {
      await page.locator("#f-province").click();
      await page.locator("dialog[open] .pick-opt").first().waitFor();
    },
    pickWard: async ({ page }) => {
      await page.locator("#f-province").click();
      const sheet = page.locator("dialog[open]").last();
      await sheet.locator(".pick-opt").first().waitFor();
      await sheet.locator(".pick-search input").fill("Hồ Chí Minh");
      await sheet.locator(".pick-opt", { hasText: "Hồ Chí Minh" }).first().click();
      await page.waitForTimeout(500);
      await page.locator("#f-ward").click();
      await page.locator("dialog[open] .pick-opt").first().waitFor();
    },
    coErrors: async ({ page }) => {
      await page.locator("#co-form button[type=submit]:visible").first().click();
      await page.locator(".field.is-error").first().waitFor();
    },
    coCard: async ({ page }) => {
      await page.locator("input[name=payment][value=CARD]").check({ force: true });
    },
    coExpressCod: async ({ page }) => {
      await page.locator("input[name=delivery][value=EXPRESS]").check({ force: true });
      await page.locator("input[name=payment][value=COD]").check({ force: true });
    },
    coPromoWrong: async ({ page }) => {
      await page.locator("#f-promo").fill("SAIMA");
      await page.locator(".promo-go").click();
      await page.locator("#e-promo").waitFor();
    },
    coPromoOk: async ({ page }) => {
      await page.locator("#f-promo").fill("DOT05");
      await page.locator(".promo-go").click();
      await page.locator(".promo-ok").waitFor();
    },
    cartRemoved: async ({ page }) => {
      await page.locator(".cline-rm").first().click();
      await page.locator("[data-ui='feed'] .snack.on").waitFor();
    },
    cartSwap: async ({ page }) => {
      await page.locator(".cline .pill-err").first().click();
      await page.locator("dialog[open]").last().waitFor();
    },
    trackErrors: async ({ page }) => {
      await page.locator(".b-trk-form button[type=submit]").click();
      await page.locator(".field.is-error").first().waitFor();
    },
    trackMismatch: async ({ page }) => {
      await page.locator("#f-code").fill("DH-2425");
      await page.locator("#f-phone").fill("0900000000");
      await page.locator(".b-trk-form button[type=submit]").click();
      await page.locator("#e-phone:not([hidden])").waitFor({ timeout: 15000 });
    },
    signErrors: async ({ page }) => {
      await page.locator(".si-form button[type=submit]").first().click();
      await page.locator(".si-form .field.is-error").first().waitFor();
    },
    signWrong: async ({ page }) => {
      await page.locator(".si-form input[name=email]").fill("minhanh@email.com");
      await page.locator(".si-form input[name=password]").fill("sai-mat-khau");
      await page.locator(".si-form button[type=submit]").first().click();
      await page.locator(".si-formerr").waitFor({ timeout: 15000 });
    },
    odCancel: async ({ page }) => {
      await page.locator(".od-cancel").first().click();
      await page.locator("dialog[open] .cancel-line").waitFor();
    },
    adAdd: async ({ page }) => {
      await page.locator("dialog[open] .sheet-form").waitFor();
    },
    adAddErrors: async ({ page }) => {
      const s = page.locator("dialog[open]").last();
      await s.locator(".sheet-form").waitFor();
      await s.locator(".sheet-form button[type=submit]").click();
      await s.locator(".field.is-error").first().waitFor();
    },
    adProvince: async ({ page }) => {
      await page.locator("dialog[open] .sheet-form").waitFor();
      await page.locator("#f-province").click();
      await page.locator("dialog[open] .pick-opt").first().waitFor();
    },
    pfPw: async ({ page }) => {
      await page.locator(".pf .me-rows .me-row").first().click();
      await page.locator("dialog[open] .sheet-form").waitFor();
    },
    pfErrors: async ({ page }) => {
      await page.locator(".pf input[name=name]").fill("");
      await page.locator(".pf input[name=phone]").fill("12");
      await page.locator(".pf-save").click();
      await page.locator(".pf .field.is-error").first().waitFor({ timeout: 15000 });
    },
    wlSize: async ({ page }) => {
      await page.locator(".b-sz:not(:disabled)").first().click();
      await page.locator("dialog[open]").last().waitFor();
    },
    favToast: async ({ page }) => {
      await page.locator("[data-ui='feed'] .fav").first().click();
      await page.locator("[data-ui='feed'] .snack.on").waitFor();
    },
    remindToast: async ({ page }) => {
      await page.locator("[data-ui='feed'] .soon .btn, [data-ui='feed'] .soon-lead .btn").first().click();
      await page.locator("[data-ui='feed'] .snack.on").waitFor();
    },
    langSwitch: async ({ page }) => {
      await page.locator("[data-ui='feed'] .ib-lang:visible").first().click();
      await page.waitForFunction(() => document.documentElement.lang === "en", null, { timeout: 15000 });
      await page.waitForTimeout(800);
    },
