---
title: Spring Boot 从零入门：请求响应、三层架构与 IOC、DI 实践总结
date: 2026/6/11
categories: 
  - JavaWeb  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Spring Boot
cover: /img/Web_1/p1.png
---
# Spring Boot 从零入门：请求响应、三层架构与 IOC/DI 实践总结





---

## 1. 项目搭建与第一个接口

使用 IDEA 的 Spring Initializr 创建项目，依赖仅选择 **Spring Web**。  
启动类 `HttpStuApplication` 自动生成。在 `controller` 包下创建 `HelloController`：

```java
@RestController
public class HelloController {
    @RequestMapping("/hello")
    public String sayHello() {
        return "Hello, 请求响应学习开始！";
    }
}
```

运行后浏览器访问 `http://localhost:8080/hello`，输出文本 —— 标志着环境验证通过。

---

## 2. 请求响应：参数接收全解析

### 2.1 哪些参数必须掌握？

| 优先级 | 参数类型 | 注解 | 使用频率 |
|--------|----------|------|----------|
| 🔥 必须掌握 | 简单参数 | `@RequestParam`（可省略） | 每天 |
| 🔥 必须掌握 | 路径参数 | `@PathVariable` | 每天 |
| 🔥 必须掌握 | JSON 参数 | `@RequestBody` | 每天 |
| ✅ 常用 | 实体参数 | 无注解，自动封装 | 经常 |
| ⚠️ 了解即可 | 日期参数 | `@DateTimeFormat` | 偶尔 |
| ⚠️ 了解即可 | 数组/集合参数 | `@RequestParam` + `List` | 偶尔 |

### 2.2 不用 Postman，如何高效测试？

IDEA 内置 HTTP Client：在项目根目录re新建 `test.http` 文件，写入请求，点击绿色箭头即可发送。



**示例**（JSON 参数测试）：
```http
POST http://localhost:8080/json
Content-Type: application/json

{
  "name": "张三",
  "age": 18
}
```

这种方法零安装、可保存、支持团队共享，非常适合学习阶段。

### 2.3 常见参数示例代码

```java
@RestController
public class ParamController {
    // 简单参数
    @GetMapping("/simple")
    public String simple(@RequestParam String name, Integer age) { ... }

    // 路径参数
    @GetMapping("/path/{id}")
    public String path(@PathVariable Integer id) { ... }

    // JSON 参数
    @PostMapping("/json")
    public User json(@RequestBody User user) { ... }

    // 实体参数（自动封装）
    @GetMapping("/user")
    public User user(User user) { return user; }
}
```

> **注意**：返回类型为 `String` 时 Spring 输出纯文本；返回对象/集合/Map 时自动转为 JSON。

---
## 4. 分层解耦：三层架构设计

### 4.1 为什么需要分层？

最初将所有代码写在 Controller 中，导致：
- 重复代码（多个接口都要查用户）
- 业务逻辑和请求处理混在一起
- 更换数据源（例如从 Map 改为 MySQL）需要改动多处

### 4.2 标准三层职责

| 层级 | 包名示例 | 职责 | 对象类型 |
|------|----------|------|----------|
| 表示层 | `controller` | 接收请求、参数校验、返回响应 | `XxxController` |
| 业务层 | `service` | 业务逻辑、事务管理、调用 DAO | `XxxService` + `XxxServiceImpl` |
| 数据访问层 | `dao` / `repository` | 数据库 CRUD、模拟数据 | `XxxDao` + `XxxDaoImpl` |

**调用链**：  
`Controller` → `Service` → `DAO` → 数据 → 原路返回。

---


## 5. IoC + DI：彻底告别 `new` 关键字

### 5.1 IoC 与 DI 概念

| 概念 | 含义 | 比喻 |
|------|------|------|
| **IoC** (控制反转) | 对象的创建控制权从程序员反转到 Spring 容器 | 你不必自己 `new`，告诉容器“我需要什么”即可 |
| **DI** (依赖注入) | 容器在创建对象时，自动将依赖的对象赋值给字段 | 容器帮你“接线” |

### 5.2 注解驱动的改造步骤

**原代码**（耦合）：
```java
public class UserServiceImpl implements UserService {
    private UserDao userDao = new UserDaoImpl();   // 主动 new
}
```

**改造后**（解耦）：
```java
@Service
public class UserServiceImpl implements UserService {
    private final UserDao userDao;

    @Autowired   // Spring 4.3+ 单构造器可省略
    public UserServiceImpl(UserDao userDao) {
        this.userDao = userDao;
    }
}
```

同时为 `UserDaoImpl` 添加 `@Repository`，为 `UserController` 中注入 `UserService`。

### 5.3 为什么推荐构造器注入？

| 注入方式 | 代码量 | 不可变性 (`final`) | 单元测试 | 循环依赖检测 | 推荐度 |
|----------|--------|-------------------|----------|--------------|--------|
| 字段注入 | 最少 | ❌ | 困难（需反射） | 容器内可能掩盖 | ❌ 不推荐 |
| Setter 注入 | 中等 | ❌ | 一般 | 无 | ⚠️ 可选 |
| **构造器注入** | 稍多 | ✅ | 简单 `new` 传参 | 启动时报错 | ✅ **强烈推荐** |

构造器注入让依赖显式化、对象不可变、测试更友好。

---

## 6. 统一响应格式（Result 封装）

企业级接口通常不直接返回实体对象，而是返回统一结构的 JSON，方便前端全局拦截。

**标准结构**：
```json
{
  "code": 1,
  "msg": "success",
  "data": { "name": "张三", "age": 18 }
}
```

**实现**：创建 `utils/Result` 类

```java
public class Result {
    private Integer code;
    private String msg;
    private Object data;

    public static Result success(Object data) {
        Result r = new Result();
        r.setCode(1);
        r.setMsg("success");
        r.setData(data);
        return r;
    }
    public static Result error(String msg) {
        Result r = new Result();
        r.setCode(0);
        r.setMsg(msg);
        return r;
    }
    // getter / setter 必须存在
}
```

**Controller 使用**：
```java
@GetMapping("/user/{id}")
public Result getUser(@PathVariable Integer id) {
    User user = userService.getUserById(id);
    if (user == null) {
        return Result.error("用户不存在");
    }
    return Result.success(user);
}
```

> **注意**：Result 类必须有 getter/setter，否则 Spring 无法将字段序列化为 JSON。

---



## 7. 总结和最后的话

| 主题 | 关键点 |
|------|--------|
| 请求响应 | `@RequestParam`、`@PathVariable`、`@RequestBody`；测试用 `.http` |
| 三层架构 | Controller（请求/响应）、Service（业务）、DAO（数据） |
| 面向接口编程 | 接口定义契约，实现类可替换，上层只依赖接口 |
| IoC/DI | `@Service`/`@Repository` + `@Autowired`；推荐构造器注入 |
| 统一响应 | `Result` 封装 code/msg/data，提供静态工厂方法 |

