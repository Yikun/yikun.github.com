title: "OpenStack源码分析-Cinder创建卷流程"
date: 2016-02-14 17:43:30
tags:
  - Cinder
  - OpenStack
number: 45
---

### 1. Cinder创卷整体流程

![create](https://cloud.githubusercontent.com/assets/1736354/13130372/71de5178-d61e-11e5-8d7c-6b9f0a244e41.png)

如整体架构图所示，创建卷涉及的答题步骤主要有以下几步：
a. Client发送请求，通过RESTFUL接口访问cinder-api。
b. Api解析响应请求，api解析由Client发送来的请求，并通过rpc进一步调用cinder-scheduler。
c. Scheduler对资源进行调度，scheduler选择合适的节点进行。
d. Volume调用Driver创建卷，volume通过指定Driver进行卷的创建。
### 2. 源码详解

代码的整体流程如下所示：
 ![cinder seq](https://cloud.githubusercontent.com/assets/1736354/13033012/82f1e54e-d342-11e5-835c-e8f6d3baff40.png)
从上图可以看出，整体处理流程包括三大部分，分别是API、Scheduler、Volume三部分。
#### 2.1 Cinder API部分

![create_api](https://cloud.githubusercontent.com/assets/1736354/13130422/b4a5c3b0-d61e-11e5-8781-52c9586b9c7d.png)

(1) cinder\api\v2\volumes.py
VolumeController. create函数对创建请求进行响应，首先函数对volume_type、metadata、snapshot等信息进行检查，然后调用Volume API的create进行创建。
(2) cinder\volume\api.py
API.create函数对source_volume、volume_type等参数进行进一步检查，并调用cinder.volume.flows.api.get_flow来创建。
(3) cinder\volume\flows\api\create_volume.py
get_flow函数检查Quata，最后创建EntryCreateTask及VolumeCastTask等任务，
其中EntryCreateTask会将卷的创建过程写入数据库，此时卷的状态为"creating"。
VolumeCastTask.excute函数会调用VoumeCastTask._cast_create_volume
VolumeCastTask._cast_create_volume函数，如果未传入host，则会经过调度进行创建卷，通过scheduler_rpcapi.create_volume创建卷；如果未传入host则直接交由Volume Manager去创建卷。

至此为止，Cinder API部分完成了自己的工作。
#### 2.2 Cinder Scheduler

![create_sche](https://cloud.githubusercontent.com/assets/1736354/13130398/8ceff976-d61e-11e5-8ea7-08661eebb7af.png)

(1) cinder\scheduler\rpcapi.py（此步还属于cinder-api）
SchedulerAPI.create_volume函数会通过消息异步调用SchedulerManager.create_volume函数。
(2) cinder\scheduler\manager.py
SchedulerManager.create_volume函数，使用自己的flow来创建volume，其中还传入了Driver。
(3) cinder\scheduler\flows\create_volume.py
get_flow函数，创建ScheduleCreateVolumeTask
ScheduleCreateVolumeTask.execute函数，会调用driver_api.schedule_create_volume
(4) cinder\scheduler\filter_scheduler.py
FilterScheduler. schedule_create_volume函数，更新数据库，最后通过消息队列请求调用volume_rpcapi.create_volume。
#### 2.3    Cinder Volume

 ![create_volume](https://cloud.githubusercontent.com/assets/1736354/13130404/93c802e8-d61e-11e5-87e7-a01a64765a3b.png)
(1) /cinder/volume/rpcapi.py（此步还属于cinder-scheduler）
VolumeAPI.create_volume会通过消息队列远程调用VolumeManager.create_volume
(2) /cinder/volume/manager.py
VolumeManager函数也使用flow来创建volume，执行CreateVolumeFromSpecTask这个任务
(3) /cinder/volume/flows/manager/create_volume.py
CreateVolumeFromSpecTask.excute，这个函数会根据创建的不同类别，去创建卷，例如调用create_raw_volume，最终会调用具体的driver进行卷的创建。
在完成创卷后，CreateVolumeOnFinishTask这个任务，启动更新数据库，将卷更新为available状态。

我们可以看到在创建卷的过程中盘的状态会从“creating”状态变为“available”状态。
