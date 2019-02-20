title: Nova Scheduler Team Meeting跟踪（二月）
tags:
  - Nova
  - OpenStack
number: 67
date: 2018-02-07 18:40:58
---

# 1. 会议记录
## 2018年2月5日

### (1) Feature讨论
目前已经Freature Freeze了，因此，对于BP来说，没有什么太多更新了，只是简单的罗列了下相关的Patch。
**Provider Tree series** starting with: https://review.openstack.org/#/c/537648/
**Nested RP traits selection**: https://review.openstack.org/#/c/531899/
目前，Nested RP的这2部分工作也不会在Queens版本合入了，会推迟到Rocky。

**Granular resource requests review**: https://review.openstack.org/#/c/517757/
resource和requeired分组的支持，API部分的PatchQueens版本未完成。

**Remove microversion fallback**:https://review.openstack.org/#/c/528794/
由于目前Queens已经使用1.14作为默认的microversion，因此，对于之前的一些兼容版本不会再使用了，所以对之前的兼容代码进行了清理。

**Use alternate hosts for resize**:https://review.openstack.org/#/c/537614/
Alternate hosts已合入，上面是补了一些test case

### (2) Bug讨论
#### 1. Generation及重试问题
**Add generation support in aggregate association** https://review.openstack.org/#/c/540447/
没有什么新的bug了，在之前讨论的aggregate相关的API增加generation的问题，cdent提了一个BP，会在Rocky版本完成。
**placement server needs to retry allocations, server-side** https://bugs.launchpad.net/nova/+bug/1719933
对于并发更新时的重试问题，还是有一些讨论，
@edleafe 认为，对于一些场景，请求aloocation时，用户认为有足够容量呀，不能够失败。
@jaypipes还是原来的意见：
> it should "fail" in so much as a 409 Conflict is returned and allows the caller to retry if it wants.

也就是说，409肯定是要失败，重试的事情需要调用他的人来做。
当然，也会在PTG讨论下，generation到底怎么样去使用和暴露。已经把这个问题记到[nova-ptg-rocky](https://etherpad.openstack.org/p/nova-ptg-rocky)：Do we have a concurrency problem with PUT /allocations/{consumer_uuid} and/or POST /allocations ?

### (3) 开放讨论
Placement queens summary https://anticdent.org/placement-queens-summary.html
Placement extraction https://anticdent.org/placement-extraction.html
#### 关于将Placement抽离
@cdent 完成了两篇文章，一个是queens版本的placement总结，另外一个是cdent做的，关于将Placement从Nova抽离出来的一些工作。
关于将Placement抽离出来，大家发表了自己的看法：
@cdent 他认为，较早的把Placement分离出来，对于Placement和Nova来说都好，目前抽离的工作量比较小，好分离，另外，目前Nova投入的大量的时间和优先级放在Placement相关的事务上，分离出来，对Nova好一些。
@bauzas 不太同意现在去分离，他主要是担心Nova和Placement分离后，有点难协调。

## 2018年2月12日

### (1) Feature讨论
目前的Feature的讨论，已经开始Rocky版本的了。
#### 1. Support traits in Glance
https://review.openstack.org/#/c/541507/
这个BP主要是希望为Glance增加Traits支持，在Glance的Properties中，增加类似"trait:HW_CPU_X86_AVX2=required", "trait:CUSTOM_TRUSTED_HOST=required"的支持，让Placement调度的时候支持。

#### 2. Resource Class Affinity Spec
https://review.openstack.org/543062
efried写的一个bp，看名字知其意，调度的时候考虑Resouce Class的亲和。

### (2) bug讨论
**Handle volume-backed instances in IsolatedHostsFilter**：https://review.openstack.org/#/q/topic:bug/1746483+(status:open+OR+status:merged)
Matt发现了一个Filter的问题，主要是对volume-backed的情况进行一些异常处理。在Scheduler会议中，已经很久没有讨论过非Placement的问题。- -!

### (3) 开放讨论
**Add optional healthcheck middleware** https://review.openstack.org/#/c/542992/
一个用于健康检查的midleware，对于API服务挺有用，尤其是对于LB场景下的检查活跃来说。
Feature的spec在这里：https://review.openstack.org/#/c/531456/

## 2018年2月19日
### (1) Feature讨论
Glance image traits https://review.openstack.org/#/c/541507/
Resource class的亲和性 至少到S版本才会落（包括在Placement中支持NUMA亲和），优先级不高，提了下Placement RBAC的需求(Policy/RBAC support in Placement REST API)可能会更高一些。
update provider tree的优先级很高解决了很多问题

### (2) Bug讨论
**Placement returns 503 when Keystone is down** https://bugs.launchpad.net/nova/+bug/1749797
Keystone挂的时候，Placement会返回一个503，这个问题最后是在keystone middleware里面加了一些detail信息: https://review.openstack.org/546108

### (3)开放讨论
**调度失败的"Nova valid host"足够了吗？**
@arvindn05 这哥们提到在虚拟机调度的时候，我们仅仅返回了"no valid host"，为啥不503一个，然后返回为啥调度失败。
@edleafe 说了2点，503肯定不合适，错误是用户，不是系统。详细信息不显示是因为不想把底层的硬件架构拓扑之类的信息暴露给用户。管理员可以通过日志之类的看到失败原因。
