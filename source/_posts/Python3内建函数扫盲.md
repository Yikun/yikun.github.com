title: Python3内建函数扫盲
tags: []
number: 73
date: 2018-06-15 10:40:26
---

 已完成11/68: ![Progress: 10/68](http://progressed.io/bar/15)

#### 0. abs绝对值

#### 1. all（all items are True?） 迭代中所有元素均为True或者为空也返回true

```Python
>>> all([1,2,3])
True
>>> all([1,2,3,0])
False
>>> all([])
True
```

#### 2. any（any item is True?）, 迭代中任意一个元素为True，则返回True，否则返回False，为空返回False
```Python
>>> any([1,2,3])
True
>>> any([0])
False
>>> any([])
False
>>> any([[],[]])
False
>>> any([[0],[]])
True
```

#### 3. ascii，返回repr()的ascii形式
```Python
>>> ascii('中文')
"'\\u4e2d\\u6587'"
>>> ascii(1)
'1'
>>> ascii([])
'[]'
>>> ascii([1,2,3])
'[1, 2, 3]'
```
repr和eval为反向函数（类似序列化反序列化？）
```Python
>>> repr('[1, 2, 3]')
"'[1, 2, 3]'"
>>> eval("'[1, 2, 3]'")
'[1, 2, 3]'
>>> eval('[1, 2, 3]')
[1, 2, 3]
>>> repr('[1, 2, 3]')
"'[1, 2, 3]'"
>>> repr([1, 2, 3])
'[1, 2, 3]'
>>> eval('[1, 2, 3]')
[1, 2, 3]
```

#### 4. bin 返回二进制形式

#### 5. bool 返回布尔值

#### 6. bytearray
大部分用法和bytes/str有点像，不过bytearray是可变的类似a list of char，str是immutable的。也就说说改变字符串的时候其实是把内存中真个对象换了，bytearray的话，只换某个字符，性能好一些

参考学习：[Where are python bytearrays used?](https://stackoverflow.com/questions/9099145/where-are-python-bytearrays-used)

> A bytearray is very similar to a regular python string (str in python2.x, bytes in python3) but with an important difference, whereas strings are immutable, bytearrays are mutable, a bit like a list of single character strings.
> 
> This is useful because some applications use byte sequences in ways that perform poorly with immutable strings. When you are making lots of little changes in the middle of large chunks of memory, as in a database engine, or image library, strings perform quite poorly; since you have to make a copy of the whole (possibly large) string.  bytearrays have the advantage of making it possible to make that kind of change without making a copy of the memory first.
> 
> But this particular case is actually more the exception, rather than the rule. Most uses involve comparing strings, or string formatting. For the latter, there's usually a copy anyway, so a mutable type would offer no advantage, and for the former, since immutable strings cannot change, you can calculate a hash of the string and compare that as a shortcut to comparing each byte in order, which is almost always a big win; and so it's the immutable type (str or bytes) that is the default; and bytearray is the exception when you need it's special features.

#### 7.bytes
bytes is an immutable version of bytearray

#### 8.callable 判断一个obj的argument是否可以call
https://github.com/openstack/nova/blob/2d6a838/nova/virt/hyperv/driver.py#L75

#### 9. chr 和 ord
```Python
>>> ord('a')
97
>>> chr(97)
'a'
```

#### 10. @classmethod 和 @staticmethod

classmethod must have a reference to a class object as the first parameter, whereas staticmethod can have no parameters at all.

```Python
class Date(object):

    def __init__(self, day=0, month=0, year=0):
        self.day = day
        self.month = month
        self.year = year

    @classmethod
    def from_string(cls, date_as_string):
        day, month, year = map(int, date_as_string.split('-'))
        date1 = cls(day, month, year)
        return date1

    @staticmethod
    def is_date_valid(date_as_string):
        day, month, year = map(int, date_as_string.split('-'))
        return day <= 31 and month <= 12 and year <= 3999

date2 = Date.from_string('11-09-2012')
is_date = Date.is_date_valid('11-09-2012')
```
https://stackoverflow.com/questions/12179271/meaning-of-classmethod-and-staticmethod-for-beginner

#### 11. compile
将一个字符串编译为字节代码，这个函数可以用在web应用从模板（可含Python语法）生成html。
```Python
>>>str = "for i in range(0,10): print(i)" 
>>> c = compile(str,'','exec')   # 编译为字节代码对象 
>>> c
<code object <module> at 0x10141e0b0, file "", line 1>
>>> exec(c)
```