# Changelog

## [0.1.0.0] - 2026-05-26

### Added
- 家庭任务看板（Kanban）：支持待办/进行中/已完成三列拖拽式管理
- 任务分配与积分系统：为任务分配家庭成员，完成后自动记录积分
- 积分排行榜：查看家庭成员的任务完成积分排名
- 智能购物清单：按类别自动分组（果蔬、肉禽蛋奶、乳制品等），支持一键勾选和批量清除
- 中文关键词自动分类：输入"牛奶"自动归入乳制品，"鸡蛋"归入肉禽蛋奶
- 数据库迁移：families、members、tasks、task_assignees、chore_logs、shopping_items 表
- 数据库种子：默认家庭数据初始化

### Fixed
- Docker 构建流程：修复 knex 迁移路径、复制编译后的 dist 目录
- TypeScript 配置：分离服务端和客户端 tsconfig
- 安全加固：生产环境强制 SESSION_SECRET、API 路由认证中间件、事务包裹积分记录防止并发重复
- 输入验证：所有路由参数和查询参数添加 NaN/空值校验

### Changed
- 前端路由：从 health check 页面切换到功能导航（任务/购物/餐食/预算）
- PWA 配置：暂时移除 vite-plugin-pwa 以简化构建

## [0.0.1.0] - 2026-05-26

### Added
- 项目初始化：React 18 + TypeScript + Vite 前端骨架
- Express + TypeScript 后端 API 骨架
- SQLite 数据库集成（better-sqlite3）
- Docker + Docker Compose 部署配置
- PWA 基础配置（vite-plugin-pwa）
- Tailwind CSS 样式框架
- Session Cookie 认证中间件
- Health check API 端点
