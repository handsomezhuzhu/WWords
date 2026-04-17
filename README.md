# WWords

WWords 是一个 AI 单词本，提供词库录入、AI 补全、双向复习和后台管理。  
前端使用 Next.js，后端使用 FastAPI，默认使用 SQLite，兼容 MySQL。
仓库现在以单容器部署为主：对外只需要启动一个 `wwords` 容器。

![WWords Dashboard](docs/cover.png)

## 功能

- AI 补全：根据英文或中文生成释义、词性、例句等内容
- 双向复习：支持英译中和中译英
- 间隔记忆：按复习结果自动安排下次复习
- 词库分页：适合词条较多的长期使用场景
- 后台管理：支持用户分页、搜索、编辑、删除保护和 AI 配置
- 移动端适配：桌面和手机都可直接使用

## 技术栈

- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、Radix UI
- 后端：FastAPI、SQLAlchemy、Pydantic
- 数据库：SQLite / MySQL
- 部署：Docker、Docker Compose、GitHub Actions、GHCR 单镜像发布

## 快速开始

应用默认入口：

- `http://localhost:7997`

说明：

- 单容器对外只暴露 `7997` 端口
- 容器内部会同时启动 Next.js 和 FastAPI，无需再额外部署前端容器

### 方式一：克隆仓库后启动

```bash
git clone https://github.com/handsomezhuzhu/WWords.git
cd WWords
cp .env.example .env
```

修改 `.env` 中至少这几项：

```ini
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me_to_a_strong_password
SECRET_KEY=change_me_to_a_long_random_secret
```

启动：

```bash
docker compose up --build -d
```

### 方式二：不克隆仓库，直接使用已构建镜像

GitHub Actions 只发布一个单容器镜像：

- `ghcr.io/handsomezhuzhu/wwords:latest`

先只下载环境变量模板：

Linux / macOS:

```bash
curl -L https://raw.githubusercontent.com/handsomezhuzhu/WWords/main/.env.example -o .env.example
cp .env.example .env
```

Windows PowerShell:

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/handsomezhuzhu/WWords/main/.env.example -OutFile .env.example
Copy-Item .env.example .env
```

修改 `.env` 后，直接运行镜像。

创建数据目录：

```bash
mkdir -p data
```

拉取镜像：

```bash
docker pull ghcr.io/handsomezhuzhu/wwords:latest
```

启动单容器：

```bash
docker run -d \
  --name wwords \
  -p 7997:7997 \
  --env-file .env \
  -e DATABASE_URL=sqlite:///./data/data.db \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/handsomezhuzhu/wwords:latest
```

### 方式三：只下载 `.env` 和生产 Compose 文件

如果不想克隆仓库，但仍想用 Compose：

Linux / macOS:

```bash
curl -L https://raw.githubusercontent.com/handsomezhuzhu/WWords/main/.env.example -o .env.example
curl -L https://raw.githubusercontent.com/handsomezhuzhu/WWords/main/docker-compose.prod.yml -o docker-compose.prod.yml
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d
```

Windows PowerShell:

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/handsomezhuzhu/WWords/main/.env.example -OutFile .env.example
Invoke-WebRequest https://raw.githubusercontent.com/handsomezhuzhu/WWords/main/docker-compose.prod.yml -OutFile docker-compose.prod.yml
Copy-Item .env.example .env
docker compose -f docker-compose.prod.yml up -d
```

## 环境变量

常用变量：

```ini
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me_to_a_strong_password
SECRET_KEY=change_me_to_a_long_random_secret
DATABASE_URL=sqlite:///./data/data.db
SECURE_COOKIES=true
COOKIE_SAMESITE=lax

DEFAULT_AI_PROVIDER=deepseek
DEFAULT_AI_API_URL=https://api.deepseek.com
DEFAULT_AI_API_KEY=your-api-key
DEFAULT_AI_MODEL=deepseek-chat
DEFAULT_AI_TEMPERATURE=0
```

说明：

- `SECRET_KEY` 必须替换成随机高强度字符串
- `ADMIN_PASSWORD` 建议至少 12 位，并包含大小写、数字和符号
- 单容器部署推荐把 SQLite 文件放在挂载目录 `./data/data.db`
- 不要提交真实 `.env`、数据库文件和 API Key
- 如果使用 MySQL，请改写 `DATABASE_URL`

MySQL 示例：

```ini
DATABASE_URL=mysql+pymysql://wwords:strong_password@127.0.0.1:3306/wwords?charset=utf8mb4
DB_POOL_RECYCLE=3600
```

## AI 配置

管理员登录后可在后台页面配置 AI 服务。当前支持：

- OpenAI
- Gemini
- DeepSeek
- 兼容 OpenAI Chat Completions 协议的服务

建议配置项：

- `Provider`
- `API URL`
- `API Key`
- `Model`
- `Temperature`

## 本地开发

后端：

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 7997
```

前端：

```bash
cd frontend
npm install
npm run dev
```

## 目录结构

```text
app/         FastAPI 后端
frontend/    Next.js 前端
docs/        文档与 README 截图
tests/       pytest 测试
data/        运行期数据目录
```

## 开源协议

本项目使用 [MIT License](LICENSE)。
