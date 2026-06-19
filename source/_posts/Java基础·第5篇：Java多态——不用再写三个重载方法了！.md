---
title: Java基础·第5篇：Java多态——不用再写三个重载方法了！
date: 2026/6/10
categories: 
  - JavaSE  # 注意这里用的是列表，即使只有一个也可以写成单行
tags: 
  - 面向对象
  - Java
  - 多态
cover: /img/JavaSE_5/poly.png
---
## 引入

 假设你要写一个宠物管理系统。系统里有一个“投喂”功能：

 - 狗：吃狗粮
 - 猫：吃猫粮
 - 兔子：吃兔粮

 如果没有多态，你可能需要这样写：
```java
 public void feed(Dog d) { d.eat(); }
 public void feed(Cat c) { c.eat(); }
 public void feed(Rabbit r) { r.eat(); }
 ```

 三种动物，三个方法。那如果是十种动物呢？写十个长得一模一样的方法？

 多态要解决的问题就是：**用一个方法，接收所有动物**。
 ```java
public void feed(Animal a) { a.eat(); }
 ```

 不管你传进来的是狗、猫还是兔子，只要它是Animal，就能调eat()。至于具体怎么吃，每个动物自己说了算。

 这就是多态——**同一个方法调用，表现出不同的行为**。

下面我们来看多态在Java中怎么实现。

---


## 多态的定义与前提
```Java
父类：
public class Person {
    private String name;
    private int age;

    空参构造
    带全部参数的构造
    get和set方法

    public void show(){
        System.out.println(name + ", " + age);
    }
}

子类1：
public class Administrator extends Person {
    @Override
    public void show() {
        System.out.println("管理员的信息为：" + getName() + ", " + getAge());
    }
}

子类2：
public class Student extends Person{

    @Override
    public void show() {
        System.out.println("学生的信息为：" + getName() + ", " + getAge());
    }
}

子类3：
public class Teacher extends Person{

    @Override
    public void show() {
        System.out.println("老师的信息为：" + getName() + ", " + getAge());
    }
}

测试类：
public class Test {
    public static void main(String[] args) {
        //创建三个对象，并调用register方法

        Student s = new Student();
        s.setName("张三");
        s.setAge(18);


        Teacher t = new Teacher();
        t.setName("王建国");
        t.setAge(30);

        Administrator admin = new Administrator();
        admin.setName("管理员");
        admin.setAge(35);



        register(s);
        register(t);
        register(admin);


    }

    //这个方法既能接收老师，又能接收学生，还能接收管理员
    //只能把参数写成这三个类型的父类
    public static void register(Person p){
        p.show();
    }
}
```
*多态：* 是指同一行为，具有多个不同表现形式。
从上面案例可以看出，学生、老师和管理员都是人，都是show这一行为，但是出现的效果（表现形式）是不一样的。

*前提【重点】*
有继承或者实现关系
方法的重写【意义体现：不重写，无意义】
父类引用指向子类对象【格式体现】
> 父类类型：指子类对象继承的父类类型，或者实现的父接口类型。

## 多态的形式
多态体现的格式：
```Java
父类类型 变量名 = new 子类/实现类构造器;
变量名.方法名();
```
## 多态的使用场景
如果没有多态，在上面的代码中register方法只能传递学生对象，其他的Teacher和administrator对象是无法传递给register方法方法的，在这种情况下，只能定义三个不同的register方法分别接收学生，老师和管理员。有了多态之后，方法的形参就可以定义为共同的父类Person。

要注意的是：
当一个方法的形参是一个类，我们可以传递这个类所有的子类对象。
当一个方法的形参是一个接口，我们可以传递这个接口所有的实现类对象（后面会学）。
而且多态还可以根据传递的不同对象来调用不同类中的方法。

## 多态的运行特点
调用成员变量时：编译看左边，运行看左边
调用成员方法时：编译看左边，运行看右边
```Java
Fu f = new Zi()；
//编译看左边的父类中有没有name这个属性，没有就报错
//在实际运行的时候，把父类name属性的值打印出来
System.out.println(f.name);
//编译看左边的父类中有没有show这个方法，没有就报错
//在实际运行的时候，运行的是子类中的show方法
f.show();
```
由此，也得出多态的弊端，无论是调用成员变量还是成员方法，都需要查看父类是否有这个成员变量和成员方法，这样就导致无法执行子类特有的属性和行为。

## 引用数据类型的强转
由于多态的运行逻辑，导致我们无法调用子类的独有方法。所以我们想到类可以看作是一种自定义的数据类型，在类是一种数据类型的情况下，当出现数据类型冲突时，我们可以尝试强转。
回顾基本数据类型转换
自动转换: 范围小的赋值给范围大的.自动完成:double d = 5;
强制转换: 范围大的赋值给范围小的,强制转换:int i = (int)3.14

多态的转型分为向上转型（自动转换）与向下转型（强制转换）两种。

*向上转型：* 多态本身是子类类型向父类类型向上转换（自动转换）的过程，这个过程是默认的。 当父类引用指向一个子类对象时，便是向上转型。 使用格式：
```Java
父类类型  变量名 = new 子类类型();
如：Animal a = new Cat();
```

*向下转型：* 父类类型向子类类型向下转换的过程，这个过程是强制的。 一个已经向上转型的子类对象，将父类引用转为子类引用，可以使用强制类型转换的格式，便是向下转型。
使用格式：
```Java
子类类型 变量名 = (子类类型) 父类变量名;
如:Aniaml a = new Cat();
   Cat c =(Cat) a;  
```


### 强转的异常
在我们进行多态的强转时，一定会出现下面的情况：
```Java
public class Test {
    public static void main(String[] args) {
        // 向上转型  
        Animal a = new Cat();  
        a.eat();               // 调用的是 Cat 的 eat

        // 向下转型  
        Dog d = (Dog)a;       
        d.watchHouse();        // 调用的是 Dog 的 watchHouse 【运行报错】
    }  
}
```
这段代码可以通过编译，但是运行时，却报出了 ClassCastException ，类型转换异常！这是因为，明明创建了Cat类型对象，运行时，当然不能转换成Dog对象的,出现牛头不对马嘴的情况。
### 避免异常
这时候我们需要对强转的情况进行判断，避免出现ClassCastException 的错误
```Java
public class Test {
    public static void main(String[] args) {
        // 向上转型  
        Animal a = new Cat();  
        a.eat();               // 调用的是 Cat 的 eat

        // 向下转型  
        if (a instanceof Cat){
            Cat c = (Cat)a;       
            c.catchMouse();        // 调用的是 Cat 的 catchMouse
        } else if (a instanceof Dog){
            Dog d = (Dog)a;       
            d.watchHouse();       // 调用的是 Dog 的 watchHouse
        }
    }  
}
```
其中instanceof是Java的一个关键字，给引用变量做类型的校验，格式如下：
```Java
变量名 instanceof 数据类型 
如果变量属于该数据类型或者其子类类型，返回true。
如果变量不属于该数据类型或者其子类类型，返回false。
```
## 最后的话
至此，面向对象的三大特性——封装、继承和多态都已经学习完毕