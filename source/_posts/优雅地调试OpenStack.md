title: "优雅地调试OpenStack"
date: 2016-02-23 00:00:52
tags:
  - OpenStack
---

恩，题目首先要起的高逼格一些。2333。

在前面学习代码的过程中，主要通过源码来学习，开始学起来确实有点费劲，因为欠缺对OpenStack的整体的意识，于是[搭建OpenStack开发环境](http://yikun.github.io/2016/02/10/搭建OpenStack开发环境/)对OpenStack的运行环境和使用有了初步认知。也看到了启动OpenStack后的一些相关进程，那么这些进程是如何与源码对应起来的呢？如何去调试OpenStack呢？本篇文章就讲下我的探索。

### 1. 初识Python调试
在[Python 代码调试技巧](https://www.ibm.com/developerworks/cn/linux/l-cn-pythondebugger/)一文中提到了pdb、PyCharm、PyDev、日志等几种常见的调试方法。具体可以看看这篇文章，写的很详细，不赘述。

因为PyCharm出色的用户体验（那写代码就是要开心嘛），所以决定使用PyCharm进行调试，但是问题来了，在远端（如虚拟机或者服务器）服务已经启动起来了，我们如何进行调试呢？答案就是Remote Debug。

### 2. 启动OpenStack服务
在[搭建OpenStack开发环境](http://yikun.github.io/2016/02/10/搭建OpenStack开发环境/)一文中，我们介绍了使用devstack启动开发环境，我们通过DevStack启动各个服务后：
```
# ... ...
This is your host IP address: 192.168.56.101
This is your host IPv6 address: ::1
Horizon is now available at http://192.168.56.101/dashboard
Keystone is serving at http://192.168.56.101:5000/
The default users are: admin and demo
The password: 1
```
使用screen来查看：
```
screen -x stack
```
不得不说screen真是神器，虚拟了多个Terminal的Tab，使用"Ctrl+A+P"和"Ctrl+A+N"可以切换tab，使用"Ctrl+A+D"可以断开连接，在每个tab中可以使用“Ctrl+C”来中断进程：
![qq20160223-0 2x](https://cloud.githubusercontent.com/assets/1736354/13224079/e3309ca4-d9c1-11e5-897a-04ed2b6c8e82.png)
我们看到在图中，有Nova和Cinder相关的进程，并且停在了cinder-api的进程上，每个tab中的进程都在运行着。

### 3. 编辑代码
因为代码大部分都在远端的运行（比如虚拟机），而开发环境则在近端（比如宿主机），如果在远端和近端都维护一套代码，不可避免的会拷来拷去，有时拷错了还得找半天原因。所以得想办法把远端的代码“共享”到近端。因此，我们使用sshfs共享文件：
```
➜  ~  sshfs stack@192.168.56.101:/opt/stack /Users/jiangyikun/development/openstack/code
➜  ~  ls /Users/jiangyikun/development/openstack/code
cinder            heat              logs              noVNC             requirements
data              heat-cfntools     neutron           nova              status
devstack.subunit  heat-templates    neutron-fwaas     os-apply-config   swift
dib-utils         horizon           neutron-lbaas     os-collect-config tempest
glance            keystone          neutron-vpnaas    os-refresh-config
```
达到的目的就是，我们编辑`/Users/jiangyikun/development/openstack/code`的时候，就相当于在远端编辑`/opt/stack`。在Windows下，也有win-sshfs工具。

### 4. 启动调试服务器
当我们修改好代码后，就可以进行调试了。调试的原理大致是在近端启动一个debug server，然后，在代码中添加连接服务器的动作，这样，当代码运行到那段调试代码时，便会和调试服务器建立连接。在我的实验环境中，调试环境是这样的：
![openstack](https://cloud.githubusercontent.com/assets/1736354/13257974/1042affa-da8c-11e5-99a0-882e5b229354.png)
可以看到在宿主机和虚拟机有2条通路，一条是NAT，作用是让虚拟机通过宿主机的公网IP上网，从而保证Devstack能够顺利启动OpenStack，第二条是Host Only，保证在宿主机内可以对虚拟机进行SSH访问、sshfs文件挂载以及调试。

因此我们先配置一下远程调试的配置：
![qq20160223-1 2x](https://cloud.githubusercontent.com/assets/1736354/13224336/fab25a06-d9c2-11e5-8547-b284fe7df997.png)

然后，我们就可以把由于几个调试的服务都启动起来了，例如，我们要调试跟踪Cinder的创建过程，我们就首先建立三个远程调试，其次将调试代码添加到入口处并保存，最后增加断点：
![qq20160223-2 2x](https://cloud.githubusercontent.com/assets/1736354/13224668/8e9949e0-d9c4-11e5-850f-357b0eaa41c1.png)
使用Ctrl+c把修改过代码的进程都结束，然后按“上”重新执行指令：
![qq20160223-3 2x](https://cloud.githubusercontent.com/assets/1736354/13224732/db14a4ea-d9c4-11e5-8e83-706b35f507f5.png)
重启服务后，代码就生效了，当代码运行到我们需要连接到调试服务的代码后，就会进入断点了：
![qq20160223-4 2x](https://cloud.githubusercontent.com/assets/1736354/13224833/4a55fed0-d9c5-11e5-8f60-38589e40c34c.png)
接下来就随心所欲的进行调试吧！

### 参考资料
[使用DEVSTACK搭建OPENSTACK可remote debug的开发测试环境](http://bingotree.cn/?p=687)
[DevStack-install-in-China](http://kiwik.github.io/openstack/2013/12/21/DevStack-install-in-China/)