---
title: MyBatis 入门系列（二）：增删改查 + 批量删除完整总结（含 @Param 和 foreach）
categories: 
  - MyBatis  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Mybatis
cover: /img/Mybatis_2/p1.png
---
# MyBatis 增删改查 + 批量删除完整总结（含 @Param 和 foreach）
学习完Mybatis的基本操作流程之后，因为Mybatis本身就是用Java操作数据库的一项技术，我们躲不掉的要学习在Mybatis中怎么对数据库进行增删改查。接下来直接上实战：


## 一、Mapper 接口（`UserMapper.java`）

```java
package org.example.mapper;

import org.example.pojo.User;
import org.apache.ibatis.annotations.Param;
import java.util.List;

public interface UserMapper {

    // 查询所有
    List<User> findAll();

    // 根据 id 查询单个
    User findById(Integer id);

    // 新增（返回影响行数，并自动填充自增 id）
    int insert(User user);

    // 修改
    int update(User user);

    // 单条删除
    int deleteById(Integer id);

    // 批量删除（根据 id 列表）
    int deleteByIds(@Param("ids") List<Integer> ids);
}
```

> **注意**：  
> - 返回值类型 `int` 表示影响的行数，有助于判断操作是否成功。  
> - 批量删除的参数用 `@Param("ids")` 注解，供 XML 中的 `foreach` 引用。

---

## 二、XML 映射文件（`UserMapper.xml`）

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
  PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="org.example.mapper.UserMapper">

    <!-- 查询所有 -->
    <select id="findAll" resultType="org.example.pojo.User">
        SELECT * FROM user
    </select>

    <!-- 根据 id 查询 -->
    <select id="findById" resultType="org.example.pojo.User">
        SELECT * FROM user WHERE id = #{id}
    </select>

    <!-- 新增：useGeneratedKeys 获取数据库自增主键 -->
    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO user (name, age) VALUES (#{name}, #{age})
    </insert>

    <!-- 修改 -->
    <update id="update">
        UPDATE user SET name = #{name}, age = #{age} WHERE id = #{id}
    </update>

    <!-- 单条删除 -->
    <delete id="deleteById">
        DELETE FROM user WHERE id = #{id}
    </delete>

    <!-- 批量删除：使用 foreach 生成 IN 子句 -->
    <delete id="deleteByIds">
        DELETE FROM user WHERE id IN
        <foreach collection="ids" item="id" open="(" separator="," close=")">
            #{id}
        </foreach>
    </delete>

</mapper>
```
`foreach` 标签说明
- `collection="ids"`：对应接口中 `@Param("ids")` 的名字。
- `item="id"`：循环中每个元素的临时变量名。
- `open="("` `close=")"`：生成 `IN ( ... )` 的括号。
- `separator=","`：多个值之间的逗号。

---

## 三、测试类（`MyBatisTest.java`）

```java
package org.example;

import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;
import org.example.mapper.UserMapper;
import org.example.pojo.User;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;

public class MyBatisTest {

    private static SqlSessionFactory factory;

    static {
        try {
            InputStream is = Resources.getResourceAsStream("mybatis-config.xml");
            factory = new SqlSessionFactoryBuilder().build(is);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        // 1. 新增
        testInsert();
        // 2. 修改
        testUpdate();
        // 3. 单条删除
        testDeleteById();
        // 4. 批量删除（只删除指定的几个 id）
        testDeleteByIds();
        // 5. 查询所有查看结果
        testFindAll();
    }

    // 新增并获取自增id
    private static void testInsert() {
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);
            User user = new User();
            user.setName("王五");
            user.setAge(28);
            int rows = mapper.insert(user);
            session.commit();
            System.out.println("插入影响行数：" + rows);
            System.out.println("自动生成的id：" + user.getId());
        }
    }

    // 修改 id=1 的用户
    private static void testUpdate() {
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);
            User user = new User();
            user.setId(1);
            user.setName("张三丰");
            user.setAge(99);
            int rows = mapper.update(user);
            session.commit();
            System.out.println("修改影响行数：" + rows);
        }
    }

    // 单条删除（删除 id=2）
    private static void testDeleteById() {
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);
            int rows = mapper.deleteById(2);
            session.commit();
            System.out.println("单条删除影响行数：" + rows);
        }
    }

    // 批量删除：只删除 id 为 1 和 3 的记录（不是全部删除）
    private static void testDeleteByIds() {
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);
            // 你想要删除哪些 id，就写在这个列表中
            List<Integer> idsToDelete = Arrays.asList(1, 3);
            int rows = mapper.deleteByIds(idsToDelete);
            session.commit();
            System.out.println("批量删除影响行数：" + rows);
        }
    }

    // 查询所有并打印
    private static void testFindAll() {
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);
            List<User> list = mapper.findAll();
            System.out.println("当前用户列表：");
            list.forEach(System.out::println);
        }
    }
}
```

---
> **注意**：  
> - 此处的测试类与上次的不同的是，main方法上有一段静态代码块，与第一篇文章的代码功能一样，环境准备，由于在这篇文章中对数据库的操作很多，为了提高性能，只做一次的环境准备。





将三个文件的内容编写好后，运行测试类，运行结果如下：


## 四、核心知识点回顾

### 1. 参数传递：`@Param`
- 当 Mapper 方法有多个参数，或者参数在 XML 中需要明确命名时，使用 `@Param("别名")`。
- 例如：`int deleteByIds(@Param("ids") List<Integer> ids);`，XML 中用 `#{ids}` 引用。
这个注解的意思就是给一个装id的盒子命名，提高代码的可读性。
### 2. 批量操作：`<foreach>`
- 遍历集合生成动态 SQL，常用于 `IN` 子句或批量插入。
- 属性：`collection`（集合名）、`item`（元素变量）、`open`、`close`、`separator`。
这些属性就做一个事，把SQL拼接出来，比如`DELETE FROM user WHERE id IN (1, 3, 5)`

### 3. 获取自增主键
- `<insert useGeneratedKeys="true" keyProperty="实体类属性名">`
- 插入后，原实体对象会自动被赋予生成的主键值。



### 4. 事务提交
- 增、删、改必须调用 `session.commit()` 才会真正写入数据库。
- 如果忘记提交，数据不会变化，且不会报错。

## 五、最后的话
关于在Mybatis上怎么对数据库进行增删改查，我们就学到这了，感谢您的查阅！！！




---

