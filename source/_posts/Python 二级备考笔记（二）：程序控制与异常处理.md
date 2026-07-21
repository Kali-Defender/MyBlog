---
title: Python 二级备考笔记（二）：程序控制与异常处理
date: 2026/7/21
categories: 
  - Python二级备考  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - 计算机二级
  - Python
cover: /img/python2/p1.png
---
## 1. 程序控制结构

### 1.1 顺序结构
- 程序按代码的书写顺序从上到下逐条执行，每条语句执行一次（除非被分支或循环改变流程）。

### 1.2 分支结构（选择结构）
- 通过 `if`、`elif`、`else` 实现多路条件判断。
- **基本语法**：
  ```python
  if 条件表达式1:
      语句块1
  elif 条件表达式2:
      语句块2
  else:
      语句块3
  ```
- `elif` 可以有零个或多个，`else` 最多一个且放在最后。
- 条件表达式的结果会被隐式转换为布尔值（`True` 或 `False`）。
- **注意**：Python 3.10 之前没有 `switch`/`case` 语句，使用 `if-elif-else` 实现多分支判断。二级考试环境（3.5.3~3.9.10）不支持 `match` 语句。
- **常见易错点**：
  - 不要忘记冒号（`:`）。
  - 缩进必须严格一致（建议使用 4 个空格，不要混用 Tab 和空格）。
  - 条件中慎用赋值（`=`），避免误写成比较（`==`）。

### 1.3 循环结构

#### 1.3.1 `for` 循环
- 用于遍历可迭代对象（字符串、列表、元组、字典、`range` 等）。
- 基本语法：
  ```python
  for 变量 in 可迭代对象:
      循环体
  ```
- 遍历字典时默认遍历键，可通过 `.keys()`、`.values()`、`.items()` 分别获取键、值、键值对。
- 与 `range()` 结合使用最频繁（见 1.3.4 节）。

#### 1.3.2 `while` 循环
- 当条件为真时重复执行循环体，直到条件为假。
- 基本语法：
  ```python
  while 条件表达式:
      循环体
  ```
- **注意**：必须确保循环条件最终会变为假，否则形成死循环。可在循环体内通过修改条件变量或使用 `break` 退出。

#### 1.3.3 循环控制语句
- `break`：立即终止整个循环，跳出循环体。
- `continue`：跳过本次循环剩余语句，立即进入下一次循环判断。
- `else` 子句（与循环搭配）：
  - 当循环**正常结束**（未触发 `break`）时执行 `else` 块。
  - 若遇到 `break`，则跳过 `else`。
  - 示例：
    ```python
    for i in range(3):
        if i == 1:
            break
        print(i)
    else:
        print("循环正常结束")   # 不会执行，因为 break 了
    ```

#### 1.3.4 `range()` 函数详述
- 生成一个不可变的整数序列，常用于 `for` 循环。
- 三种调用方式：
  - `range(stop)`：生成 0 到 stop-1。
  - `range(start, stop)`：生成 start 到 stop-1。
  - `range(start, stop, step)`：step 可为正或负（负值表示递减）。
- `range` 对象是惰性求值的，节省内存。可用 `list(range(...))` 转为列表。
- **注意**：`stop` 取值是开区间，不包含 `stop` 本身。

---

## 2. 异常处理 `try-except`

- **作用**：捕获并处理运行时错误，避免程序崩溃，提供更友好的错误提示。
- **基本结构**：
  ```python
  try:
      # 可能引发异常的代码
  except 异常类型1:
      # 处理异常类型1
  except 异常类型2 as e:   # 可获取异常对象
      # 处理异常类型2
  except (TypeError, ValueError):  # 多个异常合并处理
      # ...
  except Exception:        # 捕获所有异常（谨慎使用）
      # ...
  else:
      # 没有异常发生时执行
  finally:
      # 无论是否发生异常，最后一定会执行（如释放资源）
  ```

- **执行流程**：
  - 先执行 `try` 块，若发生异常，则按顺序匹配 `except`；若匹配成功则执行对应处理块。
  - 若没有匹配的 `except`，异常继续向上抛出（导致程序终止）。
  - 若 `try` 块无异常，则执行 `else` 块（如果存在）。
  - 无论是否异常，最后都会执行 `finally` 块（常用于关闭文件、释放锁等）。

- **常见内置异常**：
  - `ValueError`：值错误（如 `int("abc")`）
  - `TypeError`：类型错误（如 `"1" + 2`）
  - `ZeroDivisionError`：除零错误
  - `IndexError`：索引越界
  - `KeyError`：字典键不存在
  - `FileNotFoundError`：文件未找到

- **示例代码**：
  ```python
  try:
      score = float(input("请输入分数："))
      print("你的分数为：", score)
      result = 1 / 0
  except ValueError:
      print("出现异常！请输入数字！")
  except ZeroDivisionError:
      print("出现异常，除数不能为零！")
  except Exception as e:
      print(f"未知错误：{e}")
  else:
      print("计算成功！")
  finally:
      print("无论是否异常，此句都会执行。")
  ```

- **⚠️ 捕获异常的规范写法**：
  - 优先捕获**具体的异常类型**（如 `ValueError`、`ZeroDivisionError`），而非直接使用 `except:` 或 `except Exception`。
  - `except:` 会捕获包括 `SystemExit`、`KeyboardInterrupt` 在内的所有异常，可能掩盖程序终止信号，非特殊情况应避免使用。
  - 如果确实需要捕获所有异常，建议使用 `except Exception as e:`，至少保留了异常对象的获取能力。

---

