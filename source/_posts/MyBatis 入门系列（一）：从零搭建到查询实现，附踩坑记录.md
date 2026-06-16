---
title: MyBatis 入门系列（一）：从零搭建到查询实现，附踩坑记录
categories: 
  - MyBatis  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Mybatis
cover: /img/Mybatis_1/p1.png
---
# 从零开始学 MyBatis：新手踩坑之路与核心原理详解

> 适合完全零基础的新手，用最直白的语言讲清楚 MyBatis 是什么、怎么用，以及必须搞懂的 5 个核心问题。

## 一、为什么要学 MyBatis？
在我们以前的学习中，我们用Java操作数据库的方法只有JDBC，我们先回顾一下JDBC是怎么操作数据库的，为了操作数据库我们需要编写加载驱动、建立连接、写 SQL、处理结果集、关闭连接…… 十几行甚至几十行模板代码，不仅枯燥，而且代码量上来之后，出错的概率也增大了。



从这我们就可以看出JDBC的劣势了，基本就是我们全自动的去操作数据库，JDBC只是一个用Java操作数据库的一个桥梁。本身并没有给我们带来任何便捷，经过技术的迭代，我们看到了Mybatis这项新的技术。

**MyBatis 就是来拯救你的**：你只需要定义接口 + 写 SQL，它自动帮你完成剩下的一切（获取连接、预编译、执行、对象封装）。在一定程度上实现了Java操作数据库的半自动流程，省去我们的麻烦。

## 二、环境搭建（IDEA + Maven + MySQL）

### 1. 创建项目（普通 Maven 项目，不要直接用 Spring Boot）

- IDEA → New Project → 左侧选 **Java** → 右侧构建系统选 **Maven**
- 点击 Create


### 2. 添加依赖（pom.xml）
在pom.xml文件中添加Mybatis的依赖：
```xml
<dependencies>
    <!-- MyBatis 核心 -->
    <dependency>
        <groupId>org.mybatis</groupId>
        <artifactId>mybatis</artifactId>
        <version>3.5.13</version>
    </dependency>
    <!-- MySQL 驱动 -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <version>8.0.33</version>
    </dependency>
    <!-- Lombok（选装，简化实体类） -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>1.18.30</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

### 3. 准备数据库表（MySQL）

```sql
CREATE TABLE user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50),
    age INT
);
INSERT INTO user (name, age) VALUES ('张三', 25), ('李四', 30);
```

### 4. 项目结构（最终长这样）
![图片描述](/img/MyBatis_1/p2.png)



## 三、第一个可运行的 MyBatis 程序

### 3.1 实体类 User.java
这里使用lombok来简化一下代码，降低我们的工作量：
Lombok 在编译时根据注解自动生成 getter、setter 等方法的字节码，所以你不需要手写，但最终 .class 文件里它们都存在。
```java
package org.example.pojo;
import lombok.Data;

@Data
public class User {
    private Integer id;
    private String name;
    private Integer age;
}
```

### 3.2 Mapper 接口 UserMapper.java

```java
package org.example.mapper;
import org.example.pojo.User;
import java.util.List;

public interface UserMapper {
    List<User> findAll();
    User findById(Integer id);
}
```

### 3.3 核心配置文件 mybatis-config.xml

放在 `src/main/resources` 下：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration
  PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
    <environments default="development">
        <environment id="development">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <property name="driver" value="com.mysql.cj.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql://localhost:3306/你的库名?useSSL=false&amp;serverTimezone=UTC&amp;allowPublicKeyRetrieval=true"/>
                <property name="username" value="root"/>
                <property name="password" value="你的密码"/>
            </dataSource>
        </environment>
    </environments>
    <mappers>
        <mapper resource="UserMapper.xml"/>
    </mappers>
</configuration>
```

> 注意：一定要根据自己本地的数据库的配置文件将端口、库名和密码填写好

### 3.4 SQL 映射文件 UserMapper.xml

也放在 `src/main/resources` 下：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
  PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="org.example.mapper.UserMapper">
    <select id="findAll" resultType="org.example.pojo.User">
        SELECT * FROM user
    </select>
    <select id="findById" resultType="org.example.pojo.User">
        SELECT * FROM user WHERE id = #{id}
    </select>
</mapper>
```

### 3.5 测试类 MyBatisTest.java

```java
package org.example;

