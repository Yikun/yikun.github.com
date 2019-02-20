title: '[译] An Update on the Placement API and Scheduler plans for Queens'
tags:
  - Nova
  - OpenStack
number: 59
date: 2017-10-25 14:10:07
---

原文链接：https://github.com/jaypipes/articles/blob/master/openstack/placement-queens-update.md

这篇文章主要讲了在过去几个版本中，OpenStack社区对于Nova调度及Placement服务相关工作的更新进展。我也会着重介绍一些我们在Q版本中主要处理的几个BP，同时也介绍了未来重点工作的路标，我们会在未来的几个release中完成它们。

<!--more-->

### 1. 过去版本完成情况的总结
Placement API已经在OpenStack的N版本成为一个独立的API endpoint。

Placement API将存量记录(tracking inventory)、资源消耗(resource consumption)、资源的分组和共享(grouping and sharing of resources)以及表示资源所具能力字符串标签（string capability tags, traits）这些数据暴露出来。

从那之后，社区持续地改进API，并且在Nova中更进一步地进行集成。

在Newton版本，主要是让nova-compute正确地对本地的资源进行盘点，然后把这些inventory记录送到Placement API中。

在Ocata版本，我们开始将nova-scheduler服务与Placement API进行集成。我们在scheduler进行了一些修改，使用Placement API进行满足一些基本资源请求条件的计算节点过滤。我们也添加了aggregates，来提供resource provider的分组机制。

在Pike版本，我们主要将资源claim这个步骤从nova-compute移动到nova-scheduler中。做这个事主要有2个原因：一个是性能/扩展以及和Cells V2架构适配。在"候选主机列表及cell中重试"一节中，进行了详细介绍。

### 2. Queens版本的优先级
在丹佛的PTG中，Nova社区团队决定了在调度和资源placment功能中3个主要的工作：
1. 妥当地处理迁移操作
2. 在多cell中的备选主机列表及重试操作
3. 嵌套的resource provider

应该指出的是，我们理解在这个领域仍然有许多许多的新功能需求，一些已经在我们的“雷达”中很多年了。我们承认当一些管理员或者一些潜在的用户看到一些长时间存在的问题或者工作并没有出现在Queens版本的高优先级列表中，会有点沮丧。然而，core团队实际能够review的东西是有限的，所以我们必须做这些决策。当然，我们也非常欢迎大家在PTG和邮件列表里来讨论这些决策。

另外一个应该指出的是，尽管在Q版本的scheduler和resource placement领域中，仅有这3个高优先级工作，但这并不意味着其他的工作不能被review或者推进。这个仅代表core团队将重点review这些领域的patch。

### 3. 正确的处理移动操作
我们在Q版本第一优先级需要处理的是做与placement API相关的move操作（比如migrate、resize、evacuate、unshelve等）的收尾及测试用例的全覆盖。

在Pike版本所剩时间不多时，Balasz Gibizer、Dan Smith和Matt Riedemann发现了一系列问题：在做Nova支持的各种各样的move操作时，资源应该如何在Placement API中记录。在Pike版本的时候，我们开始在nova-scheduler服务里进行资源的claim。很显然我们也需要在move操作的时候进行claim处理。在最初版本的实现，在虚拟机迁移的过程中，我们为虚拟机创建了一个成对的allocation，源节点和目的节点的资源都会占用一条allocation记录。这样做，可以工作，但是这个方案明显有弊端，尤其是在我们在同节点进行resize的操作。

这产生了一系列关于在迁移时产生错误的或者丢了一些allocation记录的问题，我们需要在resource tracker和compute manger中，塞了很多不优雅的代码，来处理在滚动升级中新的conductor和scheduler服务的兼容，并且旧的计算节点也写入了不正确的记录。

