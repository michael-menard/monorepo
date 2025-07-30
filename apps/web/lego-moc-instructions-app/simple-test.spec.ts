import { test, expect } from "@playwright/test"; test("simple test", async ({ page }) => { await expect(page).toBeTruthy(); });
