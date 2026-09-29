# Linux

Linux 是一个开源的类 Unix 操作系统内核，发行版（如 Ubuntu、CentOS、Debian）在内核之上打包了工具链与桌面环境。前端/运维日常接触的多为 **服务器版 Linux（无图形界面）**。

## 目录结构（FHS）

Linux 遵循 **文件系统层次结构标准（FHS）**：

+ `/`：根目录
+ `/bin`、`/usr/bin`：用户命令
+ `/etc`：系统配置文件
+ `/home`：用户主目录
+ `/var`：可变数据（日志 `/var/log`、缓存）
+ `/tmp`：临时文件
+ `/opt`：第三方软件
+ `/proc`、`/sys`：虚拟文件系统（内核/进程信息）

## 基础命令

### 文件与目录

```bash
pwd                     # 当前目录
ls -la                  # 详细列表（含隐藏文件）
cd ~/project            # 切换目录（~ 表示 home）
mkdir -p a/b/c          # 递归创建
cp -r src dst           # 递归复制
mv old new              # 移动/重命名
rm -rf dir              # 强制递归删除（谨慎！）
touch file              # 创建空文件/更新时间戳
find . -name "*.log"    # 按名查找
```

### 查看与编辑

```bash
cat file                # 输出全部
less file               # 分页查看（q 退出）
head -n 20 file         # 前 20 行
tail -f file            # 实时跟踪末尾（看日志常用）
grep -rn "error" /var/log   # 递归搜索
```

### 权限

```bash
ls -l                   # 查看权限，如 -rwxr-xr--  （u/g/o 三类）
chmod 755 script.sh     # 数字法：r=4 w=2 x=1
chmod +x script.sh      # 增加执行权限
chown user:group file   # 修改所属者
```

权限三位数字分别对应：**所有者(u) / 所属组(g) / 其他(o)**。

### 进程与资源

```bash
ps aux                  # 查看进程
top / htop              # 实时资源监控
kill -9 <pid>           # 强制结束进程
df -h                   # 磁盘占用
free -h                 # 内存占用
```

### 网络

```bash
ip addr                 # 查看网卡与 IP（替代旧 ifconfig）
ss -tlnp                # 查看监听端口（替代 netstat）
ping example.com        # 连通性
curl -I https://x.com   # 查看响应头
```

## 包管理

不同发行版包管理器不同：

```bash
# Debian / Ubuntu
apt-get update && apt-get install -y nginx

# CentOS / Rocky（较老用 yum，新用 dnf）
dnf install -y nginx
```

## 用户与 sudo

```bash
adduser deploy          # 新建用户
usermod -aG sudo deploy # 加入 sudo 组
sudo command            # 以管理员权限执行
```

服务器建议：**禁用 root 直接 SSH 登录**，使用普通用户 + sudo，并配置密钥登录。

## 服务管理（systemd）

现代发行版用 `systemd` 管理后台服务：

```bash
systemctl status nginx
systemctl start nginx
systemctl enable nginx      # 开机自启
journalctl -u nginx -f      # 查看服务日志
```

## Shell 脚本基础

脚本首行指定解释器（shebang）：

```bash
#!/usr/bin/env bash
set -euo pipefail          # 出错即停、未定义变量报错、管道失败报错

NAME="world"
echo "hello $NAME"

if [ -f "file.txt" ]; then
  echo "文件存在"
else
  echo "文件不存在"
fi

for i in 1 2 3; do
  echo "第 $i 次"
done
```

执行：`chmod +x script.sh && ./script.sh`，或 `bash script.sh`。

## 实战：部署一个静态站点（Nginx）

```bash
sudo apt-get install -y nginx
sudo cp dist/* /var/www/html/    # 或用 scp 上传
sudo systemctl enable --now nginx
curl -I http://localhost         # 验证
```

常用 Nginx 配置位于 `/etc/nginx/conf.d/*.conf` 与 `/etc/nginx/nginx.conf`。
