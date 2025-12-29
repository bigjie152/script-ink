# 剧本墨坊 (Script Ink)

一个面向剧本杀创作者的协作与共创平台 MVP。

## 功能概览
- 结构化剧本编辑：大纲 / 角色 / 线索 / DM 手册
- 改编分支机制：追踪 root_id / parent_id
- 协作面板：问题单 / 版本记录 / 改编合并
- 社区广场：最新 / 热门排序
- 登录评分：登录用户可评分
- 收藏夹：公开剧本可收藏并分组管理
- AI 接口预留：润色 / 线索 / 诡计入口

## 数据库 (Cloudflare D1)
1. 创建 D1 数据库并绑定名称为 `DB`
2. 执行初始化 SQL

```bash
wrangler d1 create script-ink
wrangler d1 execute script-ink --file=./drizzle/0000_init.sql
wrangler d1 execute script-ink --file=./drizzle/0001_comments.sql
wrangler d1 execute script-ink --file=./drizzle/0002_collections.sql
wrangler d1 execute script-ink --file=./drizzle/0003_favorites_folder.sql
wrangler d1 execute script-ink --file=./drizzle/0004_script_likes.sql
wrangler d1 execute script-ink --file=./drizzle/0005_script_versions.sql
wrangler d1 execute script-ink --file=./drizzle/0006_script_issues.sql
wrangler d1 execute script-ink --file=./drizzle/0007_script_merge_requests.sql
```

## 本地开发
```bash
npm install
npm run dev
```

> 本项目默认使用 Cloudflare D1 绑定 `DB`，请确保在运行时注入该绑定。

## Cloudflare Pages 部署
1. 将本仓库推送到 GitHub
2. 在 Cloudflare Pages 中选择该仓库
3. 构建命令：`npm run build:cf`
4. 输出目录：`.vercel/output/static`
5. 在 Pages 设置里添加 D1 绑定：`DB -> script-ink`
