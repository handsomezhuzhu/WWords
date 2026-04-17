# WWords

WWords 是一个面向个人与小团队的 AI 单词本。
它提供词库录入、AI 补全、双向复习、后台用户管理和 AI 服务配置，默认使用 SQLite，兼容 MySQL，并支持 Docker 部署。

![WWords Dashboard](docs/cover.png)

## 功能特性

- AI 智能补全：根据英文或中文词条自动生成释义、词性、例句等结构化内容
- 双向复习：支持英译中和中译英两种模式
- 艾宾浩斯记忆：根据复习结果自动推进复习间隔
- 生产化后台：支持用户搜索、分页、创建、编辑、删除保护和 AI 配置管理
- 词库分页：词库按页加载，适合词条数量较多的长期使用场景
- 移动端适配：桌面和手机均可直接使用
- 双容器部署：前端为 Next.js，后端为 FastAPI，可通过 Docker Compose 一键启动

## 技术栈

- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、Radix UI
- 后端：FastAPI、SQLAlchemy、Pydantic
- 数据库：SQLite 默认，兼容 MySQL
- 部署：Docker、Docker Compose、GitHub Container Registry

## 界面说明

- 工作台使用三个同级标签页：`加入词库`、`开始背单词`、`查看词库`
- 词库和后台用户管理都支持分页，不依赖前端一次性加载全量数据
- 后台用户编辑使用抽屉式单用户编辑流程，适合用户量增长后的持续维护

## 快速开始

推荐直接使用 Docker Compose。

### 1. 获取代码

```bash
git clone https://github.com/handsomezhuzhu/WWords.git
cd WWords
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

示例：

```ini
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me_to_a_strong_password
SECRET_KEY=change_me_to_a_long_random_secret
DATABASE_URL=sqlite:///./data/data.db
SECURE_COOKIES=true
COOKIE_SAMESITE=lax

DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_API_URL=https://your-api.example.com/
DEFAULT_AI_API_KEY=your-api-key
DEFAULT_AI_MODEL=gpt-5.4
DEFAULT_AI_TEMPERATURE=0
```

安全建议：

- `SECRET_KEY` 必须替换为高强度随机字符串
- `ADMIN_PASSWORD` 建议至少 12 位，并包含大小写字母、数字和符号
- 生产环境建议保持 `SECURE_COOKIES=true`
- 不要提交真实 `.env`、数据库文件和 API Key

### 3. 本地 Docker 启动

```bash
docker compose up --build -d
```

启动后访问：

- 应用入口：`http://localhost:7997`
- 管理员入口：使用 `.env` 中的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`

## 生产部署

仓库内提供了生产用 Compose 文件：

```bash
docker compose -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` 默认使用以下镜像：

- 后端：`ghcr.io/handsomezhuzhu/wwords:latest`
- 前端：`ghcr.io/handsomezhuzhu/wwords-frontend:latest`

生产部署前请确认：

- `.env` 中的管理员账号、密码和 `SECRET_KEY` 已替换
- 已规划数据目录挂载
- 若使用 MySQL，`DATABASE_URL` 已替换为 MySQL 连接串

MySQL 示例：

```ini
DATABASE_URL=mysql+pymysql://wwords:strong_password@127.0.0.1:3306/wwords?charset=utf8mb4
DB_POOL_RECYCLE=3600
```

## AI 配置说明

管理员登录后可以在后台管理页面配置 AI 服务。

当前界面和后端逻辑支持以下提供方：

- OpenAI
- Gemini
- DeepSeek
- 兼容 OpenAI Chat Completions 协议的中转服务

推荐填写内容：

- `Provider`
- `API URL`
- `API Key`
- `Model`
- `Temperature`

如果 API Key 留空，后台更新配置时不会覆盖已有密钥。

## 本地开发

### 后端

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 7997
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端默认通过同源 `/api` 代理访问 FastAPI。

## 目录结构

```text
app/         FastAPI 后端
frontend/    Next.js 前端
docs/        产品与架构文档、README 截图
tests/       pytest 测试
data/        运行期数据库文件
```

## 镜像发布

仓库中的 GitHub Actions 会构建并发布以下镜像：

- `ghcr.io/handsomezhuzhu/wwords`
- `ghcr.io/handsomezhuzhu/wwords-frontend`

## 开源协议

本项目使用 [MIT License](LICENSE)。
