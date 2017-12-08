title: OpenStack Nova虚拟机冷迁移流程解析
tags:
  - Nova
  - OpenStack
number: 58
date: 2017-10-11 16:36:09
---

### 1. 概述
虚拟机冷迁移由于当用户想把虚拟机从一个计算节点移动到其他节点。主要涉及的命令如下：
```Shell
$ nova migrate server_id
$ nova resize-confirm server_id
```

看到后是不是觉得有点奇怪为啥migrate之后，还要resize-confirm？resize操作其实和migrate操作比较类似，不同的是迁移前后的flavor不一样。一般情况下resize的场景是，对虚拟机进行扩容，把flavor调大之类的。所以，在代码级别，nova也将两个流程合一了。migrate就是一个没有flavor变化的resize。

### 2. 核心流程
下图是虚拟机冷迁移时，涉及的组件交互：
![instance migrate overview](https://user-images.githubusercontent.com/1736354/31429902-dd65687a-aea1-11e7-9209-06c37a09fe4b.png)
我们可以看到，在迁移时，主要流程包括调度、迁移准备、迁移、完成迁移。
1. 调度。conducotr通过select_destination访问Scheduler进行**调度**，最终选择一个可用的目的节点；
2. prep_resize阶段，迁移准备。在目的主机上进行一些检查，比如是否支持相同节点迁移、虚拟机的主机等检查。然后，生成了一个resize claim（不是真正的claim，目前看这个只是刷新的resource tracker的一些数据），并在Placment刷新了inventory信息。
3. resize_instance阶段，在源节点把网络、磁盘之类的断掉，并且将数据复制到目的节点；
4. 迁移结束。在目的节点配置网络、挂卷，启动虚拟机；
5. (resize-confirm)确认迁移。使用nova resize-confirm确认删除，把原来网络断掉，并完成源虚拟机数据及中间虚拟机数据的清空。

具体细节，包括迁移的状态变化，如下图所示：
![2 instance migrate](https://user-images.githubusercontent.com/1736354/31435001-ace4c0a6-aeb0-11e7-99b9-c414411b7eaa.png)
