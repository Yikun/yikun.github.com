title: "Java ArrayDeque工作原理及实现"
date: 2015-04-11 18:50:32
tags:
  - Java
---

### 1. 概述
> Resizable-array implementation of the **Deque interface**. Array deques have no capacity restrictions; they **grow as necessary to support usage**. They are not thread-safe; in the absence of external synchronization, they do not support concurrent access by multiple threads. Null elements are prohibited. This class is likely to be faster than Stack when used as a stack, and faster than LinkedList when used as a queue.

![arrayqueue](https://cloud.githubusercontent.com/assets/1736354/7120880/13a5b9a4-e243-11e4-8a63-33c4852c268c.png)

