---
title: CMDB平台实战-第3篇：前端框架搭建和跑通登录页实战避坑指南
date: 2026/10/9
categories: 
  - CMDB + 自动化运维平台  
tags: 
  - Vue       
  - Python
  - 后端开发
  - 避坑指南
banner: /img/head.png
---
# Vue 3 前端骨架与登录页实战避坑指南

后端三步（Hello World、建表、登录接口）跑通之后，终于轮到前端。本文不讲 Vue 的响应式原理，只从纯实战角度，带你用 `Vue 3 + Vite + Ant Design Vue` 搭出前端骨架、写出一个能看的登录页，并复盘那些极易踩中的深坑。



## 第一步：环境准备（Node.js + npm）

前端需要 Node.js 和 npm。先检查装没装：

```powershell
node --version
npm --version
```

**没装的话，两种方式二选一：**

- 官网下载安装包（推荐新手）：https://nodejs.org/ → 选 **LTS 长期支持版**，一路下一步
- 或用 winget 一条命令：`winget install OpenJS.NodeJS.LTS`

装完**配置国内镜像源**（否则 npm 下载依赖很慢）：

```powershell
npm config set registry https://registry.npmmirror.com
npm config get registry   # 验证是否配置成功，应输出 https://registry.npmmirror.com
```

先记住 npm 三个命令，对应 Python 的日常操作：

| npm 命令 | 作用 | 类比 Python |
| --- | --- | --- |
| `npm create vite` | 生成项目骨架 | 复制一个标准模板 |
| `npm install` | 按 package.json 装依赖 | `pip install -r requirements.txt` |
| `npm run dev` | 启动开发服务器 | `uvicorn app.main:app --reload` |

## 第二步：用 Vite 初始化 Vue 3 项目

下载Vue前端框架，用 Vite 生成标准项目：

```powershell
Remove-Item -Recurse -Force frontend
npm create vite@latest frontend -- --template vue
cd frontend
npm install
```

> ⚠️ **坑位预警：模板别选错。** `--template vue` 是 **JavaScript 版**，`vue-ts` 才是 TypeScript 版。新手没学过 TS 就老老实实选 `vue`，别手痒加 `ts`（后面真的会踩这个坑）。

装完依赖，再装 UI 组件库：

```powershell
npm install ant-design-vue
```

## 第三步：注册 Ant Design Vue

在 `src/main.js` 里全局注册：

```js
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'   // 注意是 reset.css
app.use(Antd)
```

`app.use(Antd)` 之后，所有组件都能直接在模板里用（`a-` 前缀），**不用一个个 import**。

> ⚠️ **坑位预警：样式文件名。** Ant Design Vue 4.x 的样式是 `dist/reset.css`，很多老教程写的是 `antd.css`，照着抄会找不到文件。

## 第四步：搞懂 Vue 组件三块结构

一个 `.vue` 文件分三块，这是 Vue 最核心的概念：

```vue
<template>
  <!-- 页面长什么样（HTML） -->
</template>

<script setup>
  // 页面逻辑（JS）
</script>

<style scoped>
  /* 页面样式（CSS） */
</style>
```

- `<template>`：界面
- `<script setup>`：数据 + 逻辑（`setup` 是 Vue 3 推荐写法）
- `<style scoped>`：`scoped` 表示样式只作用于当前组件，不会污染别的页面

## 第五步：写登录页（表单组件拼装）

新建 `src/views/LoginView.vue`，用这几个组件拼表单：

| 组件 | 作用 |
| --- | --- |
| `<a-card>` | 卡片（白底圆角、可带标题） |
| `<a-form>` | 表单容器 |
| `<a-form-item>` | 表单项（一行） |
| `<a-input>` | 输入框 |
| `<a-input-password>` | 密码框（自带显示/隐藏眼睛） |
| `<a-button>` | 按钮，`type="primary"` 蓝色主按钮 |

第 4 步只做界面，**`<script>` 留空**——点击按钮调后端是第 5 步联调的事。

## 第六步：美化

第一版做出来，由于只需要跑通登录页，所以外观较为丑陋。于是用CSS简单美化一下：

**① 居中的 CSS 三件套**（记住一辈子）

```css
.login-container {
  min-height: 100vh;          /* 撑满整个屏幕高度 */
  display: flex;              /* 开启弹性布局 */
  justify-content: center;    /* 水平居中 */
  align-items: center;        /* 垂直居中 */
}
```

**② 卡片 + 阴影**

表单塞进 `<a-card>`，加圆角、阴影、固定宽度（420px 左右），背景换浅灰或暗色。

最终做成了暗色主题 + 网格背景 + 居中卡片的登录页，才算能看。

## 第七步：启动验证

```powershell
npm run dev
```

浏览器打开 `http://localhost:5173`，看到居中的登录卡片 = 第 4 步完成。

> 小知识：`npm run dev` 之后是**热更新**——改代码保存，浏览器自动刷新，不用手动重启（比后端 `--reload` 还省事）。

## 血泪踩坑复盘（本步三个坑）

1. **`<script setup lang="ts">` 写在 JS 项目里**：项目是 `--template vue` 创建的 JavaScript 版，没配 TypeScript，别写 `lang="ts"`。→ 删掉 `lang="ts"`
2. **样式文件写错名**：Ant Design Vue 4.x 用 `dist/reset.css`，不是老教程的 `antd.css`


## 总结

流程一句话：

```
确认 Node/npm → npm create vite（选 vue 非 vue-ts）→ npm install → 装 ant-design-vue
→ main.js 注册 → 写 LoginView.vue（表单组件）→ CSS 美化居中 → npm run dev 看效果 → commit + push
```

记住：
**Vue 文件三块：template 管界面、script 管逻辑、style 管样式**，第 4 步只碰 template 和 style

