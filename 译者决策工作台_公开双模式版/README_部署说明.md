# 译者决策工作台 — 公开双模式版

## 两种模式

- **离线编辑**（默认）：完全不请求 AI 接口；原文、初译、手动建议稿、差异对比、决策日志和 JSON 备份在当前浏览器使用。直接双击 `index.html` 也可以离线工作。
- **在线 AI 辅助**：打开已部署的网站，在顶部切换模式后可调用 AI 审校或多轮追问；无需访客自己配置 API Key。只有主动发起 AI 请求时，当前文本才会传送至网站后端、Agnes。

两种模式使用相同的浏览器本地项目记录。**项目不会自动跨设备同步**。切换模式不删除记录；建议定期导出 JSON。

## 部署到 Vercel

1. 把 `index.html`、`api/` 文件夹与 `vercel.json` 放入同一 GitHub 仓库根目录，导入 Vercel 新项目。
2. Vercel 的 Framework Preset 选择 **Other**。根目录设为仓库根目录；无须 Build Command。
3. 在 Vercel Project Settings → Environment Variables 中添加以下变量（**只在服务端设置，严禁加入 HTML 或提交 GitHub**）：

   - `AGNES_API_KEY`：在 Agnes 平台创建的中国站 API Key。
   - `CHAT_ENABLED`：`true`，启用公共 AI；设置为 `false` 即临时关闭。
   - `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`：Upstash Redis 数据库的 REST 连接信息，供公共调用计数。需要自行注册并创建数据库；免费额度及政策以服务商后台为准。
   - `QUOTA_SALT`：随机长字符串，用于对用户来源地址生成不可直接识别的散列。
   - `DAILY_LIMIT_PER_IP`：默认 `8`，按来源 IP 计数（同网络的用户可能共用额度）。
   - `DAILY_GLOBAL_LIMIT`：默认 `200`，全站每日共享最大请求数。

4. 保存变量后重新部署。访问 `https://你的域名/api/health`，显示 `{ "ready": true }` 表示后端配置已启用；但还需点击网站的“测试聊天连接”确认上游模型能实际生成内容。
5. 将 Vercel 生成的网址发给其他人。对方打开同一个网站，即可自行选择模式；无需下载、安装 Python 或配置密钥。

## 公开运行须知

- 用户请求会发送至公共后端、Agnes AI；请避免提交未获授权的保密数据。
- **这是供小范围共享的基本防护方案，不是抗滥用保证。** 通过同源检查、消息尺寸限制、IP 每日配额、全局配额控制用量。公共匿名用户仍可能通过切换 IP、自动化请求等规避限制。大范围开放前应增加机器人校验（如 Turnstile）、账号额度、服务端监测和人工停用机制。
- 配额存储不可用时，API 拒绝调用，不会无保护地持续消耗 Agnes 额度。
- Upstash 与 Agnes 的实际免费额度、调用权限需要单独核实；**免费 API 不等于无限制免费公开服务**。
- 这是前后端代码及部署说明，**尚未部署到公网**。需要你登录自己的 Vercel / GitHub / Redis 服务完成部署和配置。
- 不再需要之前的 Python 启动脚本。在线 AI 功能由 Vercel 的 `api/chat.js` 托管。
