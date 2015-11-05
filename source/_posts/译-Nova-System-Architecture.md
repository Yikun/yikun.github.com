title: "[译]Nova System Architecture"
date: 2015-10-15 10:04:44
tags:
  - Nova
  - OpenStack
---

### Nova系统架构
> Nova is built on a **shared-nothing**, **messaging-based** architecture. All of the major nova components can be run on **multiple servers**. This means that most component to component communication must go via **message queue**. In order to **avoid blocking** each component while waiting for a response, we use **deferred objects**, with a **callback** that gets triggered when a response is received.

Nova建立在一个无共享，基于消息的架构。所有的nova主要组件都可以运行在不同的服务器。这就意味着大多数组件之间的通信必须通过消息队列。为了避免每个组件在等待响应时的阻塞，我们是用deferred对象，当一个响应接收时会触发相应的回调。

<!--more-->

> Nova recently moved to using a sql-based central database that is shared by all components in the system. The amount and depth of the data fits into a sql database quite well. For small deployments this seems like an optimal solution. For larger deployments, and especially if security is a concern, nova will be moving towards multiple data stores with some kind of aggregation system.

Nova最近正在迁移到一个基于SQL的中心数据库，系统中所有组件都共享一个数据库。大量的深度的数据非常适合存放在SQL数据库中。对于小型部署，这是一个最佳方案。对于大型部署，特别是非常看重安全的话，nova也将会进一步搬到不同集成系统中的多种数据库。

### 组件
下面将看到两种不同的架构：
![qq20151015-0 2x](https://cloud.githubusercontent.com/assets/1736354/10502572/14066a24-7320-11e5-9552-e230cd8fa5cb.png)

![qq20151015-1 2x](https://cloud.githubusercontent.com/assets/1736354/10502582/2c4de97c-7320-11e5-9b33-2defabd49a7d.png)

* DB: 基于SQL的数据存储
* API: 组件接收HTTP请求，可以通过osl.messaging和HTTP来转换指令和通信
* Scheduler: 决定哪个host获得某个instance
* Network: 管理IP转发、网桥、vlans
* Compute: 管理hypervisor和virtual machines的通信
* Conductor: 处理需要调整(build/resize)的请求，作为数据库代理，或者处理对象的转换

> While all services are designed to be **horizontally scalable**, you should have significantly more computes then anything else.

由于所有的服务都被设计为横向扩展的，你只需要更多的计算机就可以了。