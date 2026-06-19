---
title: MySQL笔记-第3篇：一篇搞懂事务、ACID和隔离级别
date: 2026/6/11
categories: 
  - Mysql  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Mysql
cover: /img/Mysql_3/p1.png
---


### 一、事务是什么？

简单来说，**事务就是把完成同一目标的多个SQL操作打包成一个整体**，举个例子：你给朋友转账100块。
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/9a856cb11c2643ccbf02309547c68264.png#pic_center)


对于熟悉SQL的我们来说，这个需求很快就可以完成。
```sql
UPDATE account SET money = money - 100 WHERE id = 1;  -- 你扣钱
UPDATE account SET money = money + 100 WHERE id = 2;  -- 朋友加钱
```

在实际的SQL运行环境中，如果第一个UPDATE执行完了，第二个还没执行，系统崩了，结果你的钱扣了，但朋友没收到。为了解决这一问题，我们提出的事务的概念。

简单来说，**事务就是把完成同一目标的多个SQL操作打包成一个整体**。在这个场景中，就是把转钱这一目标打包成一个整体，**这两个操作要么都成功，要么都失败，不允许中间状态。** 这样就不会出现**钱丢了**的故障。


### 二、怎么用？
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/357339931a494f2497c21d6261b3409d.png#pic_center)

```sql
START TRANSACTION;           -- 开启事务
UPDATE account SET money = money - 100 WHERE id = 1;
UPDATE account SET money = money + 100 WHERE id = 2;
COMMIT;                      -- 没问题就提交
-- 如果出问题，用 ROLLBACK 回滚
ROLLBACK;
```
简单来说，只要用三个命令就可以控制事务：
| 命令 | 作用 |
|------|------|
| `START TRANSACTION` | 开启事务 ，执行SQL语句|
| `COMMIT` | 提交结果，让所有修改生效 |
| `ROLLBACK` | 回滚事务，撤销所有修改 |

当事务执行过程中，系统没有发生故障，最后只需要提交运行结果，但如果系统出现故障，需要对事务进行回滚，防止错误的结果上传数据库，导致错误。

### 三、事务的四个特性（ACID）

| 特性 | 人话 |
|------|------|
| **原子性** | 要么全成功，要么全失败 |
| **一致性** | 钱不会凭空消失或出现 |
| **隔离性** | 你转账不会影响别人转账 |
| **持久性** | 转完了，钱就在那儿了 |

知道这四个词就行，目的是体现事务在完成一个目标的稳定性和独立性。实际写代码时，我们只需要记住：**开启 → 执行 → 提交/回滚**的流程。

---

### 四、一个必踩的坑

由于MySQL默认开启了**自动提交**即每执行一条SQL，就自动帮你`COMMIT`。

```sql
UPDATE account SET money = money - 100 WHERE id = 1;
-- 这条执行完，自动提交了，改不回来了
UPDATE account SET money = money + 100 WHERE id = 2;
```

**如果你想多条SQL作为一个事务，必须手动`START TRANSACTION`。**

```sql
START TRANSACTION;
UPDATE account SET money = money - 100 WHERE id = 1;
UPDATE account SET money = money + 100 WHERE id = 2;
COMMIT;
```
在实际的工作中最好使用手动提交，避免错误数据上传数据库。


### 五、隔离级别

事务之间会互相影响，会造成一些不可避免的问题
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/1a817c31bddc4d01a0d39bcfe57d3a45.png#pic_center)
为了解决这些问题，我们提出了事务的四个隔离等级。

| 隔离级别 | 能解决 | 仍有问题 | 性能 |
|---------|--------|---------|------|
| 读未提交 | 无 | 脏读、不可重复读、幻读 | 最好 |
| 读已提交 | 脏读 | 不可重复读、幻读 | 较好 |
| 可重复读（MySQL默认） | 脏读、不可重复读 | 幻读 | 一般 |
| 串行化 | 全部 | 无 | 最差 |

从表格可以明显看到，隔离等级越高，性能越差，对整个数据库的管理效率越低，所以**一句话建议：MySQL默认的“可重复读”就够了，别乱改。**

## 六、最后的话
关于数据库的事务的知识总结完毕，如果对你有帮助的话，可以一键三连！！！最后感谢你的查阅！！！
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/988d51c596064ca3ada2e942c1af7169.gif#pic_center)


---



---