import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;
import org.example.mapper.UserMapper;
import org.example.pojo.User;
import java.io.InputStream;
import java.util.List;

public class MyBatisTest {
    public static void main(String[] args) throws Exception {
        InputStream is = Resources.getResourceAsStream("mybatis-config.xml");
        SqlSessionFactory factory = new SqlSessionFactoryBuilder().build(is);
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);
            List<User> users = mapper.findAll();
            users.forEach(System.out::println);
            User user = mapper.findById(1);
            System.out.println(user);
        }
    }
}
```

运行 main 方法，如果控制台打印出数据库里的用户数据，恭喜你，MyBatis 已经跑通了！


## 四、新手必踩的坑 & 解决方法

### 坑1：`ClassNotFoundException: com.demo.pojo.User`

**原因**：你在 `UserMapper.xml` 中写的 `resultType` 包路径与实体类实际包路径不一致（例如示例中用了 `com.demo.pojo.User`，但你的实体类在 `org.example.pojo.User`）。

**解决**：**必须完全一致**，XML 中的所有全限定类名（`namespace`、`resultType`、`parameterType`）都要与 Java 代码中的包名+类名一模一样。

### 坑2：`Communications link failure`

**现象**：IDEA 自带的 Database 工具能连上 MySQL，但 MyBatis 程序报连接失败。

**原因**：MySQL 8.0 需要额外参数才能正常连接，尤其是时区和公钥检索。

**解决**：在 `url` 中添加：

```
?useSSL=false&amp;serverTimezone=UTC&amp;allowPublicKeyRetrieval=true
```

注意 XML 中的 `&` 必须转义为 `&amp;`。


## 五、五个你必须搞懂的核心问题（新手进阶）

在跑通代码之后，你对 MyBatis 可能还是“一知半解”。下面这五个问题，搞懂了才算真正入门。

### 1. `SqlSessionFactoryBuilder` → `SqlSessionFactory` → `SqlSession` 分别是什么？

- **SqlSessionFactoryBuilder**：读配置文件，造一个工厂（一次性工具）。
- **SqlSessionFactory**：工厂，负责生产 SqlSession，整个应用通常只有一个（单例）。
- **SqlSession**：代表一次数据库会话，可以执行 SQL、获取 Mapper，用完必须关闭。

**生活类比**：  
- 工厂图纸 → SqlSessionFactoryBuilder  
- 工厂本身 → SqlSessionFactory  
- 工厂生产的一个工人（干完活就下班） → SqlSession

### 2. 为什么要用 `try (SqlSession session = factory.openSession())`？

这是 try-with-resources 语法，会自动调用 `session.close()` 释放数据库连接。如果忘记关闭，他会自动关闭数据库资源，不会导致程序卡死。即一个即开即用，不用则闭的一个盒子。

### 3. `#{id}` 和 `${id}` 有什么区别？

- `#{id}`：预编译占位符，生成 `?`，安全防 SQL 注入。**99% 的情况都用这个**。
- `${id}`：直接字符串替换，有注入风险。只有极少数场景（如动态表名、动态列名）才用到。

### 4. Mapper 接口为什么不用写实现类？`namespace + id` 是地址吗？

**核心原理**：MyBatis 使用 JDK 动态代理，在内存中自动生成一个实现了该接口的代理对象。当你调用 `mapper.findAll()` 时，代理对象根据 `namespace`（接口全限定名）+ `id`（方法名）找到对应的 SQL 语句并执行。

**所以**：`namespace + id` 就像门牌号（小区名+楼栋号），MyBatis 通过它精确定位到 XML 中那条 SQL。

### 5. 为什么 `resultType` 必须写全限定类名（如 `org.example.pojo.User`）？

因为 MyBatis 需要通过反射创建该类的实例，并把数据库列的值填充到对象的属性中。如果你只写 `User`，MyBatis 不知道它在哪个包下，就会报 `ClassNotFoundException`。



## 六、写在最后

MyBatis 并不难，难的是没有人帮你把那些“理所当然”的底层机制讲清楚。今天我们从零开始，亲手搭建了一个能跑的 MyBatis 程序，也把五个最核心的困惑彻底搞明白了。


> 如果你按照本文一步步操作，仍然遇到问题，欢迎在评论区留言，我会尽力帮你解决。



