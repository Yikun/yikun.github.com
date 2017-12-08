title: 跨Cell场景下查询的那些事儿
tags:
  - Nova
  - OpenStack
number: 60
date: 2017-11-16 21:19:14
---

### 1. 背景
我们知道Nova目前正在慢慢地演进到Cell V2架构，Cell V2架构中，很重要的一个变化就是数据库的拆分，清晰的划分了数据库的职能，从而有具备横向扩展的能力。顶层数据库(nova_api)用来存储全局数据，而Cell中的数据库(nova_cellX)仅存储计算节点相关的数据。比如，创建虚拟机的全局数据，比如Flavor、Keypair之类的数据，放在上层的nova_api数据库中，而虚拟机本身的信息，比如某个虚拟机的信息，放在了子Cell中。

![cell](https://user-images.githubusercontent.com/1736354/33543222-307b8974-d911-11e7-9993-5373720491df.jpg)

这样的架构另一个好处是Cell很轻松的可以实现扩展，从而提升虚拟机数量的规模。然而，这引入了一个问题，就是没有一个地方存储着全量虚拟机的数据了。当我们需要一些全局的虚拟机数据查询时（比如查询全量虚拟机列表）就比较棘手了。

### 2. 数据库的拆分
其实这样的架构在目前互联网业务中十分常见，随着业务量和历史数据的增长，很多业务都需要进行分表分库，切分的目的主要有2个，一是单个数据库的存储空间已经不足以支撑庞大的数据量，另外一个是单个数据库所能承载的连接数或者并发数不足以满足逐渐飙升的请求。一般来说，数据库的分库为垂直分库和水平分库。

![split](https://user-images.githubusercontent.com/1736354/33540293-5f4852ca-d905-11e7-8e48-04b111cdbdf2.jpg)

1. 垂直分库。
一般按照功能划分，每个分库的功能不同。把不同功能查询或写入的负载均分到独立功能库中。例如，我们将一些基础信息独立成一个库，详细信息独立成一个库，这种按照功能的划分，将负载均衡，只需要基础信息的去访问基础库，需要详细信息的时候，再去查详细信息的库。
在Cell V2的架构中，我们可以将nova_api和nova_cellX的数据库划分看成是垂直划分，对于nova_api库来说，只用关心上层全局数据的存储处理，而对于nova_cell库来说需要关心的是每个子cell里面数据的存储处理。

2. 水平分库。
一般通过某种方法把数据打散到不同的库中，每个库的表结构是相同的。例如，我们根据用户ID进行分库，可以通过映射表、取余、Hash的方式来确定某个用户的请求到底落到哪个数据库去查。
在Cell V2的架构中，每个Cell数据的划分，就可以看做是水平分库了，虚拟机按照一定的“规则”，落到了不同的Cell中。

一般的业务演进，一般是先进行垂直分表分库，然后当用户或者数据规模达到一定程度后，再通过水平分库提升规模。就像OpenStack Nova一样，最开始所有的数据都聚集在一个叫Nova的库里，然后拆分出nova_api和nova，最后再将nova_cell拆出来，并根据虚拟机ID和Cell进行mapping，从而完成水平分库。


### 2. 引入的问题

![mapping](https://user-images.githubusercontent.com/1736354/33540482-43540b12-d906-11e7-99de-6fa30d29fcba.jpg)

在Cell V2的场景下，对于单个虚拟机来说基本没什么变化，无非就是多了一个映射查询的步骤：先查找虚拟机所对应的Cell数据库，然后对这个数据库进行操作即可。

然而，由于水平切分导致每个Cell都丢失了“全局视角”，例如之前我们进行虚拟机列表查询时，在原来只需要在一个数据库查询，现在需要在多个数据库查询，尤其是需要指定一些全局参数进行查询时，比如limit、marker、sort等参数一加上，就更恶心了。

### 3. 解决方案
这个问题，在多Cell场景一直没有得到很好的解决，只是在各个Cell里面搜集各个cell排序好的数据，然后append到结果里面，也并没有进行最终排序。呈现给用户来看，就是数据是乱序的。

直到Q版本，Dan Smith大神提了一系列的[instance-list Patch](https://review.openstack.org/#/q/topic:instance-list+(status:open+OR+status:merged))，初步解决了这个问题。

![paging](https://user-images.githubusercontent.com/1736354/33541997-310a2d28-d90c-11e7-860b-9302f33af6d5.jpg)


我们先看看他的实现，这一系列的Patch最关键的实现在[instance_list.py](https://github.com/openstack/nova/blob/f4b3b77511366115a5ecef23d8d145ab9c4d953a/nova/compute/instance_list.py)中，大致的撇一眼整体的实现，**全局/局部marker**、**并行搜集跨Cell数据**、**heap归并排序**，相信从这几个关键词中你已经猜到了实现的大概逻辑。下面，我们先整体介绍一下整体的实现逻辑，然后再对实现细节做详细的解释。

我们举个例子，来看看在跨cell场景下，如果获取一个虚拟机的列表

假设我们有2个cell，里面有编号为i0~i5的6个虚拟机，从i0到i5，按顺序依次创建。当我们查询全量虚拟机时，按照创建时间逆序，我们期待得到的结果是`i5 i4 i3 i2 i1 i0`。再传递limit=2/sort=orderby(created_at,desc)/marker(i5)之后，处理的过程如下：


#### Step 1 查找全局marker。
我们首先需要在各个Cell中查找，`i5`是否存在。对于虚拟机来说，比较简单，在nova_api数据库中存在instance_mappings表，这个表里面记录了虚拟机和cell的映射关系，如果marker在cell中，我们直接可以从mapping表中找到它及其对应的cell。
我们的例子中，我们找到了位于cell2中的`i5`。

![gmarker](https://user-images.githubusercontent.com/1736354/33542019-3f48325e-d90c-11e7-9b9a-9943b4dc7ede.jpg)

参考代码：[nova/compute/instance_list.py#L134,L142](https://github.com/openstack/nova/blob/3a19f89f34a1eaee7eec2dcc7b809058d61950f0/nova/compute/instance_list.py#L134,L142)
具体获取marker时，是先在instance_mapping中查找了marker所在的cell，然后，在target_cell拿到了marker的信息，参考代码[nova/compute/instance_list.py#L66,L88](https://github.com/openstack/nova/blob/3a19f89f34a1eaee7eec2dcc7b809058d61950f0/nova/compute/instance_list.py#L66,L88)。

#### Step 2 并行查询子Cell中的local marker，并获取满足条件的虚拟机。
![finding](https://user-images.githubusercontent.com/1736354/33542026-4784411a-d90c-11e7-8499-b24ef3a4cd03.jpg)


在第一步中，我们拿到了i5的信息，由于排序是按照created_at，逆序，那我们查询local marker的时候，只需要一条SQL就可以拿到Cell中满足条件的local marker： 
```SQL
SELECT * FROM instances ORDER BY created_at DESC limit 1
```
然后，我们再根据这个local marker就可以拿到满足条件的虚拟机列表了。当然，我们需要各取limit个，因为也许最终满足条件的都在一个cell中，所以，我们取得的虚拟机列表中虚拟机的个数应该按照全局limit来获取。
值得注意的是，local marker如果不是global marker的话，我们需要把local marker也算在满足条件的列表中，因为全局来看，这个marker也是满足用户条件的。如果local marker也刚好就是global marker，那这个marker就不用管了。
参考代码[nova/compute/instance_list.py#L166,L212](
https://github.com/openstack/nova/blob/3a19f89f34a1eaee7eec2dcc7b809058d61950f0/nova/compute/instance_list.py#L166,L212)，先找到满足条件的第一个local marker，然后就按照之前的流程，获取marker之后的记录就可以了。

#### Step 3 合并排序。
在步骤2中，我们会得到2个列表，分别是从cell1和cell2中拿到的数据。这两个列表是有序的，但是当我们合并后，需要进行全局重排序。这样，我们就拿到了有序的列表。
![merge](https://user-images.githubusercontent.com/1736354/33542040-5001b066-d90c-11e7-8bbb-b1119c30d037.jpg)

参考代码[nova/compute/instance_list.py#L228,L234](https://github.com/openstack/nova/blob/3a19f89f34a1eaee7eec2dcc7b809058d61950f0/nova/compute/instance_list.py#L228,L234)，可以看到，由于每个cell拿到的数据都是有序的，因此，最终排序的时候，也是用了heapq这个数据结构，来高效的完成有序列表的合并排序。


#### Step 4 进行limit操作。
最后，我们在第三步的结果上，进行limit操作就好了。在合并的过程中，对limit进行检查，最终，完成limit且排好序的结果。
![limit](https://user-images.githubusercontent.com/1736354/33542045-5555ae1e-d90c-11e7-98b9-20eab3a9820a.jpg)

### 4. The end, the begin.
Instance list给我们示范了一个跨Cell场景下列表的实现，主要有2个地方很有亮点，一个是并行的查询各个Cell的数据，一个是最终排序选择了heapq作为排序的结构，在保证分页正常的情况下，也兼顾了性能。
比较残忍的是，随着跨Cell迁移的支持，几乎后续所有和子Cell数据相关的列表查询，都需要进行跨Cell的支持，比如migration、instance action。

架构很丰满，实现很骨感。不多说了，滚去写cross cell support的patch了。：）