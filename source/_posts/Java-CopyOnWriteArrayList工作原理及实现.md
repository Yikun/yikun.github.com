title: "Java CopyOnWriteArrayList工作原理及实现"
date: 2015-04-28 23:58:01
tags:
  - Java
number: 21
---

> 并发优化的ArrayList。用CopyOnWrite策略，在修改时先复制一个快照来修改，改完再让内部指针指向新数组。
> 
> 因为对快照的修改对读操作来说不可见，所以只有写锁没有读锁，加上复制的昂贵成本，典型的适合读多写少的场景。如果更新频率较高，或数组较大时，还是Collections.synchronizedList(list)，对所有操作用同一把锁来保证线程安全更好。
> 
> 增加了addIfAbsent(e)方法，会遍历数组来检查元素是否已存在，性能可想像的不会太好。
