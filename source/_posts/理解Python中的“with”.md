title: 理解Python中的“with”
tags:
  - Python
number: 52
date: 2016-04-15 23:44:15
---

### 1. 缘起

Python中，打开文件的操作是非常常见的，也是非常方便的，那么如何优雅的打开一个文件？大部分的同学会这样实现：

``` Python
with open( "a.txt" ) as f :
    # do something
```

大家都知道，这样写可以自动处理资源的释放、处理异常等，化简了我们打开文件的操作，那么，`with`到底做了什么呢？

<!--more-->

从《Python学习手册》中是这么描述的：

> 简而言之，with/as语句的设计是作为常见try/finally用法模式的替代方案。就像try/finally语句，with/as语句也是用于定义必须执行的终止或“清理"行为,无论步骤中是否发生异常。不过，和try/finally不同的是，with语句支持更丰富的基于对象的协议，可以为代码块定义支持进入和离开动作。

也就是说对于代码：

``` Python
with expression [as varible]:
    with-block
```

with语句的实际工作方式：

> 1.计算表达式，所得到的对象是**环境管理器**，他必须有**enter**，**exit**两个方法。
> 2.环境管理器的**enter**方法会被调用。如果as存在，**enter**的返回值赋值给as后面的变量，否则，被丢弃。
> 3.代码块中嵌套的代码（with-block）会执行。
> 4.如果with代码块会引发异常，**exit**(type,value,traceback)方法就会被调用。这些也是由sys.exec_info返回相同的值。如果此方法返回为假，则异常会重新引发。否则，异常会中止。正常情况下异常是应该被重新引发，这样的话传递到with语句外。
> 5.如果with代码块没有引发异常，**exit**方法依然会调用，其type、value以及traceback参数会以None传递。

with/as语句的设计，是为了让必须在程序代码块周围发生的启动和终止活动一定会发生。和try/finally语句（无论异常是否发生其离开动作都会执行）类似，但是with/as有更丰富的对象协议，可以定义进入和离开的动作。
### 2. 设计的初衷

with/as语句的设计的初衷，在[PEP343](https://www.python.org/dev/peps/pep-0343/)中是这么描述的：

> This PEP adds a new statement "with" to the Python language to make it possible to factor out standard uses of try/finally statements.
> In this PEP, context managers provide **enter**() and **exit**() methods that are invoked on entry to and exit from the body of the with statement.

对于下面的操作：

``` Python
with EXPR as VAR:
            BLOCK
```

等价于

``` Python
mgr = (EXPR)
exit = type(mgr).__exit__  # Not calling it yet
value = type(mgr).__enter__(mgr)
exc = True
try:
    try:
        # 将__enter__函数调用的返回值返回给VAR
        VAR = value  # Only if "as VAR" is present
        # 执行BLOCK
        BLOCK
    except:
        # 异常处理，The exceptional case is handled here
        exc = False
        if not exit(mgr, *sys.exc_info()):
            raise
        # The exception is swallowed if exit() returns true
finally:
    # 清理，The normal and non-local-goto cases are handled here
    if exc:
        exit(mgr, None, None, None)
```

我们可以看到上述代码完整的处理了初始化及异常/正常场景的清理操作，这便是`with`的设计思想，化简了冗余的代码，把那些重复的工作以及异常处理操作交给写“EXPR”源码（比如open操作）的同学。
### 3. 更深入的学习

我们继续深入的看下[Python3](https://github.com/Yikun/Python3/blob/master/Lib/_pyio.py#L447)中**enter**和**exit**的实现：

``` Python
class IOBase(metaclass=abc.ABCMeta):
    # ... ...

    ### Context manager ###

    def __enter__(self):  # That's a forward reference
        """Context management protocol.  Returns self (an instance of IOBase)."""
        self._checkClosed()
        return self

    def __exit__(self, *args):
        """Context management protocol.  Calls close()"""
        self.close()
```

和我们预期的一致，在**enter**中返回了这个IO对象，然后在**exit**中，进行了清理。
### 参考资料
1. 《Python学习手册》 
2. [Understanding Python's "with" statement](http://effbot.org/zone/python-with-statement.htm)
3. [PEP 343 -- The "with" Statement](https://www.python.org/dev/peps/pep-0343/)
4. [Catching an exception while using a Python 'with' statement](http://stackoverflow.com/questions/713794/catching-an-exception-while-using-a-python-with-statement)
5. [理解Python中的with…as…语法](http://zhoutall.com/archives/325)
6. [PEP 3116 -- New I/O](https://www.python.org/dev/peps/pep-3116/)
7. [Python 3.5.0 Code](https://github.com/Yikun/Python3/blob/master/Lib/_pyio.py#L447)
