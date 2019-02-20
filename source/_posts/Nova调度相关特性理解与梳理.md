title: Nova调度相关特性理解与梳理
tags:
  - Nova
  - OpenStack
number: 61
date: 2017-12-06 09:41:11
---

准备拿这篇文章梳理下OpenStack Nova调度相关的特性，由于目前Placement的引入，说起调度，和这个组件是分不开的，所以本文也可以看做是Placement的一个历史特性的梳理。第一阶段会按照版本，先把调度相关的BP过一遍，然后再通过理解和使用加强理解。好吧，我承认又开了一个系列的坑，话不多说，开始！

<!--more-->

## Liberty版本
L版本特性列表：[链接](https://blueprints.launchpad.net/nova/liberty)
https://blueprints.launchpad.net/nova/+spec/request-spec-object
https://blueprints.launchpad.net/nova/+spec/request-spec-object-mitaka

## Mitaka版本
根据[M版本特性优先级](https://specs.openstack.org/openstack/nova-specs/priorities/mitaka-priorities.html)的信息，我们看到M版本规划的工作还是围绕着request spec和object来展开的。在[M版本特性列表](https://blueprints.launchpad.net/nova/mitaka)中，我们可以看到确实重点还是在request spec的完善，其中虽然Inventory的拆分在这个版本提出，但是最终没有被完全实现，而是拖延到了N版本才完成。

### Add concept of resource classes 
Link: [bp/resource-classes](https://blueprints.launchpad.net/nova/+spec/resource-classes)

原来我们增加某种资源的时候，都需要给instance的object增加filed，每一次改变，都要刷一下db shema，或是增加filed或是增加整个table，也就是说新增一种类型的支持，管理员就要把数据库也升级，这意味着会有业务中断，很不合理。
随着资源种类变多，这种方式有点臃肿，也不是很优雅，在紧接着的generic resource pool的bp中，也亟需把资源抽象出来了。
因此，在M版本新增了一个Resource Class的object，用于记录虚拟机资源的类型，无论增加新的独立资源类型还是共享资源类型，都不需要再对db结构刷新了。
这个BP可以说是generic-resource-pools这个bp的基础，只有通过这种通用的方式将资源类型表征出来，才有可能将所有的资源都抽象出来。

## Newton版本
根据[N版本特性优先级](https://specs.openstack.org/openstack/nova-specs/priorities/newton-priorities.html#scheduler)来看，首次提到了要把Placement相关的东西独立出来，并且把cell数据库中的compute node的数据迁移到API DB的inventory和allocation中。因此，这个版本可以看做是Placement的元年。而从[N版本特性列表](https://blueprints.launchpad.net/nova/newton)中，我们看到了Placement所依赖的那些基础结构和模型均已在这个版本支持了。

### Add concept of generic resource pools
Link: [bp/generic-resource-pools](https://blueprints.launchpad.net/nova/+spec/generic-resource-pools)

这个是一个非常重要的BP，可以认为是Placement组件的初始BP，原先，compute node的理念，把计算的资源强行绑到某一个node上了，而实际上，存在着一些诸如共享资源的情况，可能多个计算节点共享着某些资源。
所以，Nova期望能够定义一种“通用的资源”模型。
我们可以看到几个在Placement的重要概念都有在这个BP提到。
Resource Provider：名释其意，资源提供者，结构比较简单，UUID和这个RP对应的一些基本信息，比如name之类的，资源提供的具体资源的存量和消耗量，通过UUID关联到其他表中。
Inventory：存量，用来记录资源的总量，并且记录着资源可分配的最大、最小、步长等信息。每个RP（比如计算节点）的每种资源（比如vcpu、内存等）都占一行。
Allocation：已分配量，用于记录某个RP（如计算节点）被某个消耗者（如虚拟机）

### Add concept of resource providers (partial)
Link: [bp/resource-providers](https://blueprints.launchpad.net/nova/+spec/resource-providers)

Resource Provider模型主要的目的就是为了把compute node这个模型替换掉。
原来Nova假设所有的资源都是通过单个计算节点提供的，所以所有的资源都通过compute node来记录，后面发现对于共享资源的这种场景比较棘手了。
所以，提出了通过RP这个新的模型准确的记录资源情况。

### Scheduler: Move inventory fields of compute node (continued)
Link: [bp/compute-node-inventory-newton](https://blueprints.launchpad.net/nova/+spec/compute-node-inventory-newton)

首次提出在mitaka版本，直到Newton版本才实现。
之前，nova是用compute node来记录计算节点上的资源，即一种资源都会有一列，比如vcpus、memory_mb、local_gb。
这样资源对应的所有资源的总量、已使用量、剩余量每个都占一列，所有的都揉在一起。
在我们增加资源类型的时候，需要加很多列，而且在进行资源更新的时候，都需要刷新compute node，而且这些更新是有锁的，效率很低。
这个BP先把总量信息Inventory抽出来了，其中有个字段是resource type，就是在resource class中实现的资源类型。
这样一来，增加一种新的资源类型时，数据库结构不会发生变化，只是增加了一条resource type不同的记录。
疑问：inventory在何时会被刷新，何时会被访问？

### Resource providers: Move allocation fields
Link: [bp/resource-providers-allocations](https://blueprints.launchpad.net/nova/+spec/resource-providers-allocations)
与Inventory类似，allocation也是compute node拆出来的，用来记录某个RP被某个消费者消费的记录。
疑问：allocation在何时会被刷新，何时会被访问？

可以看到，在Newton版本，Placement所依赖的基本能力（如Resource Provider、Inventory、Allocation等）均已经被支持了。

## Ocata版本

根据[O版本特性优先级](https://specs.openstack.org/openstack/nova-specs/priorities/ocata-priorities.html)，我们可以看到，调度统一放在了API Cell中的Conductor进行，而特意的将Resource Provider作为一个重要的环节，其中包括了调度的Placement接入、Aggregate支持以及自定义资源类型。从[O版本特性列表](https://blueprints.launchpad.net/nova/ocata)也可以看出，Ocata版本主要工作也是集中在Cell V2架构的调度能力及Resource Provider相关能力机制的补齐。

### Scheduling interaction for cells
Link: [bp/cells-scheduling-interaction](https://blueprints.launchpad.net/nova/+spec/cells-scheduling-interaction)
从O版本后，调度会在API Cell进行，这个BP在conductor中增加了schedule_and_build_instances方法，通过这个方法向指定的cell进行虚拟机创建。将API Cell和计算Cell分离，将调度层与计算层解耦。

### Resource Providers - Custom Resource Classes
Link: [bp/custom-resource-classes](https://blueprints.launchpad.net/nova/+spec/custom-resource-classes)

为Placement增加自定义Resource class的能力，之前仅支持基本的vCPU、内存、磁盘等基本的资源类型，这个BP增加了让用户自定义资源类型的能力，比如增加自定义的FPGA、裸机调度的能力。
增加了一个resource classes表，用于记录自定义的资源。并且增加了基本的CRUD接口，使用户可以增加、删除、修改、获取指定的resource class。

### Add concept of generic resource pools
Link: [bp/generic-resource-pools-ocata](https://blueprints.launchpad.net/nova/+spec/generic-resource-pools-ocata)

继续支持generic resource provider的基本能力，比如aggregate等。使用新的Placement及Resource tracker来对资源进行刷新和调度。

### Filter the list of ResourceProviders that match a request
Link: [bp/resource-providers-get-by-request](https://blueprints.launchpad.net/nova/+spec/resource-providers-get-by-request)

用户通过请求可以获取一个满足用户资源需求的Resource Provider的列表。

### Resource providers: Move scheduler filters to DB
Link: [bp/resource-providers-scheduler-db-filters](https://blueprints.launchpad.net/nova/+spec/resource-providers-scheduler-db-filters)

看着有点标题党的BP，把Filter全搞到DB了？实际上，只是在Filter&Weight之前，加入了Placement请求的流程，相当于先通过Placement进行过滤，然后再进行后续的Filter和Weight。
这个BP标志着我们的Placement真正开始工作了，在每次的虚拟机创建的流程中，都增加了和Placement交互的流程，在大规模部署的环境中，我们不用一个一个host来过滤了，先通过Placement搞一把，会把不满足条件的节点过滤掉很多，大幅度提升调度的性能。

### Use policies for authZ in placement API
Link: [bp/placement-api-policy-authz](https://blueprints.launchpad.net/nova/+spec/placement-api-policy-authz)

为Placement服务增加Policy机制。

## Pike版本
P版本特性列表：[链接](https://blueprints.launchpad.net/nova/pike)

### Placement Allocation Requests
Link: [bp/placement-allocation-requests](https://blueprints.launchpad.net/nova/+spec/placement-allocation-requests)

新增了一个allocation_candidates的接口，通过这个接口，支持用户请求资源，期待返回满足用户需求的resource provider。原来，在O版本的实现，仅支持返回单个的resource provider，这样对于共享及嵌套的rp有些问题，现在把这个接口增加后，使得用户可以进行更复杂的过滤。

### Scheduler claiming resources to the Placement API
Link: [bp/placement-claims](https://blueprints.launchpad.net/nova/+spec/placement-claims)

将资源claim的过程从compute移动到scheduler中，主要有2个考虑：其一是减少从调度成功到claim时的时间，从而降低重试的可能，因为从scheduler拿到这个可选的请求，再到compute node进行claim，消耗时间较长，在资源较为紧张的时候，并发请求有可能在scheduler是满足的，但是真正到compute时，已经被其他人消耗了；其二是为了适配Cell V2的架构，Cell V2中，子Cell不应该反向去调用scheduler，比如在重试的时候。在Q版本，会有一个“调度备选节点列表”，配合这个，减少调度重试的可能。

### Allow custom resource classes in flavor extra specs
Link: [bp/custom-resource-classes-in-flavors](https://blueprints.launchpad.net/nova/+spec/custom-resource-classes-in-flavors)

允许在Flavor中定义自定义的resource class，并在调度的流程中增加处理这个extra specs的能力。形式类似于`resources:$CUSTOM_RESOURCE_CLASS=$N`或者`resources:$STANDARD_RESOURCE_CLASS=0`。

### Resource providers: custom resource classes (Pike)
Link: [bp/custom-resource-classes-pike](https://blueprints.launchpad.net/nova/+spec/custom-resource-classes-pike)

继续完善自定义资源类型的能力。

### Add project/user association to placement
Link: [bp/placement-project-user](https://blueprints.launchpad.net/nova/+spec/placement-project-user)

为Placement增加project和user的过滤能力，仅获取某个租户或者用户的资源情况。bp完成后，用户可以直接通过project和user去拿资源可用情况了，底层会直接从数据库过滤，而不是像现在的，全拿到然后再从所有结果中去统计。

### Idempotent PUT resource class
Link: [bp/placement-put-resource-class](https://blueprints.launchpad.net/nova/+spec/placement-put-resource-class)
允许用户直接通过PUT来创建不存在的resource class，而不是先POST（创建）再PUT（更新）。