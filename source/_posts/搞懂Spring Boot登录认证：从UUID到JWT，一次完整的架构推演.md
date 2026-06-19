---
title: 搞懂Spring Boot登录认证：从UUID到JWT，一次完整的架构推演
date: 2026/6/11
categories: 
  - JavaWeb  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Spring Boot
cover: /img/Web_2/p1.png
---
# 从UUID到JWT再到Filter/Interceptor：Spring Boot登录认证进阶之路

这篇文章要带你从零实现一个Spring Boot登录接口，并一步步将它从“临时UUID令牌”演变成**无状态的JWT**，再通过**Filter → Interceptor → 统一异常处理**，最终得到一个规范、可维护的认证架构。我们不依赖前端，只使用IDEA内置的HTTP Client做所有测试。所有代码都会给出，你可以复制即用。

---

## 1. 基础登录：模拟数据 + UUID令牌

我们先从最简单的入手：接收用户名密码，验证后返回一个临时令牌。所有用户数据先用`HashMap`硬编码在内存里，令牌就用`UUID`随机生成。

### 1.1 项目结构
```
src/main/java/com/example/demo
├── DemoApplication.java                     // 启动类
├── config
│   └── WebConfig.java                       // 配置拦截器、跨域等
├── controller
│   └── UserController.java                  // 登录、用户接口
├── dto
│   └── LoginRequest.java                    // 登录请求体
├── exception
│   ├── GlobalExceptionHandler.java          // 全局异常处理
│   └── UnauthorizedException.java           // 自定义未授权异常
├── filter
│   └── LoginCheckFilter.java                // 登录校验过滤器（可选）
├── interceptor
│   └── LoginCheckInterceptor.java           // 登录校验拦截器
├── service
│   └── UserService.java                     // 用户服务（验证逻辑）
└── util
    └── JwtUtil.java                         // JWT 工具类
 ```


### 1.2 请求DTO

```java
// LoginRequest.java
public class LoginRequest {
    private String username;
    private String password;
    // 必须有无参构造，Spring才能把JSON转成对象
    public LoginRequest() {}
    // getter/setter 略
}
```

> **注意**：如果只有全参构造而没有无参构造，Spring反序列化时会直接报400，这是一个新手非常容易踩的坑。

### 1.3 Service——模拟用户与令牌管理

```java
@Service
public class UserService {
    // 模拟数据库中的用户
    private static final Map<String, String> MOCK_USERS = new HashMap<>();
    static {
        MOCK_USERS.put("admin", "123456");
        MOCK_USERS.put("user", "password");
    }

    // 临时存储已登录的令牌（有状态方案）
    private static final Set<String> TOKEN_STORE = ConcurrentHashMap.newKeySet();

    public String login(LoginRequest request) {
        String pwd = MOCK_USERS.get(request.getUsername());
        if (pwd != null && pwd.equals(request.getPassword())) {
            String token = UUID.randomUUID().toString();
            TOKEN_STORE.add(token);           // 记住这个令牌
            return token;
        }
        return null;
    }

    public boolean isValidToken(String token) {
        return token != null && TOKEN_STORE.contains(token);
    }
}
```

<!-- 插图建议：流程图 “客户端 → Controller → Service → 查MOCK_USERS → 生成UUID → 存入TOKEN_STORE → 返回token” -->

### 1.4 Controller

```java
@RestController
public class UserController {
    @Autowired
    private UserService userService;

    @PostMapping("/api/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String token = userService.login(request);
        if (token != null) {
            return ResponseEntity.ok(Map.of("token", token));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("msg", "用户名或密码错误"));
        }
    }
}
```

### 1.5 测试

```http
POST http://localhost:8080/api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456"
}
```

成功返回 `200` 和一个随机的UUID。虽然跑通了，但这个方案有两大问题：
- **令牌随机，不携带任何用户信息**，服务端必须维护一个 `TOKEN_STORE` 才知道谁是谁。
- **有状态**：一旦重启应用，所有登录状态全丢，扩展多实例时还需要共享存储。

---

## 2. 从UUID到JWT：让令牌自带“身份证”

