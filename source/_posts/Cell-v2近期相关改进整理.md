title: Cell v2近期相关改进整理
tags:
  - Nova
  - OpenStack
number: 72
date: 2018-06-06 16:49:46
---

### Handling a down cell
https://review.openstack.org/#/c/557369
在某个cell挂掉的时候，会影响跨Cell的查询、计算Quota等操作。在这个BP中提到了几个场景：
1. nova list在一个Cell挂的时候，也需要能正常工作。在当前租户Cell没挂时，没影响，挂掉的话，需要构造一些数据（从api拿一些，然后剩下信息填UNKNOW）
2. nova service-list在一个Cell挂的时候，也需要能正常工作。也是通过构造解决。
3. nova boot，短期解决方案是如果project有其他虚拟机在挂掉的cell不能创建虚拟机，长期解决方案是通过Placement计算quota和usage。