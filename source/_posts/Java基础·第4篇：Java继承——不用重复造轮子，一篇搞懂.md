---
title: Java基础·第4篇：Java继承——不用重复造轮子，一篇搞懂
date: 2026/6/16
categories: 
  - JavaSE  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - 面向对象
  - Java
  - 继承
cover: /img/JavaSE_4/inherit.png
---

## 什么是继承？继承的特点？继承的好处？
### 引入
假如现在需要你开发一个教务管理系统中一个最基础的功能————存储学生和教职工的身份信息，你会怎么做？你的做法可能是这样的：
分别创建学生类、教师类和工人类，即
```Java
学生类：属性（姓名，年龄，学工号）、行为（吃饭，睡觉，学习）
老师类：属性（姓名，年龄，学工号，薪水）、行为（吃饭、睡觉，上课）
工人类：属性（姓名，年龄，学工号，薪水）、行为（吃饭、睡觉，管理）
```
很明显，如果这样去设计教务管理系统，这三个类中有着大量重复的代码，这样就导致系统的代码复用率低，整个系统显得臃肿笨重。那么应该如何去解决这样的问题呢？
假如多个类中存在相同属性和行为时，我们可以将这些内容抽取到单独一个类中，那么多个类无需再定义这些属性和行为，只要继承那一个类即可。如图所示： 
![图片描述](/img/JavaSE_4/p1.png)

其中，多个类可以称为子类，单独被继承的那一个类称为父类、超类（superclass）或者基类。

### 继承的概念
继承描述的是事物之间的所属关系，这种关系是：is-a 的关系。类似于数学中的集合A属于集合B，表示集合A是集合B的子集，在这里我们用父类和子类来表示这样的继承关系，我们通过继承，可以使多种事物之间形成一种关系体系。这里引出了继承的概念，
继承：就是子类继承父类的属性和行为，使得子类对象可以直接具有与父类相同的属性、相同的行为。子类可以直接访问父类中的非私有的属性和行为。

### 继承的特点
Java只支持单继承，不支持多继承。
```Java
// 一个类只能有一个父类，不可以有多个父类。
class A {}
class B {}
class C1 extends A {} // ok
// class C2 extends A, B {} // error
```
```Java
一个类可以有多个子类。
// A可以有多个子类
class A {}
class C1 extends A {}
class C2 extends  A {}
```
```Java
可以多层继承。
class A {}
class C1 extends A {}
class D extends C1 {}
```
> 顶层父类是Object类。所有的类默认继承Object，作为父类。

### 继承的好处
回想刚刚的问题以及继承的概念，我们可以总结出继承的好处：
1、提高了代码的复用性，避免代码的臃肿和冗余。
2、使类与类之间产生了关系

### 继承的格式
```Java
class 父类(){
    共用的属性和行为
}
class 子类 extends 父类(){
    子类独有的属性和行为
}
```
需要注意：Java是单继承的，一个类只能继承一个直接父类，跟现实世界很像，但是Java中的子类是更加强大的。

## 子类能从父类继承到什么？
并不是父类的所有内容都可以给子类继承的：
子类不能继承父类的构造方法。
值得注意的是子类可以继承父类的私有成员（成员变量，方法），只是子类无法直接访问而已，可以通过getter/setter方法访问父类的private成员变量。

