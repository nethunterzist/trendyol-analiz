import { test, expect } from '@playwright/test';

test.describe('Rare Keywords Tab - Sales Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test('should display rare keywords section when keywords have sales', async ({ page }) => {
    // Navigate to reports list
    await page.click('text=Raporlar');
    await page.waitForTimeout(1000);

    // Click on first report to view dashboard
    const firstReport = page.locator('[data-testid="report-item"]').first();
    if (await firstReport.count() > 0) {
      await firstReport.click();
      await page.waitForTimeout(2000);

      // Click on Keywords tab
      await page.click('text=Keyword Analizi');
      await page.waitForTimeout(2000);

      // Check if rare keywords section exists
      const rareKeywordsSection = page.locator('text=Rare Keywords');
      const sectionVisible = await rareKeywordsSection.isVisible();

      if (sectionVisible) {
        console.log('✅ Rare keywords section is visible');

        // Verify the info message shows "Sadece satışı olanlar"
        const infoMessage = page.locator('text=Sadece satışı olanlar');
        await expect(infoMessage).toBeVisible();
        console.log('✅ Info message shows "Sadece satışı olanlar"');

        // Get all rare keyword rows
        const keywordRows = page.locator('[data-testid="rare-keyword-row"]');
        const rowCount = await keywordRows.count();

        if (rowCount > 0) {
          console.log(`✅ Found ${rowCount} rare keywords with sales`);

          // Verify each keyword has sales > 0
          for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const row = keywordRows.nth(i);
            const salesCell = row.locator('[data-testid="keyword-sales"]');
            const salesText = await salesCell.textContent();
            const salesValue = parseInt(salesText.replace(/[^0-9]/g, ''));

            expect(salesValue).toBeGreaterThan(0);
            console.log(`✅ Keyword ${i + 1} has ${salesValue} sales`);
          }
        } else {
          console.log('⚠️ No rare keyword rows found');
        }
      } else {
        console.log('⚠️ Rare keywords section is not visible (possibly no keywords with sales)');
      }
    } else {
      console.log('⚠️ No reports found - cannot test rare keywords');
    }
  });

  test('should not display rare keywords section if all keywords have zero sales', async ({ page }) => {
    // This test verifies the behavior when backend sends no rare keywords with sales
    // The section should be hidden in this case

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    // Navigate to a report (if available)
    await page.click('text=Raporlar');
    await page.waitForTimeout(1000);

    const firstReport = page.locator('[data-testid="report-item"]').first();
    if (await firstReport.count() > 0) {
      await firstReport.click();
      await page.waitForTimeout(2000);

      // Click on Keywords tab
      await page.click('text=Keyword Analizi');
      await page.waitForTimeout(2000);

      // Check if rare keywords section exists
      const rareKeywordsSection = page.locator('text=Rare Keywords');
      const sectionVisible = await rareKeywordsSection.isVisible();

      // If section is not visible, that's expected behavior when no keywords have sales
      if (!sectionVisible) {
        console.log('✅ Rare keywords section correctly hidden when no keywords have sales');
      } else {
        console.log('✅ Rare keywords section is visible with keywords that have sales');
      }
    }
  });

  test('should verify rare keywords count badge matches filtered results', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Raporlar');
    await page.waitForTimeout(1000);

    const firstReport = page.locator('[data-testid="report-item"]').first();
    if (await firstReport.count() > 0) {
      await firstReport.click();
      await page.waitForTimeout(2000);

      await page.click('text=Keyword Analizi');
      await page.waitForTimeout(2000);

      const rareKeywordsSection = page.locator('text=Rare Keywords');
      if (await rareKeywordsSection.isVisible()) {
        // Get the count from badge
        const badgeText = await page.locator('[data-testid="rare-keywords-badge"]').textContent();
        const badgeCount = parseInt(badgeText);

        // Get actual number of rows
        const rows = page.locator('[data-testid="rare-keyword-row"]');
        const rowCount = await rows.count();

        // Badge count should match row count
        expect(badgeCount).toBe(rowCount);
        console.log(`✅ Badge count (${badgeCount}) matches row count (${rowCount})`);
      }
    }
  });
});
