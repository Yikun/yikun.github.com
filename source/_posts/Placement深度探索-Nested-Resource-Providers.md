title: '[Placement深度探索] Nested Resource Providers'
tags:
  - Nova
  - OpenStack
number: 64
date: 2017-12-26 16:33:42
---

## 1. 背景概述
顾名思义，Nested Resource Providers，即嵌套的资源提供者。在Ocata版本，这个[bp/nested-resource-providers](https://specs.openstack.org/openstack/nova-specs/specs/ocata/approved/nested-resource-providers.html)就被提出，主要是为了使用户可以定义不同的Resource Provider之间的层级关系（hierarchical relationship）。

我们知道，目前Placement的功能已初具雏形，我们可以记录系统中可数的资源的总数。一个Resource Provider有一系列不同资源种类的存量信息（Inventory），也通过已分配量（Allocation）信息来记录已使用量。通过Resource Provider/Inventory/Allocation这三个关键模型，我们就可以解决以下几个需求：

1.  **每个Resource Provider有多少某种类型的资源**？通过Invetory记录，例如某个主机VCPU的总量；
2.  **系统已经消耗了多少某种类型的资源**？通过Allocation记录，例如某个虚拟机消耗了1GB的内存；
3.  **每个Resource Provider为某种类型的资源提供多少超分配的能力**？通过Inventory的allocation_ratio字段来记录。

如下图所示，一个计算节点包含8个CPU，500GB硬盘，16GB内存，已使用3个CPU，3GB硬盘，2GB内存，这个计算节点所属高IO组，具备SSD的能力，抽象为Placement模型后，若下图所示：

![placement](https://user-images.githubusercontent.com/1736354/35139070-699e3be0-fd2c-11e7-8172-20f2cdb6671f.jpg)

计算节点对应Resource Provider（蓝色），其包含的某种类型资源的总量对应Inventory（紫色），资源的类型对应Resource Class（灰色），已使用量对应Allocation（绿色），所属的组对应Placement组（黄色），计算节点的特质对应Trait（橙色）。

在之前的实现中，对于RP之间的关系，也仅仅支持aggregate功能。例如，某个RP可以把自己的资源，通过aggregate将RP的资源共享给同一aggregate的其他RP。这一功能对于共享存储、共享IP池之类的业务是满足需求的，但是，对于类似父子的这种关系，是无法支持的。

例如，在NUMA场景下，我们不但需要将主机的内存和VCPU资源记录，同时也需要记录每个主机上的某个NUMA的资源总量及消耗情况，这个就属于父子关系。

## 2. 存在的问题
在[nested-resource-providers][1]中提到一场景：

[1]: https://etherpad.openstack.org/p/nested-resource-providers  "nested-resource-providers的etherpad"

> there are resource classes that represent a consumable entity that is within another consumable entity. An example of such a resource class is the amount of memory "local" to a particular NUMA cell.

就是说一些类型代表一种资源消费的实体，同时，包含了另外一种资源消费的实体。举个例子就是memory这种resource class，这个memory是属于某个NUMA的。让我们通过一个例子来看下这个问题。

在一些对性能或时延有苛刻要求的场景，我们通常希望一个虚拟机能够部署到某个NUMA上（一个主机通常含有多个NUMA CELL，注意这个CELL和我们在Nova中说的Cell V2不是一个含义，而是NUMA独有的名词）。假设我们已经创建了一个叫做“NUMA_MEMORY_MB”的资源类型，资源的总量是192GB。当我们希望将它创建到一个磁盘大小充足并且NUMA内存充足的主机上时，如果仅考虑这个主机上的总内存，可能会找到一个并不是我们期望的主机。我们必须考虑每个NUMA CELL中的内存是否充足。

![numa](https://user-images.githubusercontent.com/1736354/35147337-321bf046-fd49-11e7-8814-3f256b4d02ad.jpg)

如上图所示，假设一个主机总共有192GB内存。其中128GB分配给了NUMA CELL0，另外64GB分配给了NUMA CELL1。

* 虚拟机A消耗了112GB内存，落在了NUMA CELL0上，NUMA CELL0还剩16GB内存
* 虚拟机B消耗了48GB内存，落在了NUMA CELL1上，NUMA CELL1还剩16GB内存
* 虚拟机C来的时候说：我需要32GB内存。我们应该如何调度主机呢？

这时，现有的Placement机制，会汇总一个Resource Provider下面所有的某种资源的总和，即会查到的是主机上总内存，发现还有32GB，调度时，就认为这个主机可以作为备选主机。然而，实际我们从上图已经可以看出，实际每个NUMA CELL可供调度的内存均只有16GB，其实是不满足要求的。



## 3. 基础的数据模型
在现有Resource Provider的基础上，实现这种嵌套关系，基础的数据模型非常重要。在关系数据库中，对分层数据进行管理，主要有2个模型：

![datamodel](https://user-images.githubusercontent.com/1736354/35257252-264f5338-0033-11e8-9fb3-bc25d5d7c353.jpg)

1. 邻接表（Adjacency list）。记录parent，即父节点。
2. 嵌套集合（Nested sets）。记录left和right，注意这里不是指兄弟节点，而是类似一个编号，right=left+2n+1，根节点比较特殊，left为1，right为2n，其中，n为节点的总数。

有关邻接表和嵌套模型的内容可以参考[Managing Hierarchical Data in MySQL][2]和[Join-fu: The Art of SQL][3]。

[2]: http://mikehillyer.com/articles/managing-hierarchical-data-in-mysql/ "Managing Hierarchical Data in MySQL"
[3]: http://joinfu.com/presentations/joinfu/joinfu_part_two.pdf "Join-fu: The Art of SQL"

Reousce Provider最终选择了邻接表作为基础数据结构，在[etherpad][2]中，轻描淡写的描述了下选择的原因：

> **A simple way of modeling this kind of nesting in a relational data store is to use something called an adjacency list model.** We add a NULLABLE parent_resource_provider_id column to the resource_providers table to indicate that the resource provider is either a "top-level" provider (such as a compute host) or a "nested" provider (such as a NUMA cell on the compute host).

个人认为，选择这个模型的原因除了实现比较简单外，还有就是Resource Provider嵌套层级的不是非常深，即使进行一些查询时需要left join几次，也不会有非常大的性能损耗。当然，正如Jaypipes的PPT所述那样，比起Nest Sets来说，Adjacency list是**very common but doesn't scale**。 

另外，[Managing Hierarchical Data in MySQL][2]的“LIMITATIONS OF THE ADJACENCY LIST MODEL”一节中，提到了2个这个数据结构的限制，回头看来，在Placement进行设计时，都有应对的措施：
> Working with the adjacency list model in pure SQL can be difficult at best. Before being able to see the full path of a category we have to know the level at which it resides. In addition, special care must be taken when deleting nodes because of the potential for orphaning an entire sub-tree in the process (delete the portable electronics category and all of its children are orphaned). 

其一，是Full-path的遍历（例如，获取一个父树），我们必须要多次join，并且需要知道自己在第几层，从而决定join的次数。这个在Placement，加了一个root_id进行解决。
其二，是删除父类节点时，有可能造成底下的树被孤立了，这个Placement则是通过限制用户行为来解决的，即不允许删除有子节点的父节点。

因此，最终在Resource Provider的模型中，我们新增了2个field：
1. **parent_provider_uuid**：表示Resource Provider的直接父亲节点。对于非嵌套的节点，这个field为NULL，对于嵌套的节点来说，这个字段在大多数情况可能是计算节点的UUID，表示这个资源是host下的资源；
> Indicates the UUID of the immediate parent provider. This will be None for the vast majority of providers, and for nested resource providers, this will most likely be the compute host’s UUID.
2. **root_provider_uuid**：表示这个Resource Provider是一个树形providers的根节点。这个节点可以允许我们实现一个高效的树形访问，从而避免递归地查询父子关系。
> Indicates the UUID of the resource provider that is at the “root” of the tree of providers. This field allows us to implement efficient tree-access queries and avoid use of recursive queries to follow child->parent relations.

数据模型的Patch在这: [patch/377138](https://review.openstack.org/#/c/377138)。

## 4. 核心流程解析
### 4.1 创建/删除 Nest Resource Provider
最简单的流程就是对Nest Resource Provider进行操作了，对于创建的流程来说，需要用户传递父亲节点，请求的格式类似：
```json
 {
     "name": "Shared storage",
     "parent_provider_uuid": "542df8ed-9be2-49b9-b4db-6d3183ff8ec8"
 }
```
在创建的过程中，如果包含了父亲节点，那么，我们可以很方便的找到其对应的root节点，然后填到自己的root中（子节点和父节点有相同的root）；如果没有父节点的话，那么这个子节点的根节点就是自己了（参考代码：[nova/objects/resource_provider.py#L812-L819](https://github.com/openstack/nova/blob/85a957dcd9c2e3dc8ed03f7e1f88a535bcced7f7/nova/objects/resource_provider.py#L812-L819)）。

同样的，在删除节点的时候，也需要考虑下嵌套的关系，在Resource Provider删除时，加了一个简单的限制：如果一个Resource Provider有子节点(参考代码：[nova/objects/resource_provider.py#L824-L830](https://github.com/openstack/nova/blob/85a957dcd9c2e3dc8ed03f7e1f88a535bcced7f7/nova/objects/resource_provider.py#L824-L830))，则不允许进行删除。

### 4.2 获取满足条件的Resource Provider
在 #63 中，我们提到过Nested Resource Provider的获取流程，参考[Patch/534968](https://review.openstack.org/#/c/534968)大致的过程有以下几步：
1. 获取满足条件的所有树的Root id。在这一步中，对整棵树中的资源，进行了获取和判断。参考[Patch/534866](https://review.openstack.org/#/c/534866)。
2. 获取root id对应的树的usage信息。参考[Patch/534967](https://review.openstack.org/#/c/534967)
![nest](https://user-images.githubusercontent.com/1736354/35499685-69550382-050e-11e8-8350-7e5b7d2d2391.jpg)
例如，对于上述的结构中，当用户进行请求时，则会将右边的树获取出来，然后最终拿到父亲节点。

由于目前Patch还在开发中，并且在估计最早要到Rocky版本才能完成，所以，等到全部完成后，再进行更详尽的介绍。

## 参考

1. [nested-resource-providers的etherpad][1]
2. [Managing Hierarchical Data in MySQL][2]
3. [Join-fu: The Art of SQL][3]