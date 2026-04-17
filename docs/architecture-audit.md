# WWords 架构审计

## 项目概况

WWords 当前是一个单体 FastAPI 应用，使用 SQLite 持久化，服务端模板采用 Jinja2，前端交互主要依赖原生 JavaScript。核心目录如下：

- `app/main.py`：应用入口，现已开始迁移为应用工厂。
- `app/routers/*.py`：认证、单词、复习、配置、管理等 HTTP 路由。
- `app/models.py`：SQLAlchemy 模型。
- `app/schemas.py`：Pydantic 请求/响应模型。
- `app/security.py`：JWT、密码散列、当前用户依赖。
- `app/ai.py`：AI 补全调用逻辑。
- `app/templates/` 与 `app/static/`：旧版服务端页面和浏览器脚本。
- `tests/`：当前测试覆盖严重不足。

## 当前架构问题

### 1. 入口与基础设施

- 应用启动、建表、管理员初始化、模板页面、API 路由长期耦合在同一入口。
- 数据库迁移体系缺失，目前仍依赖运行时建表。
- 环境配置读取分散在多个模块，缺乏统一配置源。

### 2. 安全与权限

- AI 配置曾存在明文 API Key 下发风险。
- AI 补全接口此前未强制鉴权。
- `/admin/dashboard` 曾对非管理员返回首页而非 403，权限语义不清晰。
- Cookie 登录链路存在 CSRF 设计缺口，尚未补齐。

### 3. 领域模型与 API 契约

- `schemas.py` 单文件承载所有领域 DTO，职责过重。
- `WordCreate` 以前允许提交完全空白的词条。
- `ReviewRequest.mode`、`ReviewAnswer.grade`、`AICompletionRequest.direction` 过去缺少强约束。
- `examples`、`phonetics`、`parts_of_speech` 仍以字符串 JSON 形式暴露，契约不稳定。

### 4. 业务逻辑分布

- 路由层承载了大量业务规则、ORM 查询和错误处理。
- 复习题组装、例句解析、AI provider 调用未下沉到 service 层。
- 管理接口和配置接口存在重复职责。

### 5. 测试与发布

- 原有测试几乎只有一个失效的 scheduler 用例。
- 没有 API 集成测试、权限测试、AI provider mock 测试。
- 仓库缺少前后端分离后的联调、构建和发布规范。

## 已完成的第一轮修复

### 后端

- 新增应用工厂和基础设施骨架：`app/core/`、`app/bootstrap/`、`app/api/`。
- 将建表与默认管理员初始化迁入 lifespan。
- 为异常和配置加载建立统一入口。
- AI 补全接口改为要求已认证用户。
- AI 配置响应改为脱敏返回，不再直接返回明文 API Key。
- 删除“AI 失败后静默返回 mock 数据”的行为，改成显式上游错误。
- 词条创建增加“英文或中文至少其一存在”的约束。
- 复习与 AI 请求字段改为枚举/范围校验。
- 更新失效的 scheduler 测试并补充 schema 测试骨架。

### 前端

- 新建 `frontend/`，开始迁移到 `Next.js + Tailwind + shadcn/ui 风格`。
- 旧版管理页与 AI 补全 JS 已适配新的鉴权与配置响应。

## 仍待解决的高优先级问题

### P0

- 建立 Alembic 迁移，移除运行时建表。
- 统一认证策略，明确浏览器端采用 Cookie 还是 Bearer 为主。
- 为 Cookie 模式补齐 CSRF。
- 将 AI 配置改为真正的“系统级有效配置”模型，而非隐式依赖管理员记录。
- 建立 review session，避免前端直接控制复习可信结果。

### P1

- 拆分 `schemas.py`。
- 引入 service/repository 层。
- 规范错误模型、分页模型和列表返回模型。
- 将旧 Jinja 页面逐步退出主路径。

### P2

- 完成 Next.js 页面实装与 API 对接。
- 完善 Docker、Compose、README、CI/CD。

## 目标架构

### 后端

- `app/main.py`：仅保留 `create_app()` 入口。
- `app/core/`：配置、异常、日志、中间件。
- `app/bootstrap/`：生命周期、初始化、迁移前置逻辑。
- `app/api/`：统一注册 HTTP 路由和页面路由。
- `app/services/`：认证、词库、复习、AI、配置服务。
- `app/repositories/`：数据访问边界。

### 前端

- `frontend/app/`：App Router 页面。
- `frontend/components/`：界面组件与场景壳。
- `frontend/lib/api/`：后端 API 客户端。
- `frontend/lib/types/`：共享类型。

## 验收标准

- 后端接口具备清晰权限边界，敏感配置不明文下发。
- 复习流和词条流具备可回归测试。
- 新前端可独立运行，登录、词库、复习、后台配置四条主路径可走通。
- 文档覆盖本地开发、部署、迁移、测试和前后端联调方式。
