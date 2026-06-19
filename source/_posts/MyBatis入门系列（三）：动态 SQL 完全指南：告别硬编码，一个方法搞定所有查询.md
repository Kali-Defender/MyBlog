---
title: MyBatis入门系列（三）：动态 SQL 完全指南：告别硬编码，一个方法搞定所有查询
date: 2026/6/16
categories: 
  - MyBatis  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Mybatis
cover: /img/Mybatis_3/p1.png
---
# MyBatis 动态 SQL 完全指南：告别硬编码，一个方法搞定所有查询


## 一、为什么需要动态 SQL？

在真实项目中，一个查询接口往往要支持多种条件组合：比如用户列表页，可以按姓名模糊查询、按年龄精确查询、两者组合查询，或者什么都不填查询全部。如果用硬编码写 SQL，你可能需要写 4 个不同的方法，代码臃肿且难维护。

**动态 SQL** 让你在 XML 中根据传入的参数“智能拼接” SQL 语句，一个方法搞定所有情况。

## 二、核心标签一览

| 标签 | 作用 | 类比 |
|------|------|------|
| `<if>` | 条件判断，满足时才拼 SQL 片段 | Java 中的 `if` |
| `<where>` | 自动处理 `WHERE` 关键字和多余的 `AND`/`OR` | 智能的 `WHERE` 生成器 |
| `<set>` | 动态生成 `SET` 子句，自动去掉末尾逗号 | 智能的 `SET` 生成器 |
| `<choose>/<when>/<otherwise>` | 多选一，只执行第一个满足的条件 | Java 中的 `switch` |
| `<foreach>` | 遍历集合，生成 `IN` 子句或批量 `VALUES` | 循环拼接 |

## 三、详细讲解与代码示例

### 1. `<if>`：条件判断

最简单的动态标签，`test` 里写 OGNL 表达式。

**场景**：查询用户，姓名可选、年龄可选。

```xml
<select id="findUser" resultType="com.example.User">
    SELECT * FROM user WHERE 1=1
    <if test="name != null and name != ''">
        AND name LIKE CONCAT('%', #{name}, '%')
    </if>
    <if test="age != null">
        AND age = #{age}
    </if>
</select>
```

> ⚠️ 为什么有 `WHERE 1=1`？为了防止所有条件都不满足时 SQL 变成 `SELECT * FROM user WHERE`（语法错误）。但 MyBatis 提供了更好的 `<where>` 标签。

### 2. `<where>`：智能 WHERE 子句

自动：
- 如果至少有一个条件成立，就添加 `WHERE` 关键字。
- 去除第一个条件前多余的 `AND` 或 `OR`。

**改进上面的例子**：

```xml
<select id="findUser" resultType="com.example.User">
    SELECT * FROM user
    <where>
        <if test="name != null and name != ''">
            AND name LIKE CONCAT('%', #{name}, '%')
        </if>
        <if test="age != null">
            AND age = #{age}
        </if>
    </where>
</select>
```

无论条件是否成立，最终 SQL 都是正确的。例如只有 `name` 条件时生成：
```sql
SELECT * FROM user WHERE name LIKE CONCAT('%', '张', '%')
```

### 3. `<set>`：动态 UPDATE 子句

只更新传入的非空字段，避免把未传字段覆盖为 `NULL`。

```xml
<update id="updateUser">
    UPDATE user
    <set>
        <if test="name != null and name != ''">
            name = #{name},
        </if>
        <if test="age != null">
            age = #{age},
        </if>
        <if test="email != null">
            email = #{email},
        </if>
    </set>
    WHERE id = #{id}
</update>
```

- `<set>` 会自动去掉末尾多余的逗号。
- 如果所有条件都不满足，`<set>` 不会生成 `SET` 子句，SQL 会报错，因此业务上要至少保证一个字段更新。

### 4. `<choose>/<when>/<otherwise>`：分支选择

只执行第一个满足的 `<when>`，类似 `switch`。常用于多条件互斥的场景。

**场景**：根据传入的排序字段动态决定 `ORDER BY`。

```xml
<select id="findUsers" resultType="com.example.User">
    SELECT * FROM user
    <choose>
        <when test="orderBy == 'name'">
            ORDER BY name ASC
        </when>
        <when test="orderBy == 'age'">
            ORDER BY age ASC
        </when>
        <otherwise>
            ORDER BY id DESC
        </otherwise>
    </choose>
</select>
```

### 5. `<foreach>`：遍历集合

最常用的场景：**批量删除**（`IN` 子句）和**批量插入**。

#### 5.1 批量删除（IN）

