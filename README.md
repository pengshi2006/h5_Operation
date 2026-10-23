# Playwright Codegen

本项目已配置 Playwright Codegen，用于录制浏览器操作并生成测试代码。

## 安装

```bash
npm install
npm run install:browser
```

第二条命令会安装与当前 Playwright 版本匹配的 Chromium。Linux 首次配置如果提示缺少系统依赖，可执行 `npx playwright install --with-deps chromium`。

## 开始录制

打开目标页面并显示 Codegen 窗口：

```bash
npm run codegen -- https://example.com
```

把录制结果直接保存到 `tests/generated.spec.ts`：

```bash
npm run codegen:save -- https://example.com
```

常用选项可以放在网址前面，例如保存登录状态：

```bash
npm run codegen -- --save-storage=auth/user.json https://example.com
```

复用已保存的登录状态：

```bash
npm run codegen -- --load-storage=auth/user.json https://example.com
```

Codegen 需要图形桌面；在无 GUI 的服务器或容器里，请在本地桌面终端执行录制命令。

## 验证配置

```bash
npm run check
npm run codegen -- --help
```

## 执行录制生成的 O9 流程

复制环境变量模板，并在本机填写新密码：

```bat
copy .env.example .env
notepad .env
```

首次执行建议使用有界面模式，以便手动完成 Microsoft MFA：

```bash
npm run test:workflow
```

成功登录后会把会话保存到 `auth/user.json`。后续可直接运行：

```bash
npm test
```

`.env` 和登录会话文件均已被 Git 忽略，不会提交到仓库。
