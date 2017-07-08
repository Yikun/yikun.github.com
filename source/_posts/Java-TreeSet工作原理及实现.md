title: "Java TreeSet工作原理及实现"
date: 2015-04-10 17:05:12
tags:
  - Java
number: 16
---

### 1.概述

> A NavigableSet implementation based on a **TreeMap**. The elements are ordered using their natural ordering, or by a Comparator provided at set creation time, depending on which constructor is used.This implementation provides guaranteed **log(n)** time cost for the basic operations (add, remove and contains).

TreeSet是基于TreeMap实现的，也非常简单，同样的只是用key及其操作，然后把value置为dummy的object。

``` java
TreeSet<String> tset = new TreeSet<String>();
tset.add("1语文");
tset.add("3英语");
tset.add("2数学");
tset.add("4政治");
tset.add("5历史");
tset.add("6地理");
tset.add("7生物");
tset.add("8化学");
for(String str : tset) {
    System.out.println(str);
}
```

其具体的结构是：
![treeset](https://cloud.githubusercontent.com/assets/1736354/7085286/d0b1658c-dfa7-11e4-972c-d1d07e5fadfd.png)

利用TreeMap的特性，实现了set的有序性(通过红黑树实现)。
### 参考资料

[TreeSet(Java Platform SE 8)](http://docs.oracle.com/javase/8/docs/api/java/util/TreeSet.html)
