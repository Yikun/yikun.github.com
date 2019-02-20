title: Nova Scheduler Team Meeting跟踪（三月）
tags:
  - Nova
  - OpenStack
number: 68
date: 2018-03-31 10:26:13
---

## 2018年3月5日
PTG刚开完，没什么太多的事儿，jaypipes说了几点：
1. jaypipes会发一个recap总结下R版本的重点
http://lists.openstack.org/pipermail/openstack-dev/2018-March/128041.html
2. 最开始的3-4周，都会集中在update_provider_tree系列的patch落地
3. 在Resource tracker刷新额外traits的合并问题需要讨论，可以在update-provider-tree完成之后去做

## 2018年3月5日
### Feature讨论
1. Support traits in Glance https://review.openstack.org/#/c/541507/
2. Add placement-req-filter spec https://review.openstack.org/#/c/544585/
这是调度流程的一个很大变化，这个BP源自CERN从v1升v2的一个需求，最开始CERN用的是Cell v1规模挺大，大概有上万个计算节点，原来的用法是：
第一级调度：一个租户映射到指定的特定Cell中，一般一个Cell中也会把特殊硬件的计算节点集中起来，第二级调度：这样在Cell v1中通过租户找到的Cell，然后剩余的节点就不多了，然后进行第二级调度，调度在Cell内压力就小多了。
但是目前Placement是一个全局的，并不能感知到Cell，也就是说最差情况，Placement过滤得不好，可能导致真正Scheduler的时候，有上万的节点，所以，就在Placment前面加了一个步骤Pre filter。目前的作用就是，把Placement做不到的，自定义程度很高的Filter放到这里来。
3. Forbidden Traits https://review.openstack.org/#/c/548915/
required里面通过叹号来表示不想要某种traits
4. Support default allocation ratios https://review.openstack.org/#/c/552105/