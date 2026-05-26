# HomeHub

AI驱动的自托管家庭规划中心。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js 20 + Express + TypeScript
- **数据库**: SQLite (better-sqlite3) + Knex.js
- **实时通信**: HTTP 轮询
- **AI**: OpenAI API (云端，用户自填 API Key)
- **部署**: Docker Compose

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（同时启动前后端）
npm run dev

# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:client
```

## Docker 部署

```bash
docker-compose up -d
```

## 功能模块

- [ ] 任务与家务管理
- [ ] 餐食计划与购物清单
- [ ] 预算与分账
- [ ] 日历与同步
- [ ] AI 助手

## License

MIT
