---
title: Ubuntu 24.04 systemd服务管理：systemctl操作与自定义服务排错
date: 2026/8/21
categories: 
  - 运维基础  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Linux
  - 服务管理
banner: /img/head.png

description: 本文系统梳理了Ubuntu 24.04 Server下使用systemctl管理服务（ssh/nginx）的启停、自启、日志排查、故障恢复，以及自定义systemd服务的创建与避坑实践。
---
> 环境：Ubuntu24.04 Server，普通ubuntu用户操作，无root直接登录，全部为生产环境高频操作，记录实操第一现场。

## 一、前置准备
安装企业常用练习服务 `openssh‑server`、`nginx`，用于后续服务管理实操。
> 说明：Ubuntu的SSH服务名为`ssh`，CentOS为`sshd`，注意区分。

```bash
# 更新源
sudo apt update
# 安装ssh服务
sudo apt install openssh-server -y
# 安装nginx（web服务，运维核心服务）
sudo apt install nginx -y
```

## 二、服务状态排查
生产场景：线上服务异常，快速确认服务存活状态、开机自启状态、运行时长、PID。
```bash
# 1. 查看nginx详细运行状态（重点观察：running/dead、启动时间、进程PID）
sudo systemctl status nginx
# 2. 查看ssh服务状态
sudo systemctl status ssh
# 3. 列出所有设置开机自启的服务
sudo systemctl list-unit-files --type=service | grep enabled
# 4. 判断服务是否开机自启（脚本、自动化排查常用）
sudo systemctl is-enabled nginx
sudo systemctl is-enabled ssh
```

> 实操注意：
> 1. `systemctl status xxx` 查看完状态，按 **`q`** 退出查看界面。
> 2. Ubuntu SSH服务名：`ssh`；CentOS为`sshd`，命令不要混用。

## 三、服务启停、重启、重载
模拟日常运维：停止、启动、异常重启、配置平滑重载。
```bash
# 1. 停止服务
sudo systemctl stop nginx
# 查看状态验证
sudo systemctl status nginx
# 2. 启动服务
sudo systemctl start nginx
# 3. 重启服务（会断开业务，服务卡死异常时使用）
sudo systemctl restart nginx
# 4. 重载配置（平滑生效，不中断业务，修改配置后优先使用）
sudo systemctl reload nginx
```

> 实操注意：
> - `restart`：彻底杀掉进程再重新启动，业务连接会断开；
> - `reload`：只重新加载配置文件，原有业务连接保持，生产改配置优先选reload。

## 四、开机自启管理
生产场景：服务器意外重启，保障业务自动拉起；关闭无用服务开机自启。
```bash
# 1. 设置开机自启
sudo systemctl enable nginx
# 2. 关闭开机自启
sudo systemctl disable nginx
# 3. 同时关闭开机自启并且立刻停止服务，故障维护常用
sudo systemctl disable --now nginx
```

## 五、服务日志排查
生产场景：服务启动失败，通过journalctl工具定位故障根源。
```bash
# 1. 查看nginx服务日志，排错首选
sudo journalctl -u nginx
# 2. 实时滚动跟踪日志，线上问题实时排查
sudo journalctl -u nginx -f
# 3. 查看本次开机以来该服务全部日志
sudo journalctl -u nginx --since today
```

> 实操注意：
> 1. 实时日志 `journalctl -u nginx -f` 使用 **`Ctrl+C`** 退出。

### 刻意故障演练：Nginx配置损坏排错
人为修改nginx配置制造故障，模拟线上配置改错/误删配置内容场景。
```bash
# 修改配置，可以故意写错语法，也可以直接删除部分配置内容
sudo vim /etc/nginx/nginx.conf
# 尝试重启服务，会启动失败
sudo systemctl restart nginx
# 通过服务日志排查问题
sudo journalctl -u nginx
```

重启报错信息如下：
![nginx报错信息](/img/Linux2/error.png)
日志报错信息如下：
![nginx日志信息](/img/Linux2/rizhi.png)

> 实战经验：
> 不管是**语法写错**，还是**误删除配置内容导致配置残缺**，两类故障都可以两套方案处理：
> 1. 精细修复：优先执行 `nginx -t` 做配置语法校验，根据输出的行号修正配置，适合需要保留自己修改过的配置；
> 2. 应急重置：配置彻底改乱，直接重装nginx恢复出厂配置，快速恢复业务，Ubuntu没有`.default`备份模板，不能用cp模板的方式。

```bash
# Ubuntu应急恢复默认nginx配置
sudo apt reinstall nginx -y
# 校验配置是否合法
nginx -t
# 平滑重载配置恢复业务
sudo systemctl reload nginx
# 确认服务状态
sudo systemctl status nginx
```

