---
title: Java基础·第3篇：Java封装——为什么要把数据藏起来？
categories: 
  - JavaSE  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - 面向对象
  - Java
  - 封装
cover: /img/JavaSE_3/package.png
---
#### 前言
在我们学习面向过程的编程语言，比如说C语言时,一定会出现下面的情况：
假设你定义了一个全局变量 int balance = 1000;（余额）。在C语言里，程序中任何一个函数都可以直接访问并修改这个 balance。
```C
// 面向过程风格（C语言）
int balance = 1000;

void buyCoffee() {
    balance -= 20; //直接修改
}

void hackFunction() {
    balance = 0; // 任何函数都能随意篡改，没有任何阻拦！
}
```
因为没有数据的保护机制，数据对所有函数都是公开的，任何地方写错了一行代码，都可能导致数据被意外修改。如果在编写程序的时候，意外的写错了数据，造成bug出现，就要在几百行代码里找问题，很麻烦。



而在面向对象的编程语言中，可以对数据进行封装来实现对数据的保护。
#### 为什么需要封装？从数据的“裸奔”说起

在接触封装之前，我们定义的类通常长这样：

```Java
public class Student {
    public String name;
    public int age;
    public double score;
}
```

这种设计看似简单直接，外部调用者可以随心所欲地访问和修改这些字段。但问题也随之而来：

```Java
Student s = new Student();
s.age = -20; // 年龄怎么可能是负数？
s.score = 150; // 满分100，考150分？
```

编译器不会报错，但程序产生了违背现实逻辑的“脏数据”。这种直接暴露内部数据的方式，就像是让数据在“裸奔”，没有任何安全性可言。一旦数据出错，排查起来非常困难，因为任何地方都可能修改了它。

#### 封装的本质：信息隐藏与访问控制

封装的核心思想其实就两点：**信息隐藏**和**提供公共接口**。

- **信息隐藏**：把不想让外界知道的内部细节（比如具体的变量存储）藏起来。
- **提供公共接口**：只暴露必要的方法给外界使用，并在这些方法里加上“安检”。

在Java中，我们通过访问修饰符来实现这一机制。目前我们主要用到了两个：

- `private`：私有权限，只有类自己能访问。
- `public`：公共权限，谁都可以访问。

#### 代码实战：如何正确实现封装

实现封装的标准动作分两步：

1. 把所有属性（字段）都用`private`修饰，切断外部直接访问的路径。
2. 提供`public`的`getter`和`setter`方法，作为外界访问数据的唯一通道。

让我们重构上面的`Student`类：

```Java
public class Student {
    // 1. 属性私有化
    private String name;
    private int age;
    private double score;

    // 2. 提供公共的 getter 和 setter

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    // 在 setter 中加入逻辑判断
    public void setAge(int age) {
        if (age > 0 && age < 150) {
            this.age = age;
        } else {
            System.out.println("年龄输入不合法！");
            // 实际开发中可能会抛出异常
        }
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        if (score >= 0 && score <= 100) {
            this.score = score;
        } else {
            System.out.println("分数必须在0-100之间！");
        }
    }
}
```

现在，外部代码如果想修改年龄，必须调用`setAge()`。如果我们尝试传入`-20`，就会被方法内部的逻辑拦截。这样，我们就保证了`Student`对象中数据的完整性和安全
#### 封装带来的好处

- **提高安全性**：这是最直观的。通过隐藏属性和控制访问，防止了数据被非法或意外地修改。
- **隐藏实现细节**：使用者只需要知道“怎么用”（调用哪个方法），而不需要知道“怎么实现的”。比如以后我想把`age`改成`String`类型存储，只要`getAge()`返回的还是`int`，外面的代码就不需要改动。
- **提高可维护性**：如果规则变了（比如年龄上限改了），我只需要修改`setAge`方法内部的逻辑，所有调用这个方法的地方都会自动生效，不用满世界去找代码修改。

#### 写在最后

封装不仅仅是把变量改成`private`再自动生成方法那么简单，它是一种“防御性编程”的思维。它教会我们在设计代码时就要考虑到数据的安全和未来的变化。

虽然目前我只学到了封装，还没接触到继承和多态，接下来的两篇文章依次给大家讲解面向对象的其他特性——继承与多态。最后感想您的查阅！！！