## 成员变量继承的访问特点
```Java
class Fu {
	// Fu中的成员变量
	int num = 5;
}
class Zi extends Fu {
	// Zi中的成员变量
	int num2 = 6;
    //int num=6;
	// Zi中的成员方法
	public void show() {
		// 访问父类中的num
		System.out.println("Fu num="+num); // 继承而来，所以直接访问。
		// 访问子类中的num2
		System.out.println("Zi num2="+num2);
	}
}
class Demo04 {
	public static void main(String[] args) {
        // 创建子类对象
		Zi z = new Zi(); 
      	// 调用子类中的show方法
		z.show();  
	}
}

```
### 成员变量不重名
对于上面的代码，如果子类父类中出现不重名的成员变量，这时的访问是没有影响的。
```Java
代码运行结果：
Fu num = 5
Zi num2 = 6
```
### 成员变量重名
对于上面的代码，如果子类父类中出现重名的成员变量,即子类里的num2改为num,这时的访问是有影响的。
```Java
代码运行结果：
Fu num = 6
Zi num2 = 6
```
子父类中出现了同名的成员变量时，子类会优先访问自己对象中的成员变量。如果此时想访问父类成员变量如何解决呢？我们可以使用super关键字。
### super访问父类成员变量
子父类中出现了同名的成员变量时，在子类中需要访问父类中非私有成员变量时，需要使用super 关键字，修饰父类成员变量，类似于之前学过的 this 。
需要注意的是：super代表的是父类对象的引用，this代表的是当前对象的引用。
使用格式：
```Java
super.父类成员变量名
```
上面的那段代码我们只对show方法进行修改：
```Java
public void show() {
        int num = 1;
      
        // 访问方法中的num
        System.out.println("method num=" + num);
        // 访问子类中的num
        System.out.println("Zi num=" + this.num);
        // 访问父类中的num
        System.out.println("Fu num=" + super.num);
	}
```
```Java
代码运行结果
method num=1
Zi num=6
Fu num=5
```
## 成员方法继承的访问特点
```Java
class Fu {
	public void show() {
		System.out.println("Fu类中的show方法执行");
	}
}
class Zi extends Fu {
	public void show2() {
		System.out.println("Zi类中的show2方法执行");
	}
    public void show() {
		System.out.println("Zi类中的show方法执行");
	}
}
public  class Demo05 {
	public static void main(String[] args) {
		Zi z = new Zi();
     	//子类中没有show方法，但是可以找到父类方法去执行
		z.show(); 
		z.show2();
	}
}
运行结果
Zi类中的show方法执行
Zi类中的show2方法执行
```
### 成员方法不重名
如果子类父类中出现不重名的成员方法，这时的调用是没有影响的。对象调用方法时，会先在子类中查找有没有对应的方法，若子类中存在就会执行子类中的方法，若子类中不存在就会执行父类中相应的方法。
### 成员方法重名
如果子类父类中出现重名的成员方法，则创建子类对象调用该方法的时候，子类对象会优先调用自己的方法。
### 方法重写
方法重写 ：子类中出现与父类一模一样的方法时（返回值类型，方法名和参数列表都相同），会出现覆盖效果，也称为重写或者复写。声明不变，重新实现。
使用场景 ：发生在子父类之间的关系。子类继承了父类的方法，但是子类觉得父类的这方法不足以满足自己的需求，子类重新写了一个与父类同名的方法，以便覆盖父类的该方法。
#### @Override重写注解
@Override:注解，重写注解校验！
这个注解标记的方法，就说明这个方法必须是重写父类的方法，否则编译阶段报错。
建议重写都加上这个注解，一方面可以提高代码的可读性，一方面可以防止重写出错！

#### 注意事项
方法重写是发生在子父类之间的关系。
子类方法覆盖父类方法，必须要保证权限大于等于父类权限。
子类方法覆盖父类方法，返回值类型、函数名和参数列表都要一模一样。
## 构造方法继承的特点
在学习构造方法继承的特点时，我们需要回忆一下构造方法的的定义和作用：

构造方法的名字是与类名一致的。所以子类是无法继承父类构造方法的。
构造方法的作用是初始化对象成员变量数据的。所以子类的初始化过程中，必须先执行父类的初始化动作。子类的构造方法中默认有一个super() ，表示调用父类的构造方法，父类成员变量初始化后，才可以给子类使用。（先有爸爸，才能有儿子）

由此我们可以得出继承后子类构方法器特点:子类所有构造方法的第一行都会默认先调用父类的无参构造方法
以下面的这段代码为例：
```Java
class Person {
    private String name;
    private int age;

    public Person() {
        System.out.println("父类无参");
    }

    // getter/setter省略
}

class Student extends Person {
    private double score;

    public Student() {
        //super(); // 调用父类无参,默认就存在，可以不写，必须再第一行
        System.out.println("子类无参");
    }
    
     public Student(double score) {
        //super();  // 调用父类无参,默认就存在，可以不写，必须再第一行
        this.score = score;    
        System.out.println("子类有参");
     }

}

public class Demo07 {
    public static void main(String[] args) {
        Student s1 = new Student();
        System.out.println("----------");
        Student s2 = new Student(99.9);
    }
}

输出结果：
父类无参
子类无参
----------
父类无参
子类有参
```
#### 总结
子类构造方法执行的时候，都会在第一行默认先调用父类无参数构造方法一次。
子类构造方法的第一行都隐含了一个**super()**去调用父类无参数构造方法，**super()**可以省略不写。


