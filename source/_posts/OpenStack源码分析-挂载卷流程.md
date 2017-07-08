title: "OpenStack源码分析-挂载卷流程"
date: 2016-03-05 00:32:58
tags:
  - Cinder
number: 48
---

### 1. 挂卷流程

![volume attach](https://cloud.githubusercontent.com/assets/1736354/13493796/5a1fda3a-e17b-11e5-98be-2bca8a26e0bb.png)
    当Nova volume-attach server volume执行后，主要经过以下几步：
a.  Nova Client解析指令，通过RESTFUL接口访问nova-api；
b.  Nova API解析响应请求获取虚拟机的基本信息，然后向cinder-api发出请求保留，并向nova-compute发送RPC异步调用请求卷挂载；
c.  Nova-compute向cinder-api初始化信息，并根据初始化连接调用Libvirt的接口完成挂卷流程；
d.  进而调用cinder-volume获取连接，获取了连接后，通过RESTFUL请求cinder-api进行数据库更新操作。

<!--more-->
### 2. 源码详解

![nova volume attach](https://cloud.githubusercontent.com/assets/1736354/13482134/b76e1680-e125-11e5-80d6-1e0f925fca48.png)
#### 1. Nova Client

(1) \nova\nova\api\openstack\compute\contrib\volumes.py
在Nova Client进程中，由VolumeAttachmentController接受挂载请求
#### 2. Nova API

(1) \nova\nova\compute\api.py
VolumeAttachmentController的create函数用于响应卷挂载的请求。
(2) \nova\nova\volume\cinder.py
compute.API调用attach_volume函数，分别获取卷信息、检查状态并做保留盘操作
(3) \nova\nova\compute\rpcapi.py
通过attach_colume发送rpc调用Compute中的_attach_volume函数
#### 3. Nova Compute

(1) \nova\nova\compute\manager.py
ComputeManager进行核心调用，首先获取initiator，然后初始化连接。
(2) \nova\nova\virt\block_device.py
DriverVolumeBlockDevice初始化连接后调用connect_volume函数进行卷的挂载
(3) \nova\nova\virt\libvirt\volume.py
LibvirtISCSIVolumeDriver的connect_volume是调用最核心流程，分为多路径和单路径两种情况，在单路径的调用中会执行login、检查session、设置自启动等操作，如果一次未连接成功则还会每tries *\* 2秒重复调用，直到达到调用的限制。其中牵扯到的指令有：
a. 尝试连接
iscsiadm -m node -T target_iqn -p target_protal
b. 连接失败重新建立连接
iscsiadm -m node -T target_iqn -p target_protal -op new
iscsiadm -m node -T target_iqn -p target_protal --op update -n node.session.auth.authmethod -v auth_method
iscsiadm -m node -T target_iqn -p target_protal --op update -n node.session.auth.username -v auth_username
iscsiadm -m node -T target_iqn -p target_protal --op update -n node.session.auth.password -v auth_password
c. 检查session，登陆
iscsiadm -m session检查是否登录成功
iscsiadm –m node –T targetname –p ip --login 登陆建立session
d. 设置为随机器启动而启动
iscsiadm -m node -T target_iqn -p target_protal --op update -n node.startup -v automatic
iscsiadm -m node -T target_iqn -p target_protal –rescan
#### 4. Cinder API

(1) \cinder\cinder\volume\api.py
volume.API会继续调用VolumeAPI进行挂卷的数据库更新
(2) \cinder\cinder\volume\rpcapi.py
VolumeAPI通过rpc调用VolumeManager
#### 5. Cinder Volume

\cinder\cinder\volume\manager.py
VolumeManager会完成更新数据库的操作。

http://aspirer.wang/?p=164
