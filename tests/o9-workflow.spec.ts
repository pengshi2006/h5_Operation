import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const baseUrl = process.env.O9_BASE_URL ?? 'https://myvpp.o9solutions.com';
const profileName = process.env.O9_PROFILE ?? 'Peng Demo';
const tenantName = process.env.O9_TENANT ?? 'OIModelProd';
const exceptionName = process.env.O9_EXCEPTION ?? 'Nidec - Capacity Constraint';

const upstreamPath =
  '/kibo2#/W%20Network%20Management/Supply%20Chain%20Visualization/Upstream';
const dashboardPath =
  '/kibo2#/OI%20Planning%20Master%20Data/OI%20Data%20Exception/Dashboard/Supply%20Chain%20Network';

async function isVisible(locator: ReturnType<Page['locator']>) {
  return locator.isVisible().catch(() => false);
}

async function completeMicrosoftLogin(page: Page, context: BrowserContext) {
  const appHost = new URL(baseUrl).host;
  if (new URL(page.url()).host === appHost) {
    return;
  }

  const email = page.locator('input[type="email"], input[name="loginfmt"]').first();
  if (await isVisible(email)) {
    const username = process.env.O9_USERNAME;
    if (!username) {
      throw new Error('首次登录需要在 .env 中设置 O9_USERNAME。');
    }
    await email.fill(username);
    await page.locator('input[type="submit"], button:has-text("下一步"), button:has-text("Next")').first().click();
  }

  const password = page.locator('input[type="password"], input[name="passwd"]').first();
  if (await password.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false)) {
    const secret = process.env.O9_PASSWORD;
    if (!secret) {
      throw new Error('首次登录需要在 .env 中设置 O9_PASSWORD。');
    }
    await password.fill(secret);
    await page.locator('input[type="submit"], button:has-text("登录"), button:has-text("Sign in")').first().click();
  }

  console.log('如出现 MFA、安全密钥或验证器提示，请在浏览器中手动完成。');
  const deadline = Date.now() + 3 * 60 * 1_000;

  while (Date.now() < deadline) {
    if (new URL(page.url()).host === appHost) {
      await context.storageState({ path: 'auth/user.json' });
      return;
    }

    const skipFido = page.getByTestId('try-again-later-link');
    if (await isVisible(skipFido)) {
      await skipFido.click();
    }

    const staySignedIn = page.locator('#KmsiCheckboxField');
    if (await isVisible(staySignedIn)) {
      await staySignedIn.check();
    }

    const confirm = page.locator('#idSIButton9');
    if (await isVisible(confirm)) {
      await confirm.click();
    }

    await page.waitForTimeout(1_000);
  }

  throw new Error('Microsoft 登录或 MFA 在 3 分钟内未完成。请使用 headed 模式重试。');
}

test('切换 O9 资料和租户并打开供应链网络图', async ({ page, context }) => {
  await page.goto(`${baseUrl}${upstreamPath}`, { waitUntil: 'domcontentloaded' });
  await completeMicrosoftLogin(page, context);

  await expect(page).toHaveURL(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  await page.getByRole('button', { name: /My Profile/i }).click();
  await page.getByRole('button', { name: 'select', exact: true }).click();
  await page.getByText(profileName, { exact: false }).last().click();

  await page.getByRole('button', { name: /更改个人资料图片|Change profile picture/i }).click();
  await page.getByRole('listbox', { name: /切换租户|Switch tenant/i }).click();
  await page.getByText(tenantName, { exact: true }).last().click();
  await page.getByRole('button', { name: /好的|OK/i }).click();

  await page.goto(`${baseUrl}${dashboardPath}`, { waitUntil: 'domcontentloaded' });
  const search = page.getByRole('searchbox', { name: /搜索|Search/i });
  await expect(search).toBeVisible();
  await search.click();
  await page.getByText(exceptionName, { exact: false }).click();
  await page.getByText(/Network Graph and Supply/i).click();
  await page.getByRole('button', { name: /关闭|Close/i }).click();

  const fullScreen = page.locator('.o9con.o9con-full-screen');
  await expect(fullScreen).toBeVisible();
  await fullScreen.click();
});
