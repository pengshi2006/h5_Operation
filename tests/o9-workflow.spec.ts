import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';

const baseUrl = process.env.O9_BASE_URL ?? 'https://myvpp.o9solutions.com';
const profileName = process.env.O9_PROFILE ?? 'Peng Demo';
const tenantName = process.env.O9_TENANT ?? 'OIModelProd';
const exceptionName = process.env.O9_EXCEPTION ?? 'Nidec - Capacity Constraint';

const upstreamPath =
  '/kibo2#/W%20Network%20Management/Supply%20Chain%20Visualization/Upstream';
const dashboardPath =
  '/kibo2#/OI%20Planning%20Master%20Data/OI%20Data%20Exception/Dashboard/Supply%20Chain%20Network';

async function isVisible(locator: Locator) {
  return locator.isVisible().catch(() => false);
}

async function completeMicrosoftLogin(page: Page, context: BrowserContext) {
  const appHost = new URL(baseUrl).host;
  const profileButton = page.getByRole('button', { name: /My Profile/i });
  const email = page.locator('input[type="email"], input[name="loginfmt"]').first();
  const password = page.locator('input[type="password"], input[name="passwd"]').first();

  const initialState = await Promise.any([
    profileButton.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'authenticated' as const),
    email.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'email' as const),
    password.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'password' as const),
  ]).catch(() => {
    throw new Error(`无法识别登录页面，当前地址：${page.url()}`);
  });

  if (initialState === 'authenticated') {
    return;
  }

  if (initialState === 'email') {
    const username = process.env.O9_USERNAME;
    if (!username || username === 'someone@example.com') {
      throw new Error('首次登录需要在 .env 中设置 O9_USERNAME。');
    }
    await email.fill(username);
    await page.locator('input[type="submit"], button:has-text("下一步"), button:has-text("Next")').first().click();
  }

  if (await password.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false)) {
    const secret = process.env.O9_PASSWORD;
    if (!secret || secret === 'replace-with-your-new-password') {
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

  const profileSearch = page
    .getByRole('searchbox', { name: /搜索|Search/i })
    .filter({ visible: true })
    .first();

  if (!(await isVisible(profileSearch))) {
    const username = process.env.O9_USERNAME;
    if (!username || username === 'someone@example.com') {
      throw new Error('选择资料时需要在 .env 中设置 O9_USERNAME。');
    }

    const accountCard = page.getByText(username, { exact: false }).filter({ visible: true }).first();
    await expect(accountCard).toBeVisible();
    await accountCard.click();
  }

  await expect(profileSearch).toBeVisible();
  await profileSearch.fill(profileName);
  await page.getByText(profileName, { exact: false }).filter({ visible: true }).last().click();

  await page.getByRole('button', { name: /更改个人资料图片|Change profile picture/i }).click();
  await page.getByRole('listbox', { name: /切换租户|Switch tenant/i }).click();
  await page.getByText(tenantName, { exact: true }).last().click();
  await page.getByRole('button', { name: /好的|OK/i }).click();

  await page.goto(`${baseUrl}${dashboardPath}`, { waitUntil: 'domcontentloaded' });
  const search = page.getByRole('searchbox', { name: /搜索|Search/i }).filter({ visible: true }).first();
  await expect(search).toBeVisible();
  await search.click();
  await page.getByText(exceptionName, { exact: false }).click();
  await page.getByText(/Network Graph and Supply/i).click();
  await page.getByRole('button', { name: /关闭|Close/i }).click();

  const fullScreen = page.locator('.o9con.o9con-full-screen');
  await expect(fullScreen).toBeVisible();
  await fullScreen.click();
});
