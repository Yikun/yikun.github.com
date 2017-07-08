title: "OpenStack源码分析-Service启动流程"
date: 2016-03-05 00:38:21
tags:
  - Cinder
  - OpenStack
number: 49
---

![cinder service launcher](https://cloud.githubusercontent.com/assets/1736354/13372372/d42f0c0a-dd7b-11e5-9656-1f2ff817e53a.png)

<!--more-->

如图所示，主要流程分为两大部分：
1.  创建Service
service.Service.create方法实现了这个过程。在创建服务的过程中，会根据host、binary、manager来创建服务，对于cinder-volume，则为cinder.service。
2.  启动Service
launcher.launch_service会将第一步创建的服务启动起来，然后调用_start_child方法。
在_start_child方法中，会调用os.fork接口创建子进程，创建的进程数由launch_service的workers参数确定，目前默认为1个进程。
在子进程启动后，调用_child_process进行服务启动，调用common中的launch_service，此过程主要将service添加到线程池中，并启动。在启动时，会回调run_service进而调用Service.start方法。
Service正是cinder.service在此步中，会调用manager的init_host完成卷状态的检查。

参考资料：
http://blog.csdn.net/hackerain/article/details/7888686
http://www.openstack.cn/?p=437
http://lynnkong.iteye.com/blog/1829960
http://docs.openstack.org/developer/nova/services.html
http://www.cnblogs.com/sammyliu/p/4272611.html
http://www.cnblogs.com/littlebugfish/p/4022907.html
