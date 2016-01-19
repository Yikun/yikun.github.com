title: "[译]Threading model"
date: 2015-11-19 21:34:04
tags:
  - OpenStack
---

# Threading model

> All OpenStack services use green thread model of threading, implemented through using the Python eventlet and greenlet libraries.

> Green threads use a cooperative model of threading: thread context switches can only occur when specific eventlet or greenlet library calls are made (e.g., sleep, certain I/O calls). From the operating system’s point of view, each OpenStack service runs in a single thread.

> The use of green threads reduces the likelihood of race conditions, but does not completely eliminate them. In some cases, you may need to use the @lockutils.synchronized(...) decorator to avoid races.

> In addition, since there is only one operating system thread, a call that blocks that main thread will block the entire process.

理解：OpenStack的所有服务都使用Green thread，使用eventlet和greenlet库，绿色线程使用协作并发模型，线程的切换只在eventlet或greenlet库调用一些切换时发生。从操作系统角度上来看，每个OpenStack运行在一个单一线程。用Green Thread的好处是能够减少race conditions，当然有些时候我们也必须使用@lockutils.synchronized(...)来完全避免。因为只用一个系统级别的单线程，所以调用一旦阻塞就会阻塞整个进程。

关于Python中的并发模型，可以参考[Python并发模型](http://www.oschina.net/translate/python-concurrency-model)一文，把Thread（线程切换耗资源）、MicroThread（依靠解释器调度）、Green thread（协作并发）的特点对比了下。

还有[Python几种并发实现方案的性能比较](http://www.cnblogs.com/sevenyuan/archive/2010/12/08/1900386.html)将Python中的集中并发方案进行了对比和说明。

## Yielding the thread in long-running tasks
> If a code path takes a long time to execute and does not contain any methods that trigger an eventlet context switch, the long-running thread will block any pending threads.

> This scenario can be avoided by adding calls to the eventlet sleep method in the long-running code path. The sleep call will trigger a context switch if there are pending threads, and using an argument of 0 will avoid introducing delays in the case that there is only a single green thread:

```python
from eventlet import greenthread
...
greenthread.sleep(0)
```

理解：对于那些耗时很长的任务，需要我们添加一些yield方法，来避免在单个的调用中阻塞很久。

## MySQL access and eventlet
> Queries to the MySQL database will block the main thread of a service. This is because OpenStack services use an external C library for accessing the MySQL database. Since eventlet cannot use monkey-patching to intercept blocking calls in a C library, the resulting database query blocks the thread.

> The Diablo release contained a thread-pooling implementation that did not block, but this implementation resulted in a bug and was removed.

理解：对于MySQL数据的查询会阻塞服务，因为eventlet对C库的调用是无法去做monkey-patching的。