```xml
<delete id="deleteByIds">
    DELETE FROM user WHERE id IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</delete>
```

- `collection`：Mapper 方法中参数的名字（需要 `@Param("ids")`）。
- `item`：循环中每个元素的临时变量名。
- `open` / `close`：循环前后拼接的字符。
- `separator`：元素间的分隔符。

#### 5.2 批量插入（多条 VALUES）

```xml
<insert id="insertBatch">
    INSERT INTO user (name, age) VALUES
    <foreach collection="list" item="user" separator=",">
        (#{user.name}, #{user.age})
    </foreach>
</insert>
```

> 注意：`separator` 是 `,`，会在两条 `(…)` 之间添加逗号，最终形成 `VALUES (…), (…), (…)`。

## 四、OGNL 表达式小贴士

`<if test="...">` 里的表达式常用写法：

| 类型 | 条件写法 | 说明 |
|------|----------|------|
| 字符串非空 | `name != null and name != ''` | 注意空串判断 |
| 数字非空 | `age != null` | 数字不会有空串 |
| 字符串比较 | `name == 'admin'` | 单引号 |
| 逻辑运算 | `and / or / !` | 例如 `!(age > 100)` |
| 调用方法 | `name.length() > 0` | 尽量用简单的表达式 |

> 注意：XML 中 `<` 和 `>` 需要转义：`&lt;` 和 `&gt;`。例如 `age &lt; 18`。

## 五、完整实战案例：用户动态查询 + 动态更新

**Mapper 接口**：

```java
public interface UserMapper {
    // 动态查询（支持 name, age 可选）
    List<User> findUser(@Param("name") String name, @Param("age") Integer age);
    
    // 动态更新（只更新传入的非空字段）
    int updateUser(User user);
}
```

**XML 映射**：

```xml
<mapper namespace="com.example.mapper.UserMapper">
    
    <select id="findUser" resultType="com.example.User">
        SELECT * FROM user
        <where>
            <if test="name != null and name != ''">
                AND name LIKE CONCAT('%', #{name}, '%')
            </if>
            <if test="age != null">
                AND age = #{age}
            </if>
        </where>
    </select>
    
    <update id="updateUser">
        UPDATE user
        <set>
            <if test="name != null and name != ''">
                name = #{name},
            </if>
            <if test="age != null">
                age = #{age},
            </if>
        </set>
        WHERE id = #{id}
    </update>
    
</mapper>
```

**测试代码**：

```java
// 只按姓名查询
List<User> users = mapper.findUser("张", null);
// 按姓名+年龄查询
List<User> users2 = mapper.findUser("张", 25);
// 什么都不传，查询全部
List<User> all = mapper.findUser(null, null);

// 动态更新：只修改姓名
User u = new User();
u.setId(1);
u.setName("新名字");
mapper.updateUser(u);
session.commit();
```

## 六、常见错误与避坑指南

1. **`WHERE 1=1` 与 `<where>` 混用**  
   如果用 `<where>` 就不要手写 `WHERE 1=1`，否则 `<where>` 无法智能移除 `AND`，可能导致 `WHERE AND name = ...` 的语法错误。

2. **`<set>` 内没有条件时不生成 SET**  
   如果所有 `<if>` 都不满足，最终 SQL 是 `UPDATE user WHERE id = ?`（缺少 SET 子句），会报错。业务上应至少保证一个字段被更新。

3. **`<foreach>` 的 `collection` 名字错误**  
   - 如果不加 `@Param`，List 参数默认名字是 `list`，数组是 `array`。  
   - 推荐总是用 `@Param` 显式命名，然后 `collection` 写这个名字。

4. **OGNL 表达式中字符串比较漏掉空串**  
   对于字符串参数，除了 `!= null`，通常还要 `!= ''`，否则前端传空字符串时条件依然成立。

## 七、总结：动态 SQL 到底有多重要？

- 它让后端接口可以 **一个方法支持无限种查询组合**，无需写多个 Mapper 方法。
- 它是 MyBatis 区别于 JPA 的一大优势，尤其适合复杂报表、多条件筛选场景。
- 你不需要成为 OGNL 专家，掌握常见的 `<if>`、`<where>`、`<foreach>` 就能覆盖 90% 的需求。

**学完动态 SQL，你已经能写出灵活、可维护的数据库访问层。** 下一步可以学习分页插件或 Spring Boot 整合，将 MyBatis 用到真实项目中。

> 本文是 MyBatis 学习系列的第二篇。上一篇：[从零开始学 MyBatis：环境搭建 + 第一个查询 + 5个核心问题]（如果你写了可以放链接）