我们希望令牌自己能“说话”，携带用户名和有效期，服务端不用再记——这就是**无状态**的JWT（Json Web Token）。

### 2.1 有状态 vs 无状态对比

| 方案 | 状态 | 存储位置 | 优点 | 缺点 |
|------|------|----------|------|------|
| UUID令牌 | 有状态 | 服务器内存/Redis | 实现简单 | 扩展性差，内存占用 |
| **JWT** | 无状态 | 客户端本地 | 服务端无需存储，自带用户信息，防篡改 | 无法主动注销(需配合黑名单)，payload仅Base64不加密 |

### 2.2 添加JWT依赖

`pom.xml` 中加入：

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.11.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>
```

### 2.3 编写JwtUtil工具类

```java
public class JwtUtil {
    private static final Key KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256); // 随机密钥
    private static final long EXPIRATION_MS = 3600_000; // 1小时

    public static String generateToken(String username) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + EXPIRATION_MS);
        return Jwts.builder()
                .setSubject(username)      // 主题放用户名
                .setIssuedAt(now)
                .setExpiration(expiration)
                .signWith(KEY)
                .compact();
    }

    public static Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
```

### 2.4 精简Service

```java
@Service
public class UserService {
    private static final Map<String, String> MOCK_USERS = new HashMap<>();
    static {
        MOCK_USERS.put("admin", "123456");
        MOCK_USERS.put("user", "password");
    }
    // 不再需要 TOKEN_STORE !

    public String login(LoginRequest request) {
        String pwd = MOCK_USERS.get(request.getUsername());
        if (pwd != null && pwd.equals(request.getPassword())) {
            return JwtUtil.generateToken(request.getUsername());
        }
        return null;
    }

    public boolean isValidJwt(String token) {
        try {
            JwtUtil.parseToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
```

Controller也相应调整：`/api/info` 接口从请求头提取JWT并解析，获取用户名。此时我们会遇到一个重要的HTTP细节：`Bearer` 前缀。

---

## 3. 踩坑：Bearer前缀与测试那些事

我们测试 `/api/info` 时，要求请求头写：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

如果你只写了 `Authorization: 你的token`，服务器会认为格式错误，返回401。**Bearer** 是一种认证方案标识，告诉服务器“后面跟的是持有者令牌”。解析时我们用 `substring(7)` 跳过了“Bearer ”这7个字符。

### 3.1 另一个坑：JWT立即过期

测试时我们故意把 `EXPIRATION_MS` 改成了10秒，想验证过期效果，结果发现怎么快都提示过期。排查后发现是过早复制了错误单位（比如写了1毫秒）。后来改成 `10_000` 就正常了。过期时间的单位必须是**毫秒**。

<!-- 插图建议：对比图 左边UUID有状态，右边JWT无状态 -->

---

## 4. 过滤器Filter：第一道防线

现在我们想统一校验所有需要登录的请求，而不是在每个Controller里重复写解析代码。首先想到的就是**Servlet Filter**。

### 4.1 Filter的作用

Filter运行在Servlet容器层，在请求进入Spring MVC的DispatcherServlet之前执行，可以拦截任何资源。

### 4.2 创建LoginCheckFilter（Spring Boot 3.x 版本）

**注意**：Spring Boot 3.x 使用 `jakarta.servlet.*`，2.x 是 `javax.servlet.*`，下面的代码基于3.x。

```java
@Component
public class LoginCheckFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String url = request.getRequestURL().toString();
        if (url.endsWith("/api/login")) {
            chain.doFilter(req, res);    // 登录接口直接放行
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"msg\":\"未登录\"}");
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = JwtUtil.parseToken(token);
            request.setAttribute("username", claims.getSubject());
            chain.doFilter(req, res);    // 校验通过放行
        } catch (Exception e) {
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"msg\":\"Token无效\"}");
        }
    }
}
```

这样Controller里的校验代码就可以删掉了，直接从 `request.getAttribute("username")` 取用户信息。

### 4.3 Filter的尴尬：异常无法被Spring全局捕获

Filter中一旦校验失败，我们只能手动拼接JSON并用 `response.getWriter()` 写回。这样不但繁琐，而且**抛出的异常不会被Spring的 `@RestControllerAdvice` 捕获**，因为Filter在Spring MVC的外层。这就引出了更优雅的方案：**拦截器（Interceptor）**。

---

## 5. Interceptor登场：纳入Spring的异常体系

Interceptor是Spring MVC提供的拦截器，它位于DispatcherServlet之后、Controller之前，所以**其抛出的异常可以被Spring的全局异常处理器捕获**。

### 5.1 Filter vs Interceptor

| 对比项 | Filter | Interceptor |
|--------|--------|-------------|
| 所处层次 | Servlet容器 | Spring MVC |
| 能否被Spring异常处理 | ❌ | ✅ |
| 适用场景 | 编码过滤、安全过滤 | 登录校验、日志、权限 |

<!-- 插图建议：请求流程图 “Tomcat → Filter → DispatcherServlet → Interceptor → Controller” -->

### 5.2 自定义未授权异常

```java
public class UnauthorizedException extends RuntimeException {
    private int code = 401;
    public UnauthorizedException(String msg) { super(msg); }
    // getter
}
```

### 5.3 编写LoginCheckInterceptor

```java
@Component
public class LoginCheckInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response, Object handler) {
        String url = request.getRequestURL().toString();
        if (url.endsWith("/api/login")) {
            return true;   // 放行
        }

