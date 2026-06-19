---
title: MySQL笔记·第4篇：多表查询详解——内连接、左连接、自连接一篇搞定
date: 2026/6/11
categories: 
  - Mysql  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Mysql
cover: /img/Mysql_4/p1.png
---


### 一、多表查询是什么？

简单来说，在实际的项目管理中，数据库的查询不仅仅是查询一张表的数据，是两张或两张以上的表，这时候是要用到多表查询。
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/3c790d39619d4239b429a962581d771a.png#pic_center)



我们在这建立两张表，一张是学生表，记录学生的学号和姓名，一张是成绩表，记录学生的成绩。接下来用这两张表为例，讲解多表查询。

```sql
-- 学生表
CREATE TABLE student (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);
INSERT INTO student VALUES (1, '张三'), (2, '李四'), (3, '王五');

-- 成绩表
CREATE TABLE score (
    id INT PRIMARY KEY,
    student_id INT,
    score INT
);
INSERT INTO score VALUES (1, 1, 90), (2, 1, 85), (3, 2, 78);
```
用表格表示如下：
| student表 | | score表 | | |
|-----------|-----|---------|-----|-----|
| id | name | id | student_id | score |
| 1 | 张三 | 1 | 1 | 90 |
| 2 | 李四 | 2 | 1 | 85 |
| 3 | 王五 | 3 | 2 | 78 |

---
### 二、三种常用的多表查询
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/eac6b400dc1b438e9a8951116b803ff5.png#pic_center)

#### 1、内连接（INNER JOIN）：两边都要有

```sql
SELECT * FROM student INNER JOIN score ON student.id = score.student_id;
```

结果：

| name | score |
|------|-------|
| 张三 | 90 |
| 张三 | 85 |
| 李四 | 78 |

从结果来看，**王五没有出现。** 原因是虽然王五在学生表中有记录，但是他没有成绩，综合两张表的数据，除了王五都会被查询到

> **一句话记忆：内连接 = 两边都对得上才留**

---

#### 2、左连接（LEFT JOIN）：左边全要

```sql
SELECT * FROM student LEFT JOIN score ON student.id = score.student_id;
```

结果：

| name | score |
|------|-------|
| 张三 | 90 |
| 张三 | 85 |
| 李四 | 78 |
| 王五 | NULL |

从结果来看，与内连接不同的是**王五出现了，只是成绩是NULL。** 原因是在左连接查询中，左表的数据都会被查询到，右表有能匹配上的显示，没有就显示空值。
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/77f9c8da5136493e9ea3eea64b42fbb8.png)

> **一句话记忆：左连接 = 左表全留，右表有就带，没有就空**

与左连接相似的是，右连接 = 右表全留。想用的时候，把表的顺序换一下，用左连接就行。实际开发中很少用右连接。

---

#### 3、自连接：一张表自己连自己

```sql
-- 员工表
CREATE TABLE employee (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    manager_id INT
);
INSERT INTO employee VALUES (1, '张三', NULL), (2, '李四', 1), (3, '王五', 1);

-- 查每个员工的上级
SELECT e.name AS 员工, m.name AS 上级
FROM employee e
LEFT JOIN employee m ON e.manager_id = m.id;
```

自连接主要用于处理同一张表内的层级或比较逻辑，相比其他方案，它能更高效地利用数据库资源。
>❗注意<div style="background-color: #616161; border-left: 4px solid #ffc107; padding: 10px; > margin: 10px 0;"> <strong>✅为了区分同一张表，需要对这一张表起两个别名</strong></div>

结果：

| 员工 | 上级 |
|------|------|
| 张三 | NULL |
| 李四 | 张三 |
| 王五 | 张三 |

> **一句话记忆：自连接 = 一张表当两张表用**

---

### 三、最后的话
关于多表查询的内容就总结学习完毕了，如果对您有帮助的话，请一键三连！！！ 最后感谢你的查阅！！！
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/b2b809a814d54daa932efdcd250c6582.gif#pic_center)
