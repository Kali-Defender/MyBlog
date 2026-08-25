---
title: Ubuntu24.04 Server 日志管理完整实战rsyslog+logrotate+crontab排坑实录
date: 2026/8/21
categories: 
  - 运维基础  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Linux
  - 日志管理
banner: /img/head.png

description: 本文基于Ubuntu 24.04 Server完整实操，系统梳理了journalctl、rsyslog自定义日志、logrotate切割及crontab自动化巡检的全流程，并记录了时区、配置语法、权限安全等真实踩坑与修复方案。
---
> 摘要：本文基于Ubuntu 24.04 Server纯净服务器做完整日志实操作业，覆盖系统日志排查、journalctl二进制日志、rsyslog自定义日志收集、logrotate日志轮转切割、crontab定时日志巡检，记录实操中遇到时区时差、logrotate解析报错、目录权限安全校验等真实踩坑与完整修复方案，适合Linux初学者、运维入门学习。

## 前言
日志是服务器故障排查、安全审计最重要依据。Ubuntu24.04 Server采用`systemd‑journald + rsyslog`双日志体系，搭配`logrotate`做日志轮转、`crontab`实现自动化巡检。
很多教程基于CentOS或者旧版Ubuntu，直接照搬会出现各种版本兼容坑。本文全部为真机实操第一现场，记录命令、现象、报错、排错全过程。

## 一、系统常规日志排查
日常对服务器的故障排查，做好预防工作。
### 1、进入系统日志根目录，查看Ubuntu24.04默认日志文件清单
```bash
cd /var/log
ls -lh
```
重点关注系统全局日志**syslog**和认证日志**auth.log**
![syslog](/img/Linux2/syslog.png)
![auth](/img/Linux2/auth.png)

### 2、查看核心业务日志
```bash
# 查看最近50行系统全局日志，排查系统运行异常
tail -n 50 /var/log/syslog
# 查看最近50行认证日志，排查ssh登录、sudo提权、入侵异常
tail -n 50 /var/log/auth.log
```

### 3、实时监控日志
```bash
tail -f /var/log/syslog
```

### 4、精准过滤异常日志
```bash
# 过滤系统所有错误日志
grep -i "error" /var/log/syslog
# 过滤系统所有警告日志
grep -i "warn" /var/log/syslog
# 过滤登录、认证失败日志（入侵排查重点）
grep -i "failed" /var/log/auth.log
```

## 二、journald日志管理
journald是systemd自带二进制日志系统，查询系统故障源头，定位服务闪退、启动失败问题。
### 1. 查看本次开机所有系统日志
```bash
journalctl -b
```

### 2. 仅查看系统错误级别日志
```bash
journalctl -p err
```

### 3. 实时监控系统进程、服务日志
```bash
journalctl -f
```

### 4. 精准查看指定服务日志
```bash
journalctl -u sshd
```

### 5. 查看服务启动失败历史日志
```bash
journalctl -u sshd --no-pager
```

> 小提示：journalctl保存二进制日志；rsyslog负责输出文本格式日志到`/var/log`，方便grep、tail处理。

## 三、rsyslog自定义业务日志收集
自研程序、shell脚本可以交给rsyslog统一托管日志，不用自己写文件逻辑。

### 1.备份原生配置文件
> 修改系统配置前务必备份，损坏可以快速回滚
```bash
sudo cp /etc/rsyslog.conf /etc/rsyslog.conf.bak
```

### 2. 编辑rsyslog主配置文件，添加自定义日志规则
```bash
sudo vim /etc/rsyslog.conf
```
在文件末尾添加Ubuntu24.04适配的通用业务日志规则（local6为空闲日志设备，专为自定义业务使用）：
```bash
# 自定义业务日志：所有local6级别日志落地到指定文件
local6.*    /var/log/mytest.log
```

### 3. 校验配置语法+重启服务
> rsyslogd -N1 在Ubuntu24.04可用；无报错输出代表语法正常
```bash
# 校验配置语法，无输出代表正常
sudo rsyslogd -N1
# 重启日志服务生效
sudo systemctl restart rsyslog
# 查看服务运行状态
sudo systemctl status rsyslog
```

### 4. 模拟业务程序输出日志，验证收集功能
```bash
logger -p local6.info "Business log test: 2026 system running normal"
```

