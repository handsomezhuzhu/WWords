# WWords AI 单词本

借助 AI 补全和艾宾浩斯记忆的双语单词管理工具。
基于 FastAPI + SQLite + Vanilla JS 构建，支持 Docker 一键部署。

![Dashboard Preview](docs/cover.png)

## ✨ 功能特性

*   **AI 智能补全**：输入单词，自动生成音标、词性、中英文释义、例句、同义词和反义词（支持 OpenAI/Gemini 协议）。
*   **双向复习**：支持“英译中”和“中译英”两种复习模式。
*   **艾宾浩斯记忆**：内置科学的间隔重复算法（Spaced Repetition），自动安排复习计划。
*   **多端适配**：响应式设计，完美支持桌面端和移动端。
*   **极简部署**：使用 SQLite 数据库，单容器部署，无需复杂的中间件依赖。

---

## 🚀 部署教程 (Deployment)

推荐使用 Docker 进行部署，无需安装 Python 环境。

### 方法一：使用 Docker Compose (推荐)

1.  **下载代码或仅下载 `docker-compose.prod.yml`**
    ```bash
    git clone https://github.com/handsomezhuzhu/WWords.git
    cd WWords
    ```

2.  **配置环境变量**
    复制配置文件模板：
    ```bash
    cp .env.example .env
    ```
    编辑 `.env` 文件，设置您的管理员账号、密钥等信息：
    ```ini
    # 管理员初始账号（首次启动自动创建）
    ADMIN_EMAIL=admin@example.com
    ADMIN_PASSWORD=your_secure_password
    
    # 系统密钥（用于加密 Token，生产环境务必修改）
    SECRET_KEY=generate_a_long_random_string_here

    # 数据库路径（通常不需要改）
    DATABASE_URL=sqlite:///./data/data.db
    ```

    **部署时务必满足以下安全要求：**

    *   `SECRET_KEY` 必须是长度足够的随机字符串，**不要使用默认值**，也不要在不同环境之间重复使用同一个密钥。
    *   `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 必须显式设置，否则不会创建默认管理员账号；管理员密码建议至少 12 位，并包含大小写字母、数字和符号。
    *   浏览器 Token Cookie 默认启用 `secure`，生产环境应保持 `SECURE_COOKIES=true`（默认值）并根据需要设置 `COOKIE_SAMESITE`（建议 `lax`）。
    *   应用启动后注册/修改密码会强制执行复杂度校验（长度≥12、包含大小写、数字、符号），部署时请告知用户这一要求。

3.  **启动服务**
    使用生产环境配置文件启动：
    ```bash
    # 拉取最新镜像并后台启动
    docker-compose -f docker-compose.prod.yml up -d
    ```
    服务启动后，访问 `http://localhost:7997` 即可使用。
    数据会持久化保存在当前目录的 `data/` 文件夹下。

### 方法二：直接使用 Docker Run

如果您不想使用 docker-compose，也可以直接运行命令：

1.  **拉取镜像**
    *注意：镜像名必须全为小写*
    ```bash
    docker pull ghcr.io/handsomezhuzhu/wwords:latest
    ```

2.  **创建数据目录**
    ```bash
    mkdir -p data
    ```

3.  **运行容器**
    请替换 `-e` 参数中的值为您自己的配置：
    ```bash
    docker run -d \
      --name wwords \
      -p 7997:7997 \
      -v $(pwd)/data:/app/data \
      -e ADMIN_EMAIL="admin@example.com" \
      -e ADMIN_PASSWORD="your_password" \
      -e SECRET_KEY="your_secret_key" \
      -e DATABASE_URL="sqlite:///./data/data.db" \
      --restart unless-stopped \
      ghcr.io/handsomezhuzhu/wwords:latest
    ```

---

## 🛠️ 配置 AI 服务

首次登录后（使用环境变量中配置的管理员账号），请先进行 AI 配置，否则无法使用“AI 补全”功能。

1.  登录后，点击侧边栏的 **“后台管理”**（仅管理员可见）。
2.  进入 **“系统配置”**。
3.  填写您的 AI 服务商信息：
    *   **Provider**: 选择 OpenAI 或 Gemini（通用协议）。
    *   **API URL**: AI 服务的接口地址（例如 `https://api.openai.com/v1` 或您的中转代理地址）。
    *   **API Key**: 您的 API 密钥。
    *   **Model**: 使用的模型名称（如 `gpt-4o-mini`, `gpt-3.5-turbo` 等）。
4.  保存配置。

---

## 💻 本地开发

1.  **环境准备**
    *   Python 3.10+
    *   Git

2.  **安装依赖**
    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # Linux/Mac
    source .venv/bin/activate
    
    pip install -r requirements.txt
    ```

3.  **运行**
    ```bash
    cp .env.example .env
    # 编辑 .env 配置...
    
    uvicorn app.main:app --reload
    ```

---

## 🔗 相关链接

*   项目地址: [https://github.com/handsomezhuzhu/WWords](https://github.com/handsomezhuzhu/WWords)
*   Docker 镜像: `ghcr.io/handsomezhuzhu/wwords`

## 📄 License

MIT
