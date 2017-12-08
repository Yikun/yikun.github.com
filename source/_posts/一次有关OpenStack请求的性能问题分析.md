title: 一次有关OpenStack请求的性能问题分析
tags:
  - OpenStack
number: 54
date: 2016-07-22 23:09:25
---

### 0. 背景介绍

目前OpenStack对外提供的北向接口是以REST接口提供的，也就是说通过HTTP（HTTPS）接口进行请求，进行虚拟机或者卷等相关的操作。OpenStack提供I层基本的能力，比如创建、查询、删除虚拟机或者卷等操作，以OpenStack作为平台，对上提供用户接口，对下操作下层Driver完成对设备的操作，其大致的架构基本如下所示：

<!--more-->

![openstackrest](https://cloud.githubusercontent.com/assets/1736354/17061504/6b7cb7e4-5061-11e6-9adb-0337558ccc90.png)

整个OpenStack提供的接口也都是无状态的，对外接口也非常简单，例如获取卷的详情可以通过volumes的接口，最终可以得到卷的详情信息：
![cinder show](https://cloud.githubusercontent.com/assets/1736354/17061512/70953ac6-5061-11e6-82ed-47017c82ace2.png)

一般调用这些接口的上层主要是一些编排性或者提高用户体验的应用，达到“点一个按钮”完成对资源创建或者查询的应用。
### 1. 问题出现

问题的现象是，上层对资源进行操作、查询的时候非常慢，而实际在上层应用的服务器节点通过curl命令去调OpenStack接口的时候，发现整体时延均在秒级以上，甚至一个非常简单的卷查询指令也耗费了1秒以上的时间，而通过ping指令去测OpenStack响应时，保持在200ms左右，那么中间的时间耗在了哪？

### 2. 定位结论
好吧，我承认这篇文章写了一年了。。。不装逼了，直接说结论吧。当时遇到一个非常奇葩的问题，就是任何请求都耗时非常久，最后发现原来是https搞得鬼。

对于正常的http请求来说，请求本身耗时大致是一个RTT（TCP的三次握手），而对于https，中间增加了SSL握手的时间，大概算下来是3倍+的时延。

重点呢就是想记录一下这个指令：
```shell
curl -w "TCP handshake: %{time_connect}, SSL handshake: %{time_appconnect}\n" -so /dev/null https://www.baidu.com
```
可以得到类似的结果，也告诉了用户大致请求中间的耗时花费在哪了，结果就像这样：
> TCP handshake: 0.049, SSL handshake: 0.163

好了，就酱紫，底下参考链接是当时看的一些资料。

### 参考链接

[SSL handshake latency and HTTPS optimizations.](http://www.semicomplete.com/blog/geekery/ssl-latency.html)
[大型网站的 HTTPS 实践（2）：HTTPS 对性能的影响](http://blog.jobbole.com/86664/)
[HTTPS 要比 HTTP 多用多少服务器资源？](http://www.zhihu.com/question/21518760)
[HTTPS连接的前几毫秒发生了什么](http://blog.jobbole.com/48369/)
[](http://www.jianshu.com/p/544c0a2d47f4)
[图解SSL/TLS协议](http://www.ruanyifeng.com/blog/2014/09/illustration-ssl.html)
[SSL/TLS协议运行机制的概述](http://www.ruanyifeng.com/blog/2014/02/ssl_tls.html)
[](https://blog.josephscott.org/2011/10/14/timing-details-with-curl/)
[SSL延迟有多大？](http://www.ruanyifeng.com/blog/2014/09/ssl-latency.html)
[HTTPS研究（2）—分解HTTPS连接建立过程](http://www.jianshu.com/p/a766bbf31417)
