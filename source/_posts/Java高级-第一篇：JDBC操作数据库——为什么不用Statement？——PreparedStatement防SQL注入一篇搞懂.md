---
title: Java高级-第一篇：JDBC操作数据库——为什么不用Statement？——PreparedStatement防SQL注入一篇搞懂
date: 2026/6/11
categories: 
  - JavaApply  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Java
  - 数据库
cover: /img/Javaplus_1/p1.png
---
### 引入

> 这篇文章我们要学习怎么用Java程序来操作数据库，显而易见的是，我们不能直接跟MySQL说话，而是需要通过JDBC这个中间层。JDBC就是Java用来连接数据库的一套标准接口。

### 案例展示
在写代码之前，我们需要简单配置一下：
1、创建项目和模块
2、在模块下面我们需要一个文件夹去存放JDBC驱动包
3、最后在src文件夹下写我们的代码

4、我们需要编写的代码如下：
由于关于JDBC这项技术，我们只要做到会用和看的懂的情况下，我们只需要看看知道怎么操作就行

```java
// 1. 注册驱动（JDBC 4.0后可以省略）
Class.forName("com.mysql.cj.jdbc.Driver");

// 2. 获取连接（MySQL的数据库、密码和用户名）
String url = "jdbc:mysql://localhost:3306/test";
String username = "root";
String password = "123456";
Connection conn = DriverManager.getConnection(url, username, password);

// 3. 执行SQL
String sql = "SELECT * FROM user WHERE id = ?";
PreparedStatement pstmt = conn.prepareStatement(sql);
pstmt.setInt(1, 1);
ResultSet rs = pstmt.executeQuery();

// 4. 处理结果
while (rs.next()) {
    System.out.println(rs.getString("name"));
}

// 5. 关闭资源
rs.close();
pstmt.close();
conn.close();
```

### 各大API作用

| API | 作用 |
|-----|------|
| `DriverManager` | 注册驱动，获取数据库连接 |
| `Connection` | 代表与数据库的连接，用来创建Statement |
| `PreparedStatement` | 执行SQL（预编译，防注入） |
| `ResultSet` | 存放查询结果，像一张临时表 |


这些API我们只需要知道就可以了，其中我们需要更多了解的是PreparedStatement和Statement。在作用上，两者差不多，但是PreparedStatement是优于Statement的。


### Statement和PreparedStatement的优先级

#### Statement的劣势

Statement的作用就是拼接字符串，案例如下：

```java
String name = request.getParameter("name");
String sql = "SELECT * FROM user WHERE name = '" + name + "'";
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(sql);
```

这时候，如果有恶意用户输入 `' OR '1'='1`，拼出来的SQL就变成：

```sql
SELECT * FROM user WHERE name = '' OR '1'='1'
```

由于`'1'='1'`永远为真，数据库就会返回所有用户，导致数据泄露，这就是我们要防范的SQL注入技术。

#### PreparedStatement的优势

```java
String sql = "SELECT * FROM user WHERE name = ?";
PreparedStatement pstmt = conn.prepareStatement(sql);
pstmt.setString(1, name);
ResultSet rs = pstmt.executeQuery();
```

`?`是占位符。PreparedStatement在**预编译阶段**就把SQL结构固定下来了。用户输入的内容（包括`' OR '1'='1`）仅仅是个字符串，只能作为参数传递，不会改变SQL结构，所以注入不进去。

### 最后的话
关于JDBC这一技术的学习就到这了，只需要做到看得懂会用就行，不必纠结细节，在实际开发中尽量使用PreparedStatement就行了。






