title: "C语言中移位操作符优先级的坑"
date: 2015-04-18 17:16:55
tags:
  - C/C++
number: 18
---

今天和tiancai交流他腾讯面试题目的时候，有这么一个题目，大致是这样描述的：

> 有一个函数f，可以等概率产生0,1，写一个函数g，可以等概率地产生0~7中的数。

于是，我写出了如下一个错误的解法：

> f()+f()<<1+f()<<2

而正确的应该是：

> f() + (f()<<1) + (f()<<2)

之前一直有误解，而实际情况是是**移位操作符的优先级低于加减法的优先级**。为了验证和加深记忆，又写了一个小测试：

``` C
#include <stdio.h>
int main()
{
    printf("1<<1+2<<1:     %d\n", 1<<1+2<<1);
    printf("1<<(1+2)<<1:   %d\n", 1<<(1+2)<<1);
    printf("(1<<1)+(2<<1): %d\n", (1<<1)+(2<<1));
    return 0;
}
```

输出为:

```
1<<1+2<<1:     16
1<<(1+2)<<1:   16
(1<<1)+(2<<1): 6
```

其中编译的时候，也有一个友情提示：

```
main.c:4:36: warning: operator '<<' has lower precedence than '+'; '+' will be
      evaluated first [-Wshift-op-parentheses]
        printf("1<<1+2<<1:     %d\n", 1<<1+2<<1);
                                       ~~~^~
main.c:4:36: note: place parentheses around the '+' expression to silence this
      warning
        printf("1<<1+2<<1:     %d\n", 1<<1+2<<1);
                                          ^
                                         (  )
1 warning generated.
```

最后，

> 希望自己永远保持一颗怀疑的心。
