title: Nova Scheduler Team Meeting跟踪（一月）
tags:
  - Nova
  - OpenStack
number: 66
date: 2018-02-01 20:32:51
---

从今年开始，要细度每次的Nova Meeting了，确实对于整体把握整体社区某个领域的进度非常有用。我是这样设想的，按月汇总，每次一篇文章，包含以下几部分
1. **记录**。按照meeting日期，记录主要内容
2. **总结**。总结每次meeting的每次内容，简短的一句话或者一段话，避免流水账
3. **TODO**。每次meeting不一定能完全理解，把他们记录下来，学习后闭环。

# 1. 会议记录
## 2018年1月8日
2018年的第一个team meeting，我们可以看到重点的工作还是在Nested Resource Provider这个BP，在这个时间，大家还是希望能够把Nested Resource Provider这个BP在Queens版本完成。
### (1) Feature讨论
#### 1. Nested Resource Provider
* @2uasimojo(efried) 正在完成ComputeDriver.update_provider_tree() https://review.openstack.org/#/c/521685/
* @jaypipes 正在完成GET /allocation_candidates部分 https://review.openstack.org/#/c/531443/
@bauzas 表示Xen可能是Nested Resource Provider最棒的目标用户。

@jaypipes 
* 目前NRP的目标还是Queens版本完成，可以把NRP的report部分、candidates部分、xen作为client/consumer在Queens完成
* 而NUMA/PCI部分的工作，估计搞不定，所以意味着我们在Queens还是需要PciPassthroughFilter及NUMATopologyFilter
* driver consumption的工作会在Queens完成，包括driver通过update_provider_tree来上报信息给RP，也包括了从scheduler中基于allocation来做设备的创建和分配。

