title: "Java LinkedList工作原理及实现"
date: 2015-04-05 22:19:28
tags:
  - Java
---

### 1. 概述
LinkedList是一个简单的数据结构，与ArrayList不同的是，他是基于链表实现的。

> Doubly-linked list implementation of the List and Deque interfaces. Implements all optional list operations, and permits all elements (including null).

```java
LinkedList<String> list = new LinkedList<String>();
list.add("语文: 1");
list.add("数学: 2");
list.add("英语: 3");
```
结构也相对简单一些，如下图所示：
![linkedlist](https://cloud.githubusercontent.com/assets/1736354/6997435/92fab224-dbed-11e4-932a-4c5593a2abb7.png)

### 2. set和get函数
```java
public E set(int index, E element) {
    checkElementIndex(index);
    Node<E> x = node(index);
    E oldVal = x.item;
    x.item = element;
    return oldVal;
}

public E get(int index) {
	checkElementIndex(index);
	return node(index).item;
}
```
这两个函数都调用了`node`函数，该函数会以O(n/2)的性能去获取一个节点，具体实现如下所示：
``` java
Node<E> node(int index) {
    // assert isElementIndex(index);

    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```
就是判断index是在前半区间还是后半区间，如果在前半区间就从head搜索，而在后半区间就从tail搜索。而不是一直从头到尾的搜索。如此设计，将节点访问的复杂度由O(n)变为O(n/2)。

### 参考资料
[LinkedList (Java Platform SE 8)](http://docs.oracle.com/javase/8/docs/api/java/util/LinkedList.html)