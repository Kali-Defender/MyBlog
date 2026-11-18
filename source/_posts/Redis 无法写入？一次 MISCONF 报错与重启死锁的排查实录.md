---
title: Redis 无法写入？一次 MISCONF 报错与重启死锁的排查实录
date: 2026/11/18
categories: 
  - 运维进阶  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Redis
banner: /img/head.png
description: 一次真实故障复盘：Redis 因 dir 指向根目录导致 BGSAVE 失败、触发 MISCONF 写保护，以及 systemctl 重启卡死的排查过程与修复、预防方案。
---

# Redis `MISCONF` 写保护故障完整总结

## 一、故障现象

```redis
127.0.0.1:6379> DEL k2
(error) MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk.
Commands that may modify the data set are disabled...
```

所有写命令（`DEL`、`SET` 等）被拒绝，读命令正常。

---

## 二、原理（重点）

### 2.1 为什么写命令被拒绝？

Redis 有一个保护机制 `stop-writes-on-bgsave-error`（默认 `yes`）：

- Redis 按 `save` 规则定期在后台执行 `BGSAVE`，把内存快照写入 `dump.rdb`
- 如果 `BGSAVE` **失败**，Redis 认为“持久化已不可靠”
- 此时若继续接受写命令，一旦 Redis 重启，这些新写入的数据将**全部丢失**
- 因此 Redis **主动拒绝所有写命令**，宁可中断服务也不丢数据

这就是 `MISCONF` 错误的本质：不是 `DEL` 有问题，是 Redis 在保护你。

### 2.2 为什么 `BGSAVE` 会失败？

排查结果：

```redis
redis-cli CONFIG GET dir   →  "/"
```

Redis 的数据目录是 `/`（根目录）。而 Redis 进程以 `redis` 用户运行，**普通用户对 `/` 没有写权限**。`BGSAVE` 尝试在 `/` 下创建 `dump.rdb` 时被内核拒绝（`Permission denied`），保存失败。

**根因**：源码编译安装时，`redis.conf` 默认 `dir ./`，而 systemd 服务未设置 `WorkingDirectory=`，进程工作目录为 `/`，相对路径 `./` 解析为 `/`。安装文档只 `chown` 了 `/var/lib/redis`，却没改 `dir` 配置，导致 Redis 根本没往那个目录写。

### 2.3 为什么 `CONFIG SET dir` 被拒绝？

```redis
(error) ERR CONFIG SET failed ... can't set protected config
```

Redis 7.0+ 将 `dir`、`dbfilename` 等“可控制文件写入位置”的配置标记为 **`PROTECTED_CONFIG`**。原因是：如果攻击者能动态修改 `dir`，就能让 Redis 把文件写到任意位置（如 `/etc/cron.d/`、`~/.ssh/`），实现提权或写入恶意文件。因此运行时禁止修改，必须改配置文件并重启。

### 2.4 为什么 `systemctl restart` 会卡住？

Redis 收到 `SIGTERM` 停止信号时，会**先尝试将内存数据同步保存到磁盘**，保存成功后才退出。但此时 `dir=/`，保存**必然失败**，Redis 拒绝退出以保护数据，systemd 的停止作业无限等待，终端就卡住了。

这是 2.2 的连锁反应：`dir` 错误 → `BGSAVE` 失败 → 停止时保存也失败 → 进程不退出 → restart 卡死。

---

## 三、解决方案

### 3.1 中断卡住的 restart

```bash
Ctrl + C          # 中断前台 systemctl restart
sudo pkill -9 redis-server   # 强制终止拒绝退出的 Redis
```

### 3.2 临时禁用 RDB，防止重启再次卡住

```bash
sudo sed -i 's/^save /# save /' /etc/redis/redis.conf
```

**原理**：注释掉所有 `save` 规则后，Redis 停止时跳过 RDB 保存，直接退出，`systemctl restart` 不再卡住。

### 3.3 修正 `dir` 和 `logfile`

```bash
sudo sed -i 's|^dir .*|dir /var/lib/redis|' /etc/redis/redis.conf
sudo sed -i 's|^logfile .*|logfile /var/log/redis/redis-server.log|' /etc/redis/redis.conf
sudo chown -R redis:redis /var/lib/redis /var/log/redis
```

### 3.4 重启并验证

```bash
sudo systemctl daemon-reload
sudo systemctl restart redis

redis-cli CONFIG GET dir        # 应为 /var/lib/redis
redis-cli BGSAVE
sleep 2
redis-cli INFO persistence | grep rdb_last_bgsave_status   # 应为 ok
ls -l /var/lib/redis/dump.rdb   # 文件应存在
```

### 3.5 恢复 RDB 持久化

```bash
sudo cp /etc/redis/redis.conf.bak /etc/redis/redis.conf
sudo sed -i 's|^dir .*|dir /var/lib/redis|' /etc/redis/redis.conf
sudo sed -i 's|^logfile .*|logfile /var/log/redis/redis-server.log|' /etc/redis/redis.conf
sudo systemctl restart redis
redis-cli INFO persistence | grep rdb_last_bgsave_status   # 确认 ok
```

`rdb_last_bgsave_status` 变为 `ok` 后，`MISCONF` 写保护**自动解除**，`DEL` 恢复正常。

---

## 四、方案执行中遇到的问题

| 问题 | 原因 | 处理 |
|---|---|---|
| `CONFIG SET dir` 报 protected config | Redis 7.0+ 安全限制 | 放弃动态改，改配置文件+重启 |
| `systemctl restart` 卡死 | 停止时尝试 RDB 保存，`dir=/` 失败，Redis 拒绝退出 | `Ctrl+C` → `pkill -9` → 临时禁用 `save` |
| 日志文件不存在 | `logfile ""`，日志走 journal | `journalctl -u redis`（服务名是 `redis` 不是 `redis-server`） |
| `journalctl -u redis-server` 无输出 | 服务名错误 | 用 `-u redis` |

---

## 五、长远避免

### 5.1 安装时就写死关键配置

源码安装后，**不要依赖 `redis.conf` 的默认值**。安装文档中应补上：

```bash
sudo sed -i 's|^dir .*|dir /var/lib/redis|' /etc/redis/redis.conf
sudo sed -i 's|^logfile .*|logfile /var/log/redis/redis-server.log|' /etc/redis/redis.conf
```

### 5.2 systemd 单元显式设置工作目录

防止相对路径 `./` 再次解析到 `/`：

```ini
[Service]
WorkingDirectory=/var/lib/redis
```

### 5.3 给停止操作加超时上限

防止未来任何原因导致 Redis 拒绝退出时，`systemctl` 无限挂起：

```ini
[Service]
TimeoutStopSec=60
```

60 秒后 systemd 强制 `SIGKILL`，终端不会卡死。

### 5.4 加持久化状态监控

定期检查 `rdb_last_bgsave_status`，在写保护触发前发现磁盘/权限问题：

```bash
redis-cli INFO persistence | grep rdb_last_bgsave_status
```

可接入 Prometheus `redis_exporter` 或简单 cron 告警。

### 5.5 理解保护机制，不要一关了之

`stop-writes-on-bgsave-error no` 只是应急开关。**关掉它 = 持久化失效时仍接受写入 = 数据静默丢失风险**。正确做法永远是修根因（磁盘、权限、`dir`），而不是关保护。