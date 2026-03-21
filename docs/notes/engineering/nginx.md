# Nginx 生产配置

Nginx 是高性能的 HTTP 服务器 / 反向代理 / 负载均衡器，常作为前端静态站点和后端服务的统一入口。本篇聚焦**前端部署相关的生产配置**：静态托管、SPA 路由回退、反向代理、HTTPS、缓存与压缩。

> 部署流程见 [前端部署](/notes/deploy/frontend-deployment)；服务器基础见 [Linux](/notes/backend/linux)。

## 最小静态站点

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA 路由回退
    }
}
```

`try_files $uri $uri/ /index.html` 的含义：先试文件、再试目录、都没有则回退到 `index.html`——这是 **SPA（Vue/React 路由）** 必需项，否则刷新子路由会 404。

## SPA 与 Hash 路由区别

+ **History 模式**（推荐，`/user/123`）：必须配 `try_files ... /index.html` 回退。
+ **Hash 模式**（`/#/user/123`）：URL 带 `#`，不向服务器发请求，无需回退配置，但 URL 不美观、不利于 SEO。

## 反向代理（转发到后端）

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/;     # 转发到本地 Node 服务
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

注意 `proxy_pass` 末尾的 `/`：有 `/` 会**去掉** `/api/` 前缀再转发（`/api/user` → `http://.../user`）；无 `/` 则保留前缀。

## HTTPS（TLS）

用 Let's Encrypt 免费证书（certbot 自动签发）：

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # 现代 TLS 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

# HTTP 强制跳转 HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

配合 HSTS 响应头进一步强化（见前端安全篇）。

## 静态资源缓存

```nginx
location /assets/ {
    expires 1y;                  # 缓存一年
    add_header Cache-Control "public, immutable";
}

location ~* \.(js|css|png|jpg|svg|woff2)$ {
    expires 30d;
    add_header Cache-Control "public";
}
```

前端构建产物通常带内容哈希（`app.abc123.js`），可放心设长缓存；**HTML 不缓存**（确保发版后立即生效）。

## Gzip / Brotli 压缩

```nginx
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
gzip_min_length 1024;
```

Brotli（`br`）压缩率更高，现代浏览器支持，可替代或叠加 Gzip。

## 负载均衡

```nginx
upstream backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    # 可选：weight=3 权重；ip_hash 会话保持
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

## 常用命令

```bash
nginx -t                  # 测试配置文件语法
nginx -s reload           # 热重载配置（不中断服务）
systemctl status nginx    # 查看运行状态
```

## 安全加固要点

+ 隐藏版本号：`server_tokens off;`
+ 限制请求体大小：`client_max_body_size 10m;`（`413` 防大文件冲击）
+ 禁止访问隐藏文件：`location ~ /\. { deny all; }`（防 `.env` 泄露）
+ 配合 CSP / X-Frame-Options 响应头（见前端安全篇）

## 参考

+ [Nginx 官方文档](https://nginx.org/en/docs/)
+ [DigitalOcean Nginx 配置指南](https://www.digitalocean.com/community/tutorials/how-to-configure-nginx)
