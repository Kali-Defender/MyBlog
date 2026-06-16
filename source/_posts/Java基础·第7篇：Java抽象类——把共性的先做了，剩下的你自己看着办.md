---
title: Java基础·第7篇：Java抽象类——把共性的先做了，剩下的你自己看着办
categories: 
  - JavaSE  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - Java
  - 抽象类
cover: /img/JavaSE_7/abstract.png
---
### 一、为什么需要抽象类？

假如我们需要编写一个员工管理系统。系统的要求如下：
```
- 所有员工都有姓名、工号、薪水等基本属性，并且都需要打卡上班。
- 所有员工都需要记录工作内容
```
![图片描述](/img/JavaSE_7/p1.png)

对于第一个要求，这些属性和行为都是通用的，如果每一个都写一遍，整个系统的代码会变得冗余；对于第二个要求，这些工作内容每个员工的都不一样，无法统一。为了提高代码的简洁性和高效性，我们提出了抽象类的解决方案。

**抽象类的解决方案：**
- 通用的属性和方法（姓名、工号、薪水、职位、打卡）→ 父类写好，子类直接继承
- 无法统一的方法（工作内容）→ 父类只声明，子类各自实现

```java
abstract class Employee {
    private String name;
    
    public Employee(String name) {
        this.name = name;
    }
    
    public void clockIn() {
        System.out.println(name + "打卡上班");
    }
    
    public abstract void work();
}
```

---

### 二、抽象方法和抽象类
为了表示抽象类，我们要用到一个关键字`abstract`，翻译过来就是抽象的。

`abstract`修饰的方法是**抽象方法**：只有方法名，没有方法体。
`abstract`修饰的类是**抽象类**：如果一个类包含抽象方法，那它必须是抽象类。反过来，抽象类里不一定有抽象方法。
```java
// 抽象方法
修饰符 abstract 返回值类型 方法名(参数列表);

// 抽象类
abstract class 类名 {
    // 可以有普通方法，也可以有抽象方法
}
```

---

### 三、抽象类的使用

```java
abstract class Employee {
    private String id;
    private String name;
    private String position;
    private double salary;
    
    public Employee() {}
    public Employee(String id, String name,String position, double salary) {
        this.id = id;
        this.name = name;
        this.position=position;
        this.salary = salary;
    }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position;}
    public double getSalary() { return salary; }
    public void setSalary(double salary) { this.salary = salary; }
    
    public void clockIn() {
        System.out.println(name + "打卡上班");
    }
    
    // 这个方法子类必须自己实现
    public abstract void work();
}

class Manager extends Employee {
    public Manager() {}
    public Manager(String id, String name,String position, double salary)                 {    
        super(id, name,position, salary);
    }
    
    @Override
    public void work() {
        System.out.println(getName() + "正在管理其他人");
    }
}

class programmer extends Employee {
    public programmer() {}
    public  programmer(String id, String name, double salary) {
        super(id, name, position,salary);
    }
    
    @Override
    public void work() {
        System.out.println(getName() + "编写代码，处理业务");
    }
}

public class Demo {
    public static void main(String[] args) {
        Manager m = new Manager("m001", "张三","管理", 20000);
        m.clockIn();
        m.work();
        
        System.out.println("---");
        
        programmer p = new  programmer("c001", "李四","程序员", 8000);
        p.clockIn();
        p.work();
    }
}
```
在这段代码中，我们先定义了一个抽象员工类，里面不仅定义了员工通用的属性和行为，而且还定义了一个抽象工作方法，这些都会在子类中一一继承实现。两者不同的是，通用的属性和行为直接继承使用，抽象方法则要重写方法实现再使用。

### 四、抽象类的特征：有得有失

| 得 | 失 |
|---|---|
| 抽象类可以定义抽象方法，强制子类实现 | 抽象类不能创建对象（不能`new`） |

对于抽象类，你不能写`new Employee()`创建抽象类对象，但根据我们前面所学的多态，你可以写`Employee e = new Manager()`，用父类的类型创建子类的对象。

---

### 五、一句话记住抽象类

> **抽象类 = 把共性的先做了，剩下的你自己看着办。**

---
### 最后的话
从这篇文章中，我们可以了解到，抽象就是抽取共性的、重复的特征和行为，在整个员工管理系统中讲工作的内容抽象出来，定义一个抽象方法，在子类继承后，依据实际情况来重写抽象方法，提高代码的运行高效性。关于抽象类的知识就讲解完毕，如果有帮助的话，请一键三连。最后感谢您的查阅！！！



