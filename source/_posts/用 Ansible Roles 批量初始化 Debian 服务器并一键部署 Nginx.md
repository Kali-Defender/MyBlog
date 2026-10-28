---
title: 用 Ansible Roles 批量初始化 Debian 服务器并一键部署 Nginx
date: 2026/10/28
categories: 
  - 运维进阶  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Linux
banner: /img/head.png
description: 本文记录了用 Ansible Roles 和两个 playbook 批量初始化 3 台 Debian 服务器并一键部署 Nginx，并通过 `/hello` 探针和 `changed=0` 验证幂等的实践。
---

> 一次「从零到可用 Web 集群」的实践记录：3 台 Debian 受控机，2 个 playbook，6 个初始化步骤，1 个 `/hello` 探针。
> 项目：`ansible_project`（MIT-0）

---

## 一、为什么要做这件事

手工装环境的问题是「第三台永远和第一台不一样」。这次的目标很具体：

- 控制机 `vm1`（Debian，装 ansible-core）通过 **SSH 密钥 + sudo** 批量管理 3 台受控机；
- 受控机 `debian1~3` 一次性完成基础初始化：主机名、`ops` 用户、免密 sudo、SSH 密钥、apt 源、SSH 加固；
- 再用一个 playbook 把 Nginx 装好、配好、首页换掉，并提供 `/hello` 探针；
- 要求**幂等**：再跑一遍 `changed=0`。

选 Roles 而不是「一个大 playbook 从头写到尾」，是因为初始化（init）和业务部署（nginx）的生命周期完全不同：前者一辈子跑一次，后者要反复迭代。

---

## 二、拓扑与环境

```
                        192.168.88.100
                        ┌──────────────┐
                        │ Debian       │
                        │ Ansible      │   控制机 vm1
                        └──────┬───────┘
                     SSH密钥 + sudo
             ┌─────────────────┼─────────────────┐
        ┌────┴────┐      ┌─────┴────┐      ┌─────┴────┐
        │ Debian1 │      │ Debian2 │      │ Debian3 │
        └─────────┘      └──────────┘      └──────────┘
        192.168.88.101   192.168.88.102   192.168.88.103
        └──────────────── web 组 ──────────────────────┘

双网段：
  192.168.88.0/24   Host-Only 网段（验证、内网互访）
  192.168.118.0/24  NAT 动态网段（外网访问 / apt 下载）
```

| 角色 | 主机名 | 系统 / 说明 |
|------|--------|-------------|
| 控制机 | vm1 | Debian，ansible-core + `ansible.posix` |
| 受控机 | debian1/2/3 | Debian，Python 3.13，部署 Nginx |


---

## 三、目录结构

```
ansible_project/
├── inventory.ini          # 主机清单（web 组：debian1~3）
├── Init.yaml              # 基础初始化 playbook
├── site.yaml              # Nginx 部署 playbook
├── secrets.yml            # Ansible Vault（AES256）加密变量
├── .gitignore             # 排除 vim 交换文件
└── roles/
    ├── init/
    │   ├── tasks/main.yml           # 6 个任务
    │   ├── templates/sources.list.j2
    │   ├── handlers/main.yml        # 更新 apt 缓存、重启 ssh
    │   ├── defaults/main.yml        # apt 镜像地址（可覆盖）
    │   ├── vars/  meta/  README.md
    └── nginx/
        ├── tasks/main.yml           # 安装、启动、渲染配置、部署首页
        ├── templates/nginx.j2
        ├── files/index.html
        ├── handlers/main.yml        # 重启 nginx
        └── vars/  meta/  tests/  README.md
```

`defaults` 和 `vars` 都留着，是有意为之：`defaults` 放「用户可能想覆盖的」（apt 镜像），`vars` 放「角色内部真正的常量」。现在 `vars` 是空的，但保持了标准骨架，后面加东西不用改结构。

---

## 四、init 角色：把「新机器标准动作」固化

6 个任务，每个任务在注释里都写了对应的原生 Linux 命令——这是我坚持的习惯，Ansible 抹平了细节，但出问题时必须能落到 shell 上排查。

| # | 任务 | 模块 | 等价的 shell |
|---|------|------|--------------|
| 1 | 设置主机名 | `hostname` | `hostnamectl set-hostname debian1` |
| 2 | 创建 ops 用户 | `user` | `useradd -m -s /bin/bash ops` |
| 3 | 免密 sudo | `copy` + `validate` | 写 `/etc/sudoers.d/ops-nopasswd` 并 `chmod 0440` |
| 4 | SSH 密钥 | `ansible.posix.authorized_key` | 组装 `~/.ssh` 权限 + 追加 `authorized_keys` |
| 5 | apt 源 | `template` + `notify` | `cp` 备份 + 改 `sources.list` + `apt-get update` |
| 6 | SSH 加固 | `lineinfile` ×2 + `notify` | `sed` 改 `sshd_config` + `systemctl restart ssh` |