Dan Smith也提出了一个解决在迁移操作中记录allocation问题的方法[migration-allocations](http://specs.openstack.org/openstack/nova-specs/specs/queens/approved/migration-allocations.html)，但是因为时间问题，我们没办法在Pike版本实现。

在Queens版本，我们需要优选Dan的解决方案，即在迁移之前，在allocation记录中，将源节点的UUID替换为迁移object自己的UUID。这样允许目的节点使用虚拟机的UUID来占用allocation，一旦迁移成功，我们便可仅仅删除被migration UUID消费的allocation就行了。再也不用受双倍的allcations困扰了。

### 4. 候选主机列表及cell中重试

第二优先级的事情是，我们应该在Cells V2部署中支持创建虚拟机请求的重试能力。

上面，我已经说过了，将资源claim的过程从compute移动到scheduler中，有两个原因，让我们来仔细讨论一下。

首先，现在的版本存在一个问题：2个scheduler进程为2个虚拟机选择同一个host时，当启动虚拟机先第一个host启动完成时，消耗了host的最后一点资源。然后，不幸的第2个启动进程，必须进行重新调度流程。这个流程有点太重了，sheduler必须通过通过RPC来为虚拟机获取一个新的目的节点，然后许多状态都需要通过request spec来传递。补充一下，并没有什么能够确保新的节点就一定可用，可能同样的命运将降临，再一次触发了重试。

在nova-scheduler代替目的计算节点来进行资源claim操作，意味着我们可以显著的减少在compute节点进行claim的时间和复杂性（造成重试操作的主要原因是在计算节点claim资源的竞争和竞态条件）

现在我们尝试在scheduler服务选择目标主机的时候，进行资源的claim操作。如果Placment API返回200 OK，我们就知道虚拟机已经在目的节点已经占用了这个资源，唯一可能造成重试的操作就是某些不正常的主机失败，即不是常见的失败原因。如果Placement API返回409冲突，我们可以从返回的error中看到失败原因，到底是因为并发刷新失败了，还是说目的节点确实没有足够的空间来容纳虚拟机。

如果另外的进程在目标主机完成资源claim的时间介于虚拟机调度选择和尝试claim资源之间，我们会简单的重试（在scheduler代码的小循环）尝试在目的主机claim资源。如果目的主机资源耗尽了，scheduler会选择另外的目的主机。我们完成这些时，不会启动的请求发送到目标的compute主机。

我们将资源的claim移动到scheduler的第二个原因，是因为Cells V2架构。再次说明，Cells V2架构移除了独立分离又略显奇葩的Cells V1旧代码。单单使用的Cells V2 API控制面，意味着能够更简单也更容易地进行代码维护。

然而，Cells V2设计架构的一个原则是一个启动（或者移动）虚拟机请求会获取到目标的cell，他没有向上调用的能力与API层进行通信。这对于我们目前的重试机制来说是一个问题。当前的重试机制依靠失败的计算节点来初始化资源的claim，并且能够反向调用scheduler，来找到另外的host进行虚拟机的启动。

Ed Leafe正在Quees版本努力，让scheduler从API/Scheduler传递一系列备选主机和allocation到目标的cell。这个备选主机和allocation信息，将会被cell的conducotr用来去那些备选的目的节点去重试，虚拟机资源的claim依靠备选host，无需访问上层的API/Scheduler。

### 5. 嵌套的resource providers
第三优先级的事情是我们称之为"嵌套的resource providers"的东西。

例如，NUMA Cells和包含它的主机，SR-IOV网卡功能和包含它的主机，物理GPU组和包含它的主机。

让我们举个2个计算节点的例子，2个节点每个都含有2个SR-IOV网卡。第一个计算节点每个网卡都有8个虚拟机网卡，第二个计算节点其中的一个物理网卡被标记为直通的（意味着用户能够全面掌控）另外一个网卡则被指为8个虚拟机网卡，与第一个计算节点类似。

![nested-resource-providers-advanced-topo](https://user-images.githubusercontent.com/1736354/32042485-4af9dfd2-ba6a-11e7-8d3c-121ff9945bfa.png)

目前，Placement API无法理解父子provider这层关系。嵌套的resource provider这个spec和patch让Placement服务能够感知到这些，也允许用户区分子资源provider的父资源provider的UUID。

嵌套的resource provider开启了一系列的功能，包括PCI设备、高级网络、NUMA等的支持。正因如此，我们将共享的resource provider在Q版本放在了相对来说不重要的位置，然后更专注实现基本的嵌套resource provider，至少支持SR-IOV物理功能和虚拟功能的关系。

### 6. Queens其他的工作事项
除了上面的优先级事项，我们也将投入精力去做其他的一些事物。尽管review将专注在上述的优先级高的事物中，我们也将在下述的几个方面尽可能地进行review。

#### (1) 完成trait-flavor
这个是从Pike版本开始出现需要完成的工作。Placement API现在支持traits列表，简单的tags字符串来描述一个resource provider的能力。

然而，一些地方仍然需要编码完成。
* Flavor中需要包含需要的traits列表
* Scheduler需要向Placement API过滤那些某个flavor要求的所有traits的providers
* Virt drivers需要开始上报traits给计算节点的resource provider，来取代之前上报一个无结构的virt-driver-specific在virt driver的get_available_resource。

#### (2) Ironic virt driver的traits处理
如上面提到的，virt driver需要开始上报traits信息给计算节点的resource provider。然而，ironic driver有点不同，因为他处理了多个计算节点的resource provider记录（有一个resource provider记录着部署的每个Ironic裸机节点）

Jhon Garbutt在主要负责Ironic API支持在virt driver中上报traits。

#### (3) 在Placement API中缓存header处理
Chris Dent提出了在Placement API中的一些资源endpoints增加"Last-Modified"和其他的HTTP头部。确保在cahcing代理下的正确行为非常重要，并且完成这项工作的工作量似乎是可以控制的。

#### (4) 在Placement API中支持POST多个allocations
这个spec实际上是为了move操作的清理而开启的。Chris提出允许PORST /allocations调用（我们目前支持PUT /allocations/{consumer_uuid}调用）来支持在一个请求中写入多个consumers的多条allocation记录。这个将允许我们完成allocation从instance到migrations UUID的转换，这个是Dan Smith做move操作资源跟踪方案的一部分。

#### (5) 初步支持vGPU
尽管这个不像从Citrix的Jianghua Wang提出的spec来完全实现vGPU，在Queens版本，我们仍将尝试至少完成vGPU资源的基本支持。

基础的支持意味着可能不会支持多GPU类型或者pGPU池（换句话说，仅支持每个计算节点的VGPU有一个单一的inventory记录）。

### 7. Beyond Queens
#### (1) 一个通用的设备管理
Eric Fried和我正在讨论一个generic device manager，将会在一寸的nova/pci模块中替换很多代码。我们可能最早在Rocky版本完成。

#### (2) 支持NUMA

尽管嵌套的resource provider是为NUMA拓扑设计的，实际上，想要能够通过Placment API同等功能的把NUMATopologyFilter在Nova scheduler取代，仍然还有很长时间，可能在Rokcy版本吧。

在Nova支持NUMA的实现与支持大页内存、CPU pining、模拟IO线程pinning甚至是PCI设备管理（比如PCI设备的NUMA亲和性）是强耦合的。

似乎在可以看到的将来，NUMATopologyFilter仍然在Nova Scheduler保留，作为一个复杂自定义的调度failer/weigher，我们会慢慢的修改virt driver接口和resource tracker在nova-compute节点向Placement API上报NUMA cells信息作为resource provider。渐渐地通过查询Plament database来替换一些NUMATopologyFilter的功能。

#### (3) 共享的resource provider
Placement API允许resource provider通过aggregate关联来和其他provider来共享资源。这些reousrce provider我们称之为"shared resource providers"，尽管使用"sharing resource providers"更能合适地表达其目标。

我们需要为共享存储和路由网络IP池的用力完成和增加一些功能测试，确保资源上报和跟踪正确的完成。
