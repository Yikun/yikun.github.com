title: OpenStack源码分析-Cinder删除卷流程
tags:
  - Cinder
  - OpenStack
number: 46
date: 2016-02-21 19:56:59
---

### 1. Cinder删除卷整体流程

![delete](https://cloud.githubusercontent.com/assets/1736354/13130440/f8979c4c-d61e-11e5-8665-84b9d2f928f9.png)

删除卷流程比较简单，主要就是cinder-api解析Cilent的指令，并响应，发送RPC调用cinder-volume的delete操作，详细流程如下：
a. Client发送删除指令，通过RESTful接口访问cinder-api；
b. Cinder-api解析响应请求，通过RPC调用cinder-volume；
c. Cinder-volume通过调用Driver的delete函数进行删除。
### 2. 源码详解

 ![cinder delete](https://cloud.githubusercontent.com/assets/1736354/13130451/0e77ce74-d61f-11e5-91e9-9b63918beef1.png)
#### 2.1 Cinder API

(1) Cinder\api\v2\volumes.py
VolumeController的delete函数响应请求，首先从API获取Volume对象信息，然后，调用API的delete对对象进行删除；
(2) Cinder\volume\api.py
API.delete的对卷的状态进行检查，并更新状态为“deleting”，然后调用rpcapi的delete_volume函数
#### 2.2 Cinder Volume

(1) Cinder\volume\rpcapi.py
VolumeAPI函数投递一个远程消息，通过消息队列远程调用cinder volume的delete_volume函数。
(2) Cinder\volume\manager
最终通过VolumeManager调用dirver的delete_volume对卷进行删除。