### 5. 查看自定义日志文件是否正常写入数据
```bash
cat /var/log/mytest.log
```

这条指令会正常运行，但结果的时间可能与本地时间不一样
![时间错误](/img/Linux2/time.png)

**故障现象**：日志输出UTC时间，和北京时间相差8小时。
**故障原因**：Ubuntu 24.04 Server 纯净版系统默认时区为UTC通用时区，并非国内北京时间，rsyslog日志服务会直接读取系统时区生成日志时间，导致时差偏差。
![时区](/img/Linux2/timezone.png)

解决方法：修改系统时区为上海时区（国内标准北京时间）
```bash
sudo timedatectl set-timezone Asia/Shanghai
# 验证时区
timedatectl
# 再次测试写日志
logger -p local6.info "Business log: 北京时间时区校准完成"
cat /var/log/mytest.log
```

> 生产经验：日志时间是故障溯源关键，新装服务器第一件事校准系统时区。

## 四、logrotate日志自动切割
业务日志持续增长会打满磁盘。logrotate实现自动切割、压缩、清理旧日志。

> ⚠️Ubuntu24.04踩坑点：
> 1. logrotate配置**不支持行尾中文注释**，会解析失败；
> 2. 新版安全机制，`/var/log`目录组权限可写，必须增加`su root root`指定执行身份，否则直接跳过切割；
> 3. 废弃 `-N` 参数，调试校验使用 `logrotate -d`。

### 1. 进入自定义日志轮转配置目录
> 最佳实践：不要修改logrotate.conf主配置，业务规则全部放在`/etc/logrotate.d/`
```bash
cd /etc/logrotate.d/
```

### 2. 创建专属日志切割规则文件
```bash
sudo vim mytest
```
> 配置内不要写行尾中文注释！注释单独另起一行。写入Ubuntu24.04生产通用配置：
```bash
/var/log/mytest.log {
    su root root
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 root root
}
```
参数简要说明：
- `su root root`：以root用户执行轮转，适配Ubuntu24.04安全校验
- `daily`：按天轮转
- `rotate 7`：保留7份历史日志
- `compress`：gzip压缩历史日志节省磁盘
- `missingok`：日志文件不存在不报错
- `notifempty`：空文件不轮转
- `create 0644 root root`：轮转后新建日志文件权限属主

### 校验配置（debug调试模式，Ubuntu24.04标准）
```bash
sudo logrotate -d /etc/logrotate.d/mytest
```

### 3. 手动强制切割测试
> `-vf`：verbose显示详情 + force强制执行，不用等待定时任务
```bash
sudo logrotate -vf /etc/logrotate.d/mytest
```

### 4. 查看切割结果，验证配置生效
```bash
ls -lh /var/log/ | grep mytest
```

> 坑：日志文件过小/为空时logrotate不会轮转，看不到切割效果。
![日志结果](/img/Linux2/result.png)
优先对测试日志文件补足，查看前后对比。

#### 1. 先写入大量日志，把文件变大
```bash
# 循环写入1000行日志，制造大文件 
for i in {1..1000};do logger -p local6.info "test log $i";done
```

#### 2. 查看【切割前】状态
```bash
ls -lh /var/log/ | grep mytest
```
![切割前](/img/Linux2/before.png)
切割前特征：仅存在`mytest.log` 一个文件，日志全部堆积，文件体积较大。

#### 3. 手动强制触发日志切割
```bash
sudo logrotate -vf /etc/logrotate.d/mytest
```

#### 4. 查看【切割后】状态
```bash
ls -lh /var/log/ | grep mytest
```
![切割后](img/Linux2/after.png)
切割后特征：生成全新空日志文件`mytest.log`，旧日志自动压缩为 `mytest.log.1.gz`，实现日志分离、压缩存储。

## 五、Crontab 日志定时巡检自动化
人工手动查日志效率极低、容易漏报，生产必备 **定时检测系统错误、登录异常、日志膨胀**，自动输出巡检报告，是运维日常自动化核心技能。