        String authHeader = request.getHeader("Authorization");
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("未登录或Token格式错误");
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = JwtUtil.parseToken(token);
            request.setAttribute("username", claims.getSubject());
        } catch (Exception e) {
            throw new UnauthorizedException("Token无效或已过期");
        }
        return true;   // 放行
    }
}
```

### 5.4 配置拦截器白名单

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Autowired
    private LoginCheckInterceptor loginCheckInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loginCheckInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/api/login");   // 登录接口不拦截
    }
}
```

这样我们将LoginCheckFilter注释掉，完全由拦截器接管JWT校验，并且校验失败时抛出的 `UnauthorizedException` 会被接下来要写的全局异常处理器兜底。

---

## 6. 统一异常处理：@RestControllerAdvice

有了自定义异常，我们就可以集中管理所有错误响应，确保前端收到统一的JSON结构。

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedException e) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", e.getCode());
        result.put("msg", e.getMessage());
        return new ResponseEntity<>(result, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception e) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 500);
        result.put("msg", "服务器内部错误：" + e.getMessage());
        return new ResponseEntity<>(result, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

现在再访问不带token的 `/api/info`，你会看到响应状态码是401，而JSON内容也规范了。我们不再需要手动拼接JSON字符串，Interceptor只需抛出异常，一切交给全局处理器。

---

## 7. 总结：一张清单回顾所有要点

| 主题 | 关键点 |
|------|--------|
| 基础登录 | 接收 `@RequestBody`，用 `HashMap` 模拟用户，返回UUID令牌 |
| JWT无状态令牌 | `jjwt` 依赖，生成/解析JWT，`setSubject(username)` 存储用户标识 |
| `Bearer` 前缀 | HTTP认证方案标识，提取时需 `substring(7)` 去除 |
| Filter | Servlet层拦截，手动 `response.getWriter()`，异常无法被Spring全局捕获 |
| Interceptor | Spring MVC层拦截，可抛出异常交 `@RestControllerAdvice` 处理 |
| 统一异常处理 | `@RestControllerAdvice` + `@ExceptionHandler` 定义统一JSON错误响应 |
| 包版本适配 | Spring Boot 3.x 用 `jakarta.servlet.*`，2.x 用 `javax.servlet.*` |

## 最后的话：
我们从一段简单的登录接口出发，经历了UUID的临时方案，演化到JWT无状态认证，再通过Filter和Interceptor的对比实践，最终用全局异常处理收尾。现在你不但会写登录，更理解了背后分层与拦截器的设计思想。建议你把代码自己敲一遍，改一改白名单，尝试加入密码加密（BCrypt），这会是你成为后端熟手的重要一步。欢迎在评论区分享你的练习心得！
