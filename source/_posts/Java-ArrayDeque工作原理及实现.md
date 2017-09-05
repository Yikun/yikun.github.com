title: Java ArrayDeque工作原理及实现
tags:
  - Java
number: 17
date: 2015-04-11 18:50:32
---

### 1. 概述

> Resizable-array implementation of the **Deque interface**. Array deques have no capacity restrictions; they **grow as necessary to support usage**. They are not thread-safe; in the absence of external synchronization, they do not support concurrent access by multiple threads. Null elements are prohibited. This class is likely to be faster than Stack when used as a stack, and faster than LinkedList when used as a queue.

![arrayqueue](https://cloud.githubusercontent.com/assets/1736354/7120880/13a5b9a4-e243-11e4-8a63-33c4852c268c.png)

> 以循环数组实现的双向Queue。大小是2的倍数，默认是16。
> 
> 普通数组只能快速在末尾添加元素，为了支持FIFO，从数组头快速取出元素，就需要使用循环数组：有队头队尾两个下标：弹出元素时，队头下标递增；加入元素时，如果已到数组空间的末尾，则将元素循环赋值到数组[0](如果此时队头下标大于0，说明队头弹出过元素，有空位)，同时队尾下标指向0，再插入下一个元素则赋值到数组[1]，队尾下标指向1。如果队尾的下标追上队头，说明数组所有空间已用完，进行双倍的数组扩容。