### 4.1 主机名用 `inventory_hostname`

```yaml
- name: 设置主机名为inventory里的名字
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"
```

变量不写死，主机名就直接和清单对齐：`debian1` 这台机器的主机名一定叫 `debian1`。这是「清单即事实来源」的最小体现。

### 4.2 免密 sudo 的关键在 `validate`

```yaml
- name: 给ops免密sudo
  ansible.builtin.copy:
    dest: /etc/sudoers.d/ops-nopasswd
    content: "ops ALL=(ALL) NOPASSWD:ALL\n"
    owner: root
    group: root
    mode: "0440"
    validate: "visudo -cf %s"
```

**这是整个角色里我最有安全感的一行。** 直接 `echo` 写 sudoers 一旦语法错，sudo 就整体报废，只能靠控制台/单用户模式救回来。`validate` 让 Ansible 先把内容写到临时文件、用 `visudo -cf` 校验，通过了才覆盖正式文件。加上 `mode: 0440` 和 `owner: root`，才符合 sudoers.d 的要求（权限过宽 sudo 会直接忽略该文件）。

### 4.3 apt 源模板化

```jinja
{{ ansible_managed | comment }}
# 由 Ansible roles/init 自动生成，请勿手动编辑

deb {{ apt_mirror }} {{ ansible_distribution_release }} main contrib non-free non-free-firmware
deb {{ apt_mirror }} {{ ansible_distribution_release }}-updates main contrib non-free non-free-firmware
deb {{ apt_mirror_security }} {{ ansible_distribution_release }}-security main contrib non-free non-free-firmware
```

- `ansible_distribution_release` 自动取 `bookworm` 之类的代号，换发行版不用改模板；
- 镜像地址抽到 `defaults/main.yml`，想换国内源只改一处、或在 playbook 里覆盖；
- `backup: true` 保留原文件，出事能回滚；
- 改动后 `notify: 更新apt缓存`，只有真的变了才 `apt-get update`——这正是幂等的关键。

### 4.4 SSH 加固：改完必须重启，但只能重启一次

```yaml
- name: 禁止root密码登录
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?PermitRootLogin'
    line: 'PermitRootLogin prohibit-password'
  notify: 重启ssh

- name: 禁止密码认证
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?PasswordAuthentication'
    line: 'PasswordAuthentication no'
  notify: 重启ssh
```

两个任务都 notify 同一个 handler。Ansible 的 handler 在执行阶段**对同名 handler 去重**，所以即便两处都变更，`ssh` 也只重启一次——这比在任务里直接 `service: state=restarted` 优雅得多。

`regexp: '^#?PermitRootLogin'` 同时匹配「被注释掉的默认行」和「已改过的行」，所以第一次是替换注释行，第二次跑就是无操作。

> ⚠️ 顺序陷阱：加固**会关闭密码登录**。务必确认 `ops` 用户的密钥登录已经生效再跑这一步，否则会把自己锁在门外。项目 README 里也专门写了这条警告，我认为这是必须写进文档的第一优先级安全提示。

---

## 五、nginx 角色：部署只是四步

```yaml
- name: 安装Nginx        → apt: name=nginx state=present
- name: 启动Nginx服务    → service: state=started enabled=true
- name: 渲染 nginx 配置  → template: nginx.j2 → sites-available/default
- name: 部署应用首页     → copy: index.html → /var/www/html/index.nginx-debian.html
```

第 3、4 步都 `notify: 重启 nginx`，同样只重启一次。

### 5.1 一个 Debian 特有的坑：默认首页叫 `index.nginx-debian.html`

```nginx
root /var/www/html;
index index.nginx-debian.html index.html;
```

在 Debian/Ubuntu 上，Nginx 装完的欢迎页文件名是 `index.nginx-debian.html`，不是 `index.html`。如果你只往 `/var/www/html/index.html` 丢文件，浏览器打开的仍然是 Nginx 的欢迎页——而 `curl` 又确实返回 200，非常迷惑。所以模板里显式把 `index.nginx-debian.html` 排在前面，并且把自定义首页直接覆盖到这个名字上，双保险。

### 5.2 `/hello` 探针：把「部署成功」变成可验证的字符串

