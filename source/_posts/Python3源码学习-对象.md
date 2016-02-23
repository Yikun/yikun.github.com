title: "Python3源码学习-对象"
date: 2015-12-03 15:07:19
tags:
  - Python
---

最近开始看Python源码，大致看了看，发现Py2和Py3的部分实现差别挺大，《Python源码剖析》是根据Python 2写的。不过为了能激发主动性，便直接从Python 3（3.5.0）源码看起了，然后也会结合Python 2（2.7.10）的代码看看之前的实现，来对比学习~：）

### 1. 万物皆对象

在Python中，万物皆对象，那么对象又是什么结构，如何组织，怎样实现的呢？
<!--more-->
> Objects are structures allocated on the heap.  Special rules apply to the use of objects to ensure they are properly garbage-collected. Objects are never allocated statically or on the stack; they must be accessed through special macros and functions only.(Type objects are exceptions to the first rule; the standard types are represented by statically initialized type objects, although work on type/class unification for Python 2.2 made it possible to have heap-allocated type objects too).

从Python的源码注释可以得到以下信息点：
* 对象一般就是开辟在堆上的结构体；
* 一些特殊的规则运用在对象上，以保证他们被正确的GC；
* 对象永远不会静态开辟或者在栈上；

然后，还补充说，Type对象除外，标准的type对象是静态初始化的，Python 2.2把在堆上初始化type对象变成了现实。

### 2. 对象的结构
![object](https://cloud.githubusercontent.com/assets/1736354/11553779/03a14ebe-99cd-11e5-8640-dde569539e9d.png)

Python中的对象，主要分为一般对象和变长对象（list、dict之类），一般的对象就是PyObject，然后变长对象其实就是给PyObject加了个size成为了PyVarObject。

对于所有对象来说，均有2个重要的元素：
* 引用计数（reference count），对象中的引用计数用来记录引用对象的数目，会在指针指向或删除对该对象的引用时，相应的增加或者减少，当引用计数达到0，就代表这没有指针指向这个对象了，这个对象便会在堆中移除。从名字就可以看出来，这个域是为了支持垃圾回收而定义的。

* 类型（type），对象的类型表示对象包含数据的类型，每个对象中都有一个指向类型的指针。比较有意思的是，type也是一个对象，type对象的类型是它本身，所以type对象的类型指针就指向它自己了。

对于可变长的对象（比如list，dict），会多一个域：
* 大小（size），这个大小表示这个变长变量中元素的个数。注意，是元素的个数，不是字节个数。

另外头部还有`_PyObject_HEAD_EXTRA`，这个宏定义了next和prev指针，用来支持用一个双链表把所有堆中的对象串起来。
```c
/* Define pointers to support a doubly-linked list of all live heap objects. */
#define _PyObject_HEAD_EXTRA            \
    struct _object *_ob_next;           \
    struct _object *_ob_prev;
```

### 参考资料
Python-3.5.0源码
[PYTHON 源码阅读 - 对象](http://www.wklken.me/posts/2014/08/05/python-source-object.html#pyobject_head)
[Python源码剖析](http://book.douban.com/subject/3117898/)