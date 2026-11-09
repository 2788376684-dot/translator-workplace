# Translator Workplace：账户与云端用户数据

本功能已包含登录、注册、退出、手动备份、恢复和备份下载页面。当前使用 Supabase Auth（邮箱＋密码）及 Supabase Postgres 行级权限策略（RLS）。如果服务尚未配置，账户页面会显示“账户服务尚未配置”，已有离线翻译工作台不受影响。

## 必须完成的外部配置

1. 在 https://supabase.com/dashboard 创建自己的项目。
2. 在该项目 SQL Editor 中运行同目录 `account-schema.sql`。它创建 `tw_workspace_snapshots` 表并按 `auth.uid()` 限定每位用户只能读写自己的数据。**必须启用 RLS 和正确执行策略**。
3. 在 Supabase → Authentication → Providers 启用 Email 登录；建议启用邮箱验证，设置允许的应用域名和必要的邮件发送服务。
4. 复制 Project URL 和客户端公开 anon key（仅发布级 key，**严禁 service_role key**）。
5. 在 Vercel 项目 `translator-workplace` → Settings → Environment Variables 新增：
   - `SUPABASE_URL`：你的 Supabase 项目 URL，例如 `https://project-id.supabase.co`。
   - `SUPABASE_ANON_KEY`：对应项目的 **anon public key**。不要使用 service role secret。
6. 将变量作用范围设为 Production，并重新部署。访问 `/account.html`，先注册邮箱账号、验证邮箱、再登录。测试用 A 用户保存一个工作区，再用 B 用户登录，确认无法读取 A 用户的云端快照。

## 使用及限制

- 入口：工作台顶部“账户 · 云端”或直接访问 `/account.html`。
- 本地项目仍保留在当前浏览器的 `tw-workplace-v4` 存储键中。账户不会自动搬运原有项目。
- 点击“将本机工作区备份到云端”执行全量覆盖，先弹确认框；点击“从云端恢复至本机”会先下载原本机工作区备份，然后覆盖本机，再返回工作台刷新页面。
- **目前采用手动备份和恢复，并未实现实时多端同步、项目级冲突合并、自动保存或退出账户后自动清除本地项目。**
- 不建议在公共电脑登录私人账户或打开私人项目。退出账号不会清空浏览器项目；云端服务不会对存于原浏览器的内容自动加密。
- 每账号云端快照最大约 1.6 百万个字符，传输上限 2 MB。大型项目继续使用工作台内置导出/ZIP 功能保存。
- 不要把密钥提交到 GitHub。生产环境应开启邮件验证、邮件发送配额、账号访问策略及服务监控。密码重置、自助删号和自动同步属于后续开发范围。