> 工作中优先执行`nginx -t`检查语法，减少盲目重启，降低故障修复成本。

## 六、自定义 systemd 服务
生产场景：把自己写的脚本、后端程序交给systemd托管，实现后台运行、崩溃自动重启、开机自启。

### 1、编写测试脚本
> 注意：如果直接用普通用户vim创建文件，后续会遇到203/EXEC执行报错。
```bash
sudo vim /opt/test_server.sh
```
脚本功能：每5秒把运行状态写入日志文件。
```bash
#!/bin/bash
while true
do
    echo "服务正常运行 $(date)" >> /opt/server_log.txt
    sleep 5
done
```

赋予脚本执行权限：
```bash
sudo chmod 755 /opt/test_server.sh
sudo chown root:root /opt/test_server.sh
```

### 2、编写自定义service单元文件
```bash
sudo vim /etc/systemd/system/test.service
```
service文件完整内容：
```ini
[Unit]
Description=自定义业务测试服务
After=network.target

[Service]
Type=simple
ExecStart=/opt/test_server.sh
# 服务崩溃自动重启，生产非常常用
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 3、加载配置、启动服务、设置开机自启
> 修改`.service`文件后**必须执行daemon‑reload**让systemd识别新配置。
```bash
# 重新加载systemd配置
sudo systemctl daemon-reload
# 启动自定义服务
sudo systemctl start test
# 设置开机自启
sudo systemctl enable test
# 查看服务运行状态
sudo systemctl status test
```

> 实操踩坑现场：普通用户创建脚本，即使后续修改权限，依然出现`203/EXEC`报错。
![自定义服务203EXEC报错](/img/Linux2/203EXEC.png)

**报错现象**：`activating (auto‑restart)`，反复启动反复退出，`Main PID: xxx (code=exited, status=203/EXEC)`。
**根本原因**：systemd系统服务默认以root身份运行；普通用户创建的脚本文件，即便后期修改chmod、chown，仍存在隐性隔离标记，systemd拒绝执行该脚本。

**实战解决方案：删除旧脚本，使用root身份重建脚本**
```bash
# 1. 删除普通用户创建的旧脚本（带有隐性隔离BUG）
sudo rm -f /opt/test_server.sh
# 2. sudo以root身份重建脚本
sudo vim /opt/test_server.sh
# 粘贴脚本内容后，加固权限
sudo chmod 755 /opt/test_server.sh
sudo chown root:root /opt/test_server.sh
# 重载systemd配置，重启服务
sudo systemctl daemon-reload
sudo systemctl restart test
# 验证状态
sudo systemctl status test
```

![服务成功](/img/Linux2/success.png)

### 4、验证服务自动重启功能
> 注意：ps查到带grep字样的行是grep自身进程，不是业务进程；服务启动失败时，业务进程一闪而过，ps无法捕获。
```bash
# 查找进程PID
ps -ef | grep test_server.sh
# 杀死业务进程，观察是否自动拉起
sudo kill -9 对应业务PID
# 再次查看服务状态，验证自动重启效果
sudo systemctl status test
```

![服务管理根源](/img/Linux2/auto.png)

## 七、服务开机屏蔽与解锁
生产场景：永久禁用高危服务，禁止服务被启动或设置开机自启。
```bash
# mask：彻底屏蔽服务，无法start、enable
sudo systemctl mask test
# unmask：解除屏蔽
sudo systemctl unmask test
```

> 实操踩坑现场：自定义service文件直接mask会提示`File /etc/systemd/system/test.service already exists.`
![屏蔽报错](/img/Linux2/mask.png)

> 说明：该提示**不是故障报错**。
> mask原理是创建软链接指向`/dev/null`来屏蔽服务；我们手动放到`/etc/systemd/system/`下的自定义单元文件，无法直接mask覆盖。
> `unmask`执行后无任何输出，代表执行成功，不影响服务启停、开机自启等全部功能，无需处理。

## 八、总结
1. `start/stop`控制**当前运行状态**；`enable/disable`控制**开机是否自启**，二者互不影响。
2. nginx操作：改配置优先`reload`平滑重载；故障优先用`nginx -t`校验语法；Ubuntu无`.default`模板，配置损坏用`apt reinstall nginx`恢复出厂。
3. systemctl状态查看用`q`退出；journalctl实时跟踪`‑f`用`Ctrl+C`退出。
4. 自定义systemd系统服务以root身份运行；普通用户创建脚本容易出现`203/EXEC`，单纯改权限不一定生效，优先用sudo重建脚本。
5. mask屏蔽对手动创建的自定义service会出现文件已存在提示，属于正常现象，unmask无输出即为成功。

