---
title: Java基础·第1篇：面向对象 vs 面向过程——Java和C语言到底有什么区别？
date: 2026/6/10
categories: 
  - JavaSE  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - 编程范式
cover: /img/JavaSE_1/coffee.png
---
## 编程语言的分类
面向对象（Java）和面向过程（C语言）是两种主流编程范式。 它们到底有什么区别？本文用锤子和咖啡两个例子，讲清楚编程范式的核心思想。




### 1、面向过程的编程语言
面向对象的编程范式其实上是将我们需要解决的问题拆解，变成一个一个的步骤，先做什么，后做什么。
典型的面向过程的编程语言是我们编程学习的启蒙语言————C语言，我们在学习的过程中大部分时候都是在编写函数，各种各样的函数，在主程序中不断的根据需求依次的去调用函数，将需要处理的数据给函数，函数返回一个处理后的结果。
这个过程就像在制造工具来解决实际问题，比如制造一把锤子，你需要先砍树造木柄，然后挖铁矿冶炼铁，紧接着锻造锤头，最后组装，那么你就拥有了一把锤子，你可以拿他钉钉子或是其他的需要。


以下面的一个简单的C语言程序为例：在程序运行过程中，我们将需要计算的数据a和b，传给做加法运算的函数sum()，函数sum()将计算后的结果赋值给变量sum，然后通过printf()函数输出出来，至此程序结束。
```C
#include<stdio.h>
int main(){
    int a=1;
    int b=2;
    int sum=sum(a,b);
    printf(sum);
}
int sum(int a,int b){
    return a+b;
}
```
由程序运行逻辑来看，面向过程的特点：
 • 程序=数据+函数  
 • 线性执行流程  
 • 适合：脚本、简单工具、一次性任务  
 • 缺点：当需求变化时，需要大量修改


### 2、面向对象的编程语言
面向对象的编程范式不再是将我们需要解决的问题拆分成一个一个的步骤，而是为了解决这一问题，我需要用到哪些工具，先用哪个工具。再用哪个工具。
典型的面向对象的编程语言是现在在IT行业火爆的Java，我们在学习的过程中大部分时候都是在编写对象的属性和行为，各种各样的对象，在主程序中不断的根据需求依次的去调用对象里的属性或行为来解决问题，将需要处理的数据传给对象，对象根据其定义的属性和行为给予我们反馈。
这个过程就像是用工具去解决实际问题，比如说我需要喝一杯咖啡，我需要一些咖啡豆、一个咖啡机和一个杯子，我利用这些工具使得我喝到一杯咖啡，开启元气满满的一天。
![喝咖啡](/img/JavaSE_1/coffee.png)


以下面的一个简单的Java程序为例：创建三个对象，分别是咖啡类、咖啡机类和人类。先创建一个人类的对象，再依次调用咖啡类、咖啡机类和人类里的行为和属性完成喝咖啡的行为。
```Java
// 咖啡类
class Coffee {
    private String type;
    private int temperature;
    
    public Coffee(String type, int temperature) {
        this.type = type;
        this.temperature = temperature;
    }
    
    public void drink() {
        System.out.println("喝" + type + "咖啡，温度：" + temperature + "°C");
    }
    
    public void coolDown() {
        this.temperature -= 5;
        System.out.println(type + "咖啡降温到：" + temperature + "°C");
    }
}

// 咖啡机制作咖啡
class CoffeeMachine {
    public Coffee makeCoffee(String type) {
        System.out.println("咖啡机正在制作" + type + "咖啡...");
        return new Coffee(type, 85);
    }
}

// 人类
class Person {
    private String name;
    
    public Person(String name) {
        this.name = name;
    }
    
    public void drinkCoffee() {
        System.out.println(name + "说：我想喝咖啡");
        
        // 创建咖啡机对象
        CoffeeMachine machine = new CoffeeMachine();
        
        // 咖啡机制作咖啡
        Coffee myCoffee = machine.makeCoffee("拿铁");
        
        // 咖啡太烫，先降温
        myCoffee.coolDown();
        
        // 喝咖啡
        myCoffee.drink();
        
        System.out.println(name + "喝完了咖啡");
    }
}

// 主程序
public class DrinkCoffeeExample {
    public static void main(String[] args) {
        // 创建一个人对象
        Person me = new Person("小明");
        
        // 这个人要喝咖啡
        me.drinkCoffee();
    }
}
```
由程序运行逻辑来看，面向对象的特点：
 • 程序=对象+类 
 • 非线性执行流程  
 • 适合：复杂工具、非一次性任务  
 • 缺点：当需求变化时，不需要大量修改


 ## 总结
 面向过程和面向对象这两种编程范式是现在最为主流的，理解这两种编程范式的区别有助于更好的理解各个编程语言的特点和应用场景，简单的来说面向过程的编程语言适合硬件开发，面向对象的编程语言适合软件开发。


| 维度 | 面向过程 (Procedure-Oriented) | 面向对象 (Object-Oriented) |
| :--- | :--- | :--- |
| **核心思想** | 执行步骤：怎么做 (How to do) | 对象交互：谁来做 (Who to do) |
| **典型语言** | C, Pascal, Fortran | Java, C++, Python, C# |
| **代码单元** | 函数 (Function) | 类 (Class) 和 对象 (Object) |
| **数据关系** | 数据与函数分离 | 数据（属性）与函数（方法）封装在一起 |
| **扩展难度** | 需修改大量函数调用 | 通过继承和多态扩展，改动较小 |
| **适配场景** | **硬件驱动、操作系统内核、简单脚本**<br>（强调性能、直接控制硬件） | **GUI开发、大型企业级应用、游戏开发**<br>（强调维护性、复用性、复杂业务逻辑） |

下篇文章我们以Java为例，从面向对象的三大特性出发，更加深入的了解面向对象。不仅可以加深对面向对象的理解，而且能提高代码的高效性。如果可以的话，留下你的一件三连，往后给你更加高质量的文章，点击下面的跳转入口，更快学到新知识。最后感谢您的查阅！！！