#### 2. Alternate hosts
解决了一个[bug/1741125 Instance resize intermittently fails when rescheduling](https://launchpad.net/bugs/1741125)
https://review.openstack.org/#/c/531022/

#### 3. limit on allocation_candidates
dansmith增加了一个CONF.scheduler.max_placement_results，用于限制每次备选节点的请求，默认1000
https://review.openstack.org/#/c/531517/

### (2) Open discussion
#### 关于Resource Provider的genration id的讨论。
在随后的开放讨论中，由于Resource Provider的aggregate信息在更新时，会有在不同节点上的多个请求并发进行更新的问题，我们需要一种方案去解决race conditions。是的，就是我们在 #65 提到的方法。

@2uasimojo(efried) 提到，这种方案并不是进程或者线程的锁，建议按照原来的实现，给更新RP的aggregate加上genration id，用于解决并发下的竞态更新问题。
即在PUT的时候，用户需要传入genration id，这个id就是Get时候的genration id。这种方案看似有点土，我更新个字段还得自己传genration，太不方便了。
但是，却是一种很好的方法来解决从Get直到PUT入库中间的竞争。
大家对这点，达成了一致，另外，我们在更新rp的aggregate的时候，仅更新正更新的rp的generation，而不需要更新aggregate中其他rp的genration。

最终，决定让 @cdent 去做generations-on-aggregate placement microversion相关的patch。

#### 关于conflict 409后重试机制的讨论
@2uasimojo(efried) 提出了这个问题，对于409的处理，一直不是很清晰，因为我们重试的时候，不知道到底应该是仅仅重试之前的操作，还是说再看看这个数据是不是已经更新之类的。

@jaypipes 说，发生409后，更新的调用者，需要回答一个问题“OK，我们需要更新的东西已经变了，在我进行重试时，检查一下我想要更新的东西是否已经更新过了”，所有的generation变化，只是表达了“something changed”，而不是“this thins changed”。所以在我们进行409的重试时，我们需要重读下所有的provider信息（比如traits、inventory等），然后检查下，我们想更新的东西是否已经存在了，如果是这样的话，我们什么都不做，如果没有，我们需要重新的调用update/set。
这个想要更新的状态取决于virt driver，和他希望做什么。（比如更新inventory和traits肯定是不一样的）。
总结来说，就是我们最初的设计：client-driven state retries，而不是傻傻的重试。

本次Meeting总的来说还是充满干货的，尤其是对generation和409重试的讨论。

## 2018年1月15日
### (1) Feature讨论
#### 1. Nested Resource Providers
NRP的进度没有太大进展，目前包含update_provider_tree和GET /allocation_candidates两部分内容。
#### 2. Granular resource requests
这个是为了支持用户进行复杂资源请求的bp，最近会专门写一个文章记录一下其实现。
#### 3. Alternate Hosts
目前这个特性基本完成了，相关Patch：
[patch/526436](https://review.openstack.org/#/c/526436) Change compute RPC to use alternates for resize
### (2) Bug讨论
[bug/1743120](https://bugs.launchpad.net/nova/+bug/1743120): placement inadvertently imports many python modules it does not need
这个bug主要是说Placement导入了很多不需要的模块，主要是和Nova耦合太近，不利于后面拆分，并且直接使用Nova的也不够简洁。所以，清理、化简，保持干净。
### Open discussion
#### ProviderTree accessors 
Patch在这里：https://review.openstack.org/#/c/533244
主要为了对比ComputeDriver.update_provider_tree和缓存在report client的ProviderTree的变化。抽象出来了一个结构ProviderData，专门来返回数据。

总的来说，本次Meeting的讨论内容较少，集中在Nested Resource Provider上面。


## 2018年1月22日
重要事件：1月25日，Queens版本的Feature Freeze即将到来。
### (1) Feature讨论
#### 1. Nested Resource Providers
目前还是包括update_provider_tree series和Nested RP selection两部分。update_provider_tree series接近完成了（不包括resource tracker端到端的上报），Nested RP selection，会推到Rocky版本。
#### 2. Request Traits in Nova
Nova中支持请求traits，另外这个请求也额外的提到了Granular resource requests特性，有部分功能是重合的，后续分析Granular resource requests时候，重点关注下。
#### 3. Use alternate hosts for resize
Alternate hosts这个bp已经基本完成，后续也需要学习下。

### (2) Bug讨论
#### Remove microversion fallback code from report client
https://review.openstack.org/#/c/528794/ 在Queens版本，nova默认支持1.14了，所以移除了一些之前版本的兼容代码。


## 2018年1月29日
### (1) Feature讨论
#### 1. Nested Resource Providers
Provider Tree series部分的工作已完成，https://review.openstack.org/#/c/533808/
 First provider tree patch in progress： https://review.openstack.org/#/c/537648/ 这部分是端到端的从resource tracker中调用driver的update tree，应该会推到Rocky去做
Nested RP traits selection: https://review.openstack.org/#/c/531899/ 没有什么进展
从开放讨论中，@efried 提到，想要端到端的使用NRP，需要完成三部分：a. Resource Tracker刷新update_provider_tree b. jaypieps的NRP in alloc cands c. driver实现update_provider_tree。这三项工作，都没有在Queens完成，不过都比较接近完成了。

#### 2. Singular request group traits 
基本完成
#### 3. Granular resource requests
完整实现推迟到Queens版本，https://review.openstack.org/#/c/517757/
#### 4. Use alternate hosts for resize
https://review.openstack.org/#/c/537614/ 已经merge，至此，已经可以支持resize时候的alternate hostsl了

### (2) 开放讨论
#### 1. Idea for a simple way to expose compute driver capabilities in the REST API
http://lists.openstack.org/pipermail/openstack-dev/2018-January/126653.html Matt提出希望用一种简单方法保持driver的兼容

# 2. TODO
1. 了解Idea for a simple way to expose compute driver capabilities in the REST API详细内容
2. Granular resource requests分析
3.  Alternate hosts分析
4. Nested Resource Provider分析