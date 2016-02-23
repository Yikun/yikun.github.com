title: "Python3源码学习-整型"
date: 2015-12-21 21:48:29
tags:
  - Python
---

### 1. 引入
我们先看看对整型变量i进行赋值，并对i进行显示的过程：
``` Python
>>> i=1
>>> i
1
```

<!--more-->

在之前已经了解到对象是如何存储、组织的了，那么，整型是如何存储的呢？在Python 2中，整型是分Int和Long的，稍小一点的数直接用C语言中的long去存储，稍大一点的数（超过long的承受范围）：
```Python
Python 2.7.10 (default, Jul 14 2015, 19:46:27)
>>> type(1)
<type 'int'>

>>> sys.maxsize
# 2**63-1
9223372036854775807

>>> type(sys.maxsize)
<type 'int'>

>>> type(sys.maxsize+1)
<type 'long'>
```
而在Python 3中，我们进行相同的操作：
```Python
Python 3.5.0 (default, Dec 20 2015, 21:24:49)
>>> sys.maxsize
# 2**63-1
9223372036854775807

>>> type(1)
<class 'int'>

>>> type(sys.maxsize)
<class 'int'>

>>> type(sys.maxsize+1)
<class 'int'>
```
我们发现不论这个数是“大”是“小”，都无差别的显示为“int”了。那么，在Python3中做了哪些变动呢？Python3如何“一统天下”大小，存储整型数据呢？在Python 2中，分别使用intobject和longobject去存储整型，而在Python 3中，则使用longobject统一的表示整型，并且将type也设为“int”，在[PEP 237 -- Unifying Long Integers and Integers](https://www.python.org/dev/peps/pep-0237/)中，详细的阐述了这个改变，下面让我们详细看看Python 3中整型的实现。

### 2. 整型的实现
我们先看看longobject.h：
```C
typedef struct _longobject PyLongObject; /* Revealed in longintrepr.h */
```
按着注释解释，发现了整型的庐山真面目在longintrepr.h中：
```C
/* Long integer representation.
   The absolute value of a number is equal to
   	SUM(for i=0 through abs(ob_size)-1) ob_digit[i] * 2**(SHIFT*i)
   Negative numbers are represented with ob_size < 0;
   zero is represented by ob_size == 0.
   In a normalized number, ob_digit[abs(ob_size)-1] (the most significant
   digit) is never zero.  Also, in all cases, for all valid i,
   	0 <= ob_digit[i] <= MASK.
   The allocation function takes care of allocating extra memory
   so that ob_digit[0] ... ob_digit[abs(ob_size)-1] are actually available.

   CAUTION:  Generic code manipulating subtypes of PyVarObject has to
   aware that ints abuse  ob_size's sign bit.
*/

struct _longobject {
	PyObject_VAR_HEAD
	digit ob_digit[1];
};
```
注释非常清楚，我们得到以下信息：
1. 整数的绝对值为`SUM(for i=0 through abs(ob_size)-1) ob_digit[i] * 2**(SHIFT*i)`。
2. 0值用`obsize==0`来表示。
3. 对于正常的数，`ob_digit[abs(ob_size)-1]`非0。
4. 对于有效的`i`，`ob_digit[i]`的范围在`[0, MASK]`。

可以看到整型是借助柔性数组来实现的，柔性数组较指针来说，分配内存和释放内存时更为方便，且数组名本身不占用空间（指针需要占用1个int型的控件），柔性数组相关内容可以参考[链接](http://blog.csdn.net/fengbingchun/article/details/24185217)。

光看描述可能有点抽象，我们看一个具体的例子，在我的环境中，SHIFT为30，MASK则为2的30次方-1，`1152921506754330628`这个数字在代码中是这样存储的，ob_size为3，ob_digit为4-2-1，我们来看看具体的表示含义：
![int](https://cloud.githubusercontent.com/assets/1736354/11933249/af84fe30-a835-11e5-8a09-257bb08b3c12.png)
很熟悉吧，其实就是个进制转换过程：2的30次方进制转换为10进制！没错，就是这么简单。

### 3. 常用整数的优化
我们再观察一个现象：
```Python
>>> i=10
>>> j=10
>>> i is j
True

>>> i=257
>>> j=257
>>> i is j
False
```
我们发现对于第一个来说，i和j是一个对象，而第二个例子i和j是不同的对象。
可以想象的，如果每个整型都需要使用对象来表示，那么每创建一个整型就需要创建一个对象，这显然是不合理的，因此设计者将[-5, 257)范围内的整型数据进行了特殊处理，即在初始化的时候就将这些对象产生好，以后需要这些对象时直接从对象池取就好。
```C
#ifndef NSMALLPOSINTS
#define NSMALLPOSINTS           257
#endif
#ifndef NSMALLNEGINTS
#define NSMALLNEGINTS           5
#endif

// ... ...

/* Small integers are preallocated in this array so that they
   can be shared.
   The integers that are preallocated are those in the range
   -NSMALLNEGINTS (inclusive) to NSMALLPOSINTS (not inclusive).
*/
static PyLongObject small_ints[NSMALLNEGINTS + NSMALLPOSINTS];

// ... ...

static PyObject *
get_small_int(sdigit ival)
{
    PyObject *v;
    assert(-NSMALLNEGINTS <= ival && ival < NSMALLPOSINTS);
    v = (PyObject *)&small_ints[ival + NSMALLNEGINTS];
    Py_INCREF(v);
#ifdef COUNT_ALLOCS
    if (ival >= 0)
        quick_int_allocs++;
    else
        quick_neg_int_allocs++;
#endif
    return v;
}
#define CHECK_SMALL_INT(ival) \
    do if (-NSMALLNEGINTS <= ival && ival < NSMALLPOSINTS) { \
        return get_small_int((sdigit)ival); \
    } while(0)
```

### 4. Hack一下
为了验证我们对整型实现理解的正确性，我们修改`long_to_decimal_string_internal`中加入一些代码，打印出整型变量的详情：
```C
static int
long_to_decimal_string_internal(PyObject *aa,
                                PyObject **p_output,
                                _PyUnicodeWriter *writer)
{
    PyLongObject *scratch, *a;
    PyObject *str;
    Py_ssize_t size, strlen, size_a, i, j;
    digit *pout, *pin, rem, tenpow;
    int negative;
    enum PyUnicode_Kind kind;

    a = (PyLongObject *)aa;
    printf("==== Hack Code ====\n");
    printf("ob_size     = %d\n", Py_SIZE(a));
    for (int ob_i = 0; ob_i < Py_SIZE(a); ++ob_i)
    {
        printf("ob_digit[%d] = %d\n", ob_i, a->ob_digit[ob_i]);
    }
    printf("====    End    ====\n");
    
    // ... ...

}
```
修改后，我们看到结果为：
```Python
>>> 2**60+2*2**30+4
==== Hack Code ====
ob_size     = 3
ob_digit[0] = 4
ob_digit[1] = 2
ob_digit[2] = 1
====    End    ====
1152921506754330628
```
我们看到，结果与我们预期的一样，ob_size为3，代表ob_digit的数组大小为3，ob_digit表述的数值为(2^60) x `1` + (2^30) x `2` + (2^0) x `4`。完整代码工程请见[链接](https://github.com/Yikun/Python3/commit/b816507f56ee14b730b7ab52a61eb17f9eb9d815)

### 参考链接
[PEP 237 -- Unifying Long Integers and Integers](https://www.python.org/dev/peps/pep-0237/)
[How does Python manage int and long?](http://stackoverflow.com/questions/2104884/how-does-python-manage-int-and-long)
[How does python represent such large integers?](http://stackoverflow.com/questions/22875067/how-does-python-represent-such-large-integers)
[Python:How does C implements the Python assignment of large numbers](http://www.itsprite.com/pythonhow-does-c-implements-the-python-assignment-of-large-numbers/)
[HACKING PYLONGOBJECT ON PYTHON 3.2](https://ep2013.europython.eu/conference/talks/hacking-pylongobject-on-python-32)
[py3源码-2-整数](https://interma.wordpress.com/2012/10/11/py3_integral/)
[Python 整数对象实现原理](http://foofish.net/blog/89/python_int_implement)
[结构体中最后一个成员为[0]或[1]长度数组(柔性数组成员)的用法](http://blog.csdn.net/fengbingchun/article/details/24185217)