### super(...)和this(...)
对于下面的这段代码，我们发现，子类有参数构造方法只是初始化了自己对象中的成员变量score，而父类中的成员变量name和age依然是没有数据的，怎么解决这个问题呢，我们可以借助与super(…)去调用父类构造方法，以便初始化继承自父类对象的name和age.
```Java
public class Demo07 {
    public static void main(String[] args) {
        // 调用子类有参数构造方法
        Student s2 = new Student(99.9);
        System.out.println(s2.getScore()); // 99.9
        System.out.println(s2.getName()); // 输出 null
        System.out.println(s2.getAge()); // 输出 0
    }
}
```
#### super和this的用法格式
```Java
this.成员变量    	--    本类的
super.成员变量    	--    父类的

this.成员方法名()  	--    本类的    
super.成员方法名()   --    父类的

super(...) -- 调用父类的构造方法，根据参数匹配确认
this(...) -- 调用本类的其他构造方法，根据参数匹配确认
```
#### super(…)用法演示
```Java
class Person {
    private String name ="凤姐";
    private int age = 20;

    public Person() {
        System.out.println("父类无参");
    }
    
    public Person(String name , int age){
        this.name = name ;
        this.age = age ;
    }

    // getter/setter省略
}

class Student extends Person {
    private double score = 100;

    public Student() {
        //super(); // 调用父类无参构造方法,默认就存在，可以不写，必须再第一行
        System.out.println("子类无参");
    }
    
     public Student(String name ， int age，double score) {
        super(name ,age);// 调用父类有参构造方法Person(String name , int age)初始化name和age
        this.score = score;    
        System.out.println("子类有参");
     }
      // getter/setter省略
}

public class Demo07 {
    public static void main(String[] args) {
        // 调用子类有参数构造方法
        Student s2 = new Student("张三"，20，99);
        System.out.println(s2.getScore()); // 99
        System.out.println(s2.getName()); // 输出 张三
        System.out.println(s2.getAge()); // 输出 20
    }
}
```
注意：
子类的每个构造方法中均有默认的super()，调用父类的空参构造。手动调用父类构造会覆盖默认的super()。
super() 和 this() 都必须是在构造方法的第一行，所以不能同时出现。
super(…)是根据参数去确定调用父类哪个构造方法的。

#### this(…)用法演示
this(...):
默认是去找本类中的其他构造方法，根据参数来确定具体调用哪一个构造方法。
为了借用其他构造方法的功能。
 
```Java
package com.itheima._08;
public class ThisDemo01 {
    public static void main(String[] args) {
        Student xuGan = new Student();
        System.out.println(xuGan.getName()); // 输出:徐干
        System.out.println(xuGan.getAge());// 输出:21
        System.out.println(xuGan.getSex());// 输出： 男
    }
}

class Student{
    private String name ;
    private int age ;
    private char sex ;

    public Student() {
  // 很弱，我的兄弟很牛逼啊，我可以调用其他构造方法：Student(String name, int age, char sex)
        this("徐干",21,'男');
    }

    public Student(String name, int age, char sex) {
        this.name = name ;
        this.age = age   ;
        this.sex = sex   ;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public char getSex() {
        return sex;
    }

    public void setSex(char sex) {
        this.sex = sex;
    }
}
```
#### 总结
子类的每个构造方法中均有默认的super()，调用父类的空参构造。手动调用父类构造会覆盖默认的super()。
super() 和 this() 都必须是在构造方法的第一行，所以不能同时出现。
super(…)和this(…)是根据参数去确定调用父类哪个构造方法的。
super(…)可以调用父类构造方法初始化继承自父类的成员变量的数据。
this(…)可以调用本类中的其他构造方法。

## 最后的话
现在关于面向对象的特性——继承的所有知识点都学习和总结了，接下来开始总结面向对象最后一个特性多态的学习内容。最后感谢您的查阅！！！