```nginx
location = /hello {
    add_header Content-Type text/plain;
    return 200 'hello from {{ inventory_hostname }} ({{ ansible_default_ipv4.address }})\n';
}
```

这个 3 行配置是整个项目里性价比最高的东西：

```bash
$ curl http://192.168.118.101/hello
hello from debian1 (192.168.118.101)
$ curl http://192.168.118.102/hello
hello from debian2 (192.168.118.102)
```

- `=` 精确匹配，不受 `location /` 的 `try_files` 影响，不会 404；
- 模板在**渲染时**就把主机名和 IP 烤进去了，所以每条返回都能证明「这台机器收到了属于它自己的配置」，而不是三台跑的是同一份配置；
- `add_header` 保证浏览器/终端不会把纯文本当 HTML 下载。

配置渲染正确、服务在跑、主机清单映射正确——一条 `curl` 同时验证了三件事。

---

## 六、执行流程

### 6.1 首次初始化：ops 用户还不存在

```bash
ansible-playbook Init.yaml -i inventory.ini -u root -k
```

鸡生蛋问题：清单里 `ansible_user=ops`，但第一次跑时 `ops` 还没被创建。所以首跑临时用 `-u root -k`（交互输入密码）覆盖连接用户。这一步是**唯一一次**需要密码。

### 6.2 部署 Nginx

```bash
ansible-playbook site.yaml -i inventory.ini
```

此时 `ops` + 密钥 + 免密 sudo 都已就位，可以完全无密码、无交互地跑。如果用到加密变量：

```bash
ansible-playbook site.yaml -i inventory.ini --vault-password-file ~/.vault_pass
```

### 6.3 验证

```bash
# 1) 连通性：三台全返回 pong
ansible web -i inventory.ini -m ping

# 2) 首页 200
curl -s -o /dev/null -w '%{http_code}\n' http://192.168.118.101/

# 3) /hello 探针：主机名 + IP
curl http://192.168.118.101/hello

# 4) 初始化结果
ssh ops@192.168.118.101 hostnamectl status
ansible web -i inventory.ini -m shell -a 'sudo -n true && echo sudo-ok'
ansible web -i inventory.ini -m shell -a 'grep -E "^(PermitRootLogin|PasswordAuthentication)" /etc/ssh/sshd_config'

# 5) 幂等性：再跑一遍应 changed=0 / failed=0
ansible-playbook Init.yaml -i inventory.ini
ansible-playbook site.yaml -i inventory.ini
```

第 5 步是我认为「这个项目算不算完成」的唯一判据。`PLAY RECAP` 里 `changed=0`、`failed=0`，说明所有任务都正确使用了声明式模块、且 handler 没有乱触发。

---

## 七、踩坑与复盘

| 问题                    | 现象                    | 处理                                                                      |
| --------------------- | --------------------- | ----------------------------------------------------------------------- |
| Debian 默认首页文件名不同      | `curl /` 返回 Nginx 欢迎页 | 首页覆盖到 `index.nginx-debian.html`                                         |
| sudoers 语法风险          | 写错则 sudo 全废           | `validate: visudo -cf %s` + `mode 0440`                                 |
| 首跑无 `ops` 用户          | 直接跑 playbook 认证失败     | 首跑 `-u root -k`，之后走密钥                                                   |
| SSH 加固自锁              | 禁密码后无法登录              | 先验证密钥可用，README 明确警告                                                     |
| 两处改 `sshd_config`     | 担心重启两次断开              | 同名 handler 自动去重                                                         |
| vim 交换文件误入仓库          | `.Init.yaml.wap` 之类   | `.gitignore` 排除 `*.wap/*.swp/*.swo`（本次目录里确实还残留一个 `.wap`，说明规则加得及时但清理要跟上） |

---
## 八 、小结

这个项目的价值不在「几行 YAML 装了 Nginx」，而在于把三件容易出事的操作变成了可重复、可验证的流程：

- **可重复**：Roles + defaults，一次写好，N 台机器一致；
- **可验证**：`changed=0` 证明幂等，`/hello` 证明「每台机器跑的是自己的配置」；
- **可回退**：apt 源 `backup: true`、sudoers `validate`、SSH 加固有明确的安全前提。

清单里的 3 台机器、2 个 playbook、6 个初始化任务和 1 个 `/hello` 探针——从裸机到「三台可访问、主机名正确、运维用户就位、SSH 已加固」的 Web 节点，一条命令的事。

---

*环境：Debian，ansible-core，`ansible.posix` collection；受控机 Python 3.13（`/usr/bin/python3.13`）；License MIT-0。*
