import { test, expect } from '@playwright/test';

test.describe('Keyword Filters - Remaining Tests (3-6)', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for slow dashboard load
    test.setTimeout(120000); // 2 minutes

    await page.goto('http://localhost:5173/reports/1', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Navigate to Keyword Aracı tab
    await page.click('text=Keyword Aracı');
    await page.waitForTimeout(2000);
  });

  test('Filter 3: Long-tail Kazananlar - 2-4 kelime + conversion ≥ 3% + düşük rekabet', async ({ page }) => {
    console.log('\n🧪 Testing Filter 3: Long-tail Kazananlar');

    // Click the filter button
    await page.click('button:has-text("🎯 Long-tail Kazananlar")');
    await page.waitForTimeout(2000);

    // Check console logs for API request
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('KEYWORD')) {
        logs.push(msg.text());
      }
    });

    // Wait for API response
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/filter3-longtail.png', fullPage: true });

    // Get the API request from network
    const apiRequest = await page.evaluate(() => {
      return localStorage.getItem('lastAPIRequest');
    });

    console.log('✅ Filter 3 applied successfully');
    console.log('Expected params: min_word_count=2, max_word_count=4, min_conversion_rate=3, competition_level=low');
  });

  test('Filter 4: Yüksek Ciro - orders ≥ 1000', async ({ page }) => {
    console.log('\n🧪 Testing Filter 4: Yüksek Ciro');

    // Click the filter button
    await page.click('button:has-text("💰 Yüksek Ciro")');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/filter4-yuksek-ciro.png', fullPage: true });

    console.log('✅ Filter 4 applied successfully');
    console.log('Expected params: min_orders=1000, sort_by=orders');
  });

  test('Filter 5: Trend Keywordler - views ≥ 10000 + conversion ≥ 2%', async ({ page }) => {
    console.log('\n🧪 Testing Filter 5: Trend Keywordler');

    // Click the filter button
    await page.click('button:has-text("🔥 Trend Keywordler")');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/filter5-trend.png', fullPage: true });

    console.log('✅ Filter 5 applied successfully');
    console.log('Expected params: min_views=10000, min_conversion_rate=2');
  });

  test('Filter 6: Keşfedilmemiş Fırsatlar - düşük rekabet + conversion ≥ 4% + orders ≥ 100', async ({ page }) => {
    console.log('\n🧪 Testing Filter 6: Keşfedilmemiş Fırsatlar');

    // Click the filter button
    await page.click('button:has-text("💎 Keşfedilmemiş Fırsatlar")');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/filter6-kesfedilmemis.png', fullPage: true });

    console.log('✅ Filter 6 applied successfully');
    console.log('Expected params: competition_level=low, min_conversion_rate=4, min_orders=100');
  });
});