### 1.编写日志巡检脚本
创建巡检脚本目录及脚本文件
```bash
sudo mkdir -p /opt/logcheck
sudo vim /opt/logcheck/check_log.sh
```
写入以下脚本内容
```bash
#!/bin/bash
# 系统日志定时巡检脚本（Ubuntu24.04专用）
# 定义巡检报告文件名（带时间戳）
TIME=$(date +%Y-%m-%d_%H-%M)
LOG_DIR="/var/log"
REPORT="/opt/logcheck/report_${TIME}.log"

# 写入巡检头部信息
echo "===================== 服务器日志定时巡检报告 =====================" > $REPORT
echo "巡检时间：${TIME}" >> $REPORT
echo "==================================================================" >> $REPORT

# 1. 检测系统错误日志
echo -e "\n【1. 系统Error错误日志】" >> $REPORT
grep -i "error" $LOG_DIR/syslog | tail -20 >> $REPORT

# 2. 检测系统警告日志
echo -e "\n【2. 系统Warn警告日志】" >> $REPORT
grep -i "warn" $LOG_DIR/syslog | tail -20 >> $REPORT

# 3. 检测登录失败、暴力破解异常
echo -e "\n【3. 账号登录异常日志】" >> $REPORT
grep -i "failed" $LOG_DIR/auth.log | tail -20 >> $REPORT

# 4. 检测自定义业务日志异常
echo -e "\n【4. 自定义业务日志异常】" >> $REPORT
grep -i "error\|fail" $LOG_DIR/mytest.log | tail -20 >> $REPORT

echo -e "\n===================== 巡检结束 =====================" >> $REPORT
```

> 注意：脚本内正则`grep`或条件中管道符`|`在shell脚本中需要转义写成`\|`。

### 2.赋予脚本执行权限
```bash
sudo chmod +x /opt/logcheck/check_log.sh
```

### 3.手动执行脚本，测试是否正常生成报告
```bash
sudo /opt/logcheck/check_log.sh
# 查看生成的巡检报告
ls /opt/logcheck/
cat /opt/logcheck/report_$(date +%Y-%m-%d_%H-%M).log
```

### 4.配置 Crontab 定时任务
编辑当前用户定时任务
```bash
crontab -e
```
首次打开选择编辑器，推荐 `vim.basic`，在文件末尾添加定时规则：
![第一次编辑](/img/Linux2/first.png)
```bash
# 每小时第0分钟自动执行日志巡检
0 * * * * /opt/logcheck/check_log.sh >/dev/null 2>&1

# 每天凌晨2点清理7天前巡检报告，防止报告占满磁盘
0 2 * * * find /opt/logcheck/ -name "report_*.log" -mtime +7 -delete
```

### 5.验证定时任务生效
```bash
# 查看当前用户所有定时任务
crontab -l
# 查看crontab服务状态（root权限）
sudo systemctl status cron
# cron任务执行日志
sudo tail -f /var/log/cron.log
```

> 调试小技巧：测试阶段可以改成 `*/1 * * * *` 每分钟执行，验证脚本是否正常运行。

## 六、本次实操踩坑总览（重点）
1. **系统时区UTC导致日志时间8小时时差**：新装Ubuntu24.04 Server默认UTC，执行`timedatectl set‑timezone Asia/Shanghai`校准。
2. **logrotate行尾中文注释解析报错**：轮转配置禁止行尾写中文注释，注释单独成行。
3. **logrotate报父目录不安全直接跳过切割**：配置添加`su root root`以root身份执行轮转。
4. **logrotate‑N参数不存在**：Ubuntu24.04已移除‑N校验，改用`logrotate‑d`debug模式检查配置。
5. **小文件不会轮转**：logrotate默认空文件/过小文件不会切割，测试时先批量生成测试日志。
6. **crontab脚本不执行**：注意脚本使用绝对路径、脚本加执行权限，查看`/var/log/cron.log`排查任务运行情况。

## 七、学习总结
1. Ubuntu24.04双日志体系：`journalctl`读取二进制系统日志；`rsyslog`输出文本日志到`/var/log`。
2. rsyslog可以接收自定义业务日志，统一落地管理；修改配置务必备份、校验语法再重启。
3. logrotate解决日志磁盘膨胀，新版本有额外安全限制，注意`su root root`参数。
4. crontab配合shell脚本完成自动化日志巡检，同时要定时清理巡检报告，避免次生磁盘占用。
5. 线上环境：时区校准、配置备份、语法校验、测试环境先验证，再上生产。



