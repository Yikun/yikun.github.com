title    : nginx的事件主体分析
category : nginx源码学习
tags     : 
date     : 2014-03-26
---

### 1. 概述
在上篇文章中，介绍了事件模块的初始化工作，其中ngx_event_process_init会调用module->actions.init(对应epoll为ngx_epoll_init)，该步调用的是epoll的初始化函数，之后，将rev的回调函数指向ngx_event_accept函数，这样便会accept新的链接。那么，本文将以epoll为例，来学习一下事件机制的主体。
<!--more-->
### 2. 事件主体
我们的重点还是放在ngx_worker_process_cycle，处理事件的核心则是ngx_process_events_and_timers，其基本机制如下图所示，
![eventcore](/assets/post/2014-03-26-nginxevent/nginx_epoll.png)

在ngx_worker_process_cycle最开始的初始化中，epoll模块会调用epoll_creat初始化，之后便进入事件的循环中，然后epoll_wait有事件就加入到队列中，然后集中处理，如果拿到锁了就可以处理accept的事件，然后处理完accept后就解锁，之后再去处理普通读写事件。

事件的主循环主要分为三步

1.调用ngx_process_events。

	#define ngx_process_events   ngx_event_actions.process_events

而对于epoll来说就是调用ngx_epoll_process_events函数。

2.调用ngx_event_process_posted处理事件队列中的事件。

ngx_event_process_posted(cycle, &ngx_posted_accept_events);
ngx_event_process_posted(cycle, &ngx_posted_events);
我们可以看见处理的网络事件主要牵扯到2个队列，一个是ngx_posted_accept_events，另一个是ngx_posted_events。其中，一个队列用于放accept的事件，另一个则是普通的读写事件；
ngx_event_process_posted会处理事件队列，其实就是调用每个事件的回调函数，然后再让这个事件出队。
例如，我们在开始的时候，已经把accept事件的回调函数指定为ngx_event_accept，那么当处理accept事件的时候便会调用这个函数。

我么可以看到，每个worker进程先抢锁，抢到锁的worker就获得所有监听的事件，这个worker来“接待”新的"accept"，当接待完ngx_posted_accept_events队列里面的连接后，就解锁。没拿到锁的，会更频繁的拿锁。最终实现了负载均衡。

3.处理定时器事件。

以上便是整个事件机制的实现。