# 前端重建方案

## 技术方向

- 框架：Next.js App Router
- 样式：Tailwind CSS
- 组件风格：shadcn/ui 风格原语
- 类型：TypeScript
- 数据边界：`lib/api/*` 与 `lib/types/*`

## 为什么重建而不是继续修补旧模板

- 现有页面与后端模板强耦合，不利于复杂交互。
- 原生 JS 状态分散，难以维护。
- 管理页、词库页、复习页的可复用组件缺失。
- 响应式和视觉一致性依赖单一大 CSS 文件，扩展成本高。

## 新前端信息架构

### 公开区域

- `/`：产品首页，展示产品价值、核心能力、入口按钮。
- `/login`：登录页。
- `/register`：注册页。

### 认证后区域

- `/dashboard`：学习工作台。
- `/dashboard/words`：词库与筛选。
- `/dashboard/review`：复习流程。
- `/dashboard/admin`：仅管理员可见的配置与用户管理。

## 设计语言

当前已确定的设计方向为 `Warm Study Desk`：

- 背景：暖纸色和轻噪点纹理，而不是纯白平面。
- 主色：铜橙色承担主要动作。
- 辅色：青绿色承担信息性强调。
- 正文：深墨绿色而不是纯黑。
- 版式：强调卡片层次、圆角和柔和阴影。

## 组件层拆分

### 原语层

- `Button`
- `Card`
- `Input`
- `Textarea`
- `Badge`

### 场景层

- `LandingShell`
- `DashboardShell`
- `DashboardPreview`

### 后续待补

- `Dialog`
- `Sheet`
- `DropdownMenu`
- `Tabs`
- `Toast`
- `Skeleton`
- `DataTable`

## 数据获取原则

- 首屏可静态或服务端渲染的内容，优先服务端组件。
- 强交互和表单提交流程，使用客户端组件。
- API 调用统一收口到 `lib/api/*`，避免页面直接 `fetch` 散落。
- 类型定义统一由 `lib/types/*` 管理，后续可与 OpenAPI 生成集成。

## 前后端对接策略

- 第一阶段兼容现有 FastAPI 路由。
- 第二阶段逐步引入更稳定的 API 契约。
- 最终移除 Jinja 首页/工作台主路径，把 FastAPI 缩回 API 服务。

## 验收标准

- 移动端和桌面端主路径都可用。
- 登录、添加单词、开始复习、配置 AI 四条链路可闭环。
- 组件、配色、间距、状态反馈一致。
- 错误态、空态、加载态和权限态都有明确表现。
