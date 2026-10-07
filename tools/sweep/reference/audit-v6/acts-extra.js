    favToastVisible: async ({ page }) => {
      await page.locator("[data-ui='feed'] .fav:visible").first().click();
      await page.locator("[data-ui='feed'] .snack.on").waitFor({ timeout: 10000 });
    },
    remindToastRole: async ({ page, T }) => {
      await page.getByRole("button", { name: T("Nhắc tôi", "Remind me") }).first().click();
      await page.locator("[data-ui='feed'] .snack.on").waitFor({ timeout: 10000 });
    },
