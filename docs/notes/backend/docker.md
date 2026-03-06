# Docker

Docker 是一个开源的容器化平台，通过将应用及其依赖打包进**容器（Container）**，实现"一次构建、随处运行"。

## 核心概念

### 镜像（Image）与容器（Container）

+ **镜像**：只读模板，包含运行应用所需的代码、运行时、库和环境变量。类比"类"。
+ **容器**：镜像的运行实例，带有可写层。类比"对象实例"。
+ **仓库（Registry）**：存储和分发镜像的服务，如 [Docker Hub](https://hub.docker.com)、阿里云容器镜像服务。

### 架构

Docker 使用 **C/S 架构**：

+ **Docker Client**：用户命令行工具（`docker`）。
+ **Docker Daemon（dockerd）**：后台服务，管理镜像、容器、网络、卷。
+ **Containerd**： daemon 下层的核心容器运行时。
+ **runC**：最底层的 OCI 标准容器运行时。

## 安装

+ macOS / Windows：安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)。
+ Linux（以 Ubuntu 为例）：

  ```bash
  # 卸载旧版本
  sudo apt-get remove docker docker-engine docker.io containerd runc

  # 安装依赖与仓库
  sudo apt-get update
  sudo apt-get install ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ```

## 镜像操作

```bash
docker pull nginx:alpine        # 拉取镜像
docker images                   # 列出本地镜像
docker rmi <image_id>           # 删除镜像
docker build -t my-app:1.0 .    # 根据 Dockerfile 构建镜像
docker tag my-app:1.0 registry.example.com/my-app:1.0
docker push registry.example.com/my-app:1.0
```

## 容器操作

```bash
docker run -d -p 8080:80 --name web nginx:alpine   # 后台运行并映射端口
docker ps                                         # 查看运行中的容器
docker ps -a                                      # 查看所有容器（含已停止）
docker logs -f web                                # 跟踪日志
docker exec -it web /bin/sh                       # 进入容器
docker stop web && docker rm web                  # 停止并删除
docker run --rm alpine echo "hello"              # 退出后自动删除容器
```

常用 `run` 参数：

+ `-d`：后台运行（detached）
+ `-p host:container`：端口映射
+ `-v host:container`：挂载数据卷
+ `--name`：指定容器名
+ `--restart=always`：开机/崩溃自启
+ `-e KEY=VALUE`：设置环境变量
+ `--network`：指定网络

## Dockerfile

```dockerfile
# 多阶段构建示例：Node.js 应用
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

关键指令：

+ `FROM`：基础镜像（必须是第一条指令）
+ `WORKDIR`：设置后续指令的工作目录
+ `COPY` / `ADD`：复制文件到镜像（`ADD` 额外支持 URL 解压 tar）
+ `RUN`：构建时执行命令，每一条产生一个新层
+ `ENV`：设置环境变量
+ `EXPOSE`：声明监听端口（仅文档作用，实际映射靠 `-p`）
+ `CMD`：容器启动时默认命令（可被 `docker run` 参数覆盖）
+ `ENTRYPOINT`：配置容器为可执行程序（与 `CMD` 配合传参）

优化建议：

+ 利用**层缓存**：变动少的指令放前面（如先 `COPY package.json` 再 `COPY .`）
+ 使用 `.dockerignore` 排除 `node_modules`、`.git` 等
+ 优先 **alpine** 等精简基础镜像
+ 用**多阶段构建**减小最终镜像体积

## 数据持久化：Volume

容器文件系统是临时的，删除容器数据即丢失。持久化用 **Volume** 或 **bind mount**：

```bash
docker volume create my-data
docker run -d -v my-data:/var/lib/mysql mysql:8
# 或绑定宿主机目录
docker run -d -v /srv/mysql:/var/lib/mysql mysql:8
```

+ **Volume**：由 Docker 管理，存于 `/var/lib/docker/volumes/`，推荐用于生产。
+ **bind mount**：直接映射宿主机路径，适合开发调试。

## 网络

```bash
docker network ls
docker network create my-net
docker run -d --network my-net --name db mysql:8
docker run -d --network my-net --name app my-app   # 同网络内可用容器名互访
```

默认网络模式：

+ `bridge`：默认，容器间通过端口映射对外
+ `host`：直接使用宿主机网络（无隔离）
+ `none`：无网络

## Docker Compose

用于定义和运行多容器应用（`compose.yml`）：

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - db
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
    volumes:
      - db-data:/var/lib/mysql

volumes:
  db-data:
```

```bash
docker compose up -d      # 启动
docker compose down       # 停止并移除
docker compose logs -f    # 查看日志
```

> 注：Docker Desktop 与 `docker-compose-plugin` 已内置 compose v2，命令为 `docker compose`（无横杠）。

## 实战：容器化一个前端静态站点

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建并运行：

```bash
docker build -t my-site .
docker run -d -p 80:80 my-site
```
