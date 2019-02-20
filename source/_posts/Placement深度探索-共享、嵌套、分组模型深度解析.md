title: '[Placement深度探索] 共享、嵌套、分组模型深度解析'
tags: []
number: 74
date: 2018-08-01 12:15:23
---

在 #63 中我们介绍了最简单的Allocation candidate的过程，在Placment中，是如何实现分享、嵌套、分组的呢？

## 1. 模型概览

![image](https://user-images.githubusercontent.com/1736354/43573240-df680e7e-9673-11e8-9786-9492c9e8f4f8.png)

如上图所示，对于一共三个节点，然后还有一个128G的共享内存：
1. 节点1，含有16个VCPU、32768MB内存、包含2个NUMA分别挂2个PF，一个PF含8个VF，一个PF含2个VF
2. 节点2，含有16个VCPU、32768MB内存
3. 节点3，含有16个VCPU、16384MB内存

### 1.1 Single，独立模型。
最简单的模型就是将每个Resource Rrovider(RP)看做独立的，当单个模型含有全部请求资源时，才算满足要求。即请求16个VCPU、16384MB的内存，那我们期待的就是获取到ID为1，6，7的节点。

### 1.2 Nested，嵌套模型。
对于嵌套模型，我们期望的是，将整个树的关系都能被发现到，当一颗树上的资源满足请求，即返回树。即请求16个VCPU、32768MB的内存、8个VF，那么我们最终得到的是1节点，他是作为满足条件树的根节点。

### 1.3 Sharing，共享模型。
对于共享模型，我们期望的是，将共享的NFS的资源也考虑进去，当然，这个资源仅共享给一个agg分组的RP，即请求16个VCPU、32768MB的内存、128G的硬盘，我们期望得到的是1节点和6节点。

### 1.4 Aggregate，分组模型。
用户可以通过member_of指定agg，获取某个组内的资源。例如，我指定member_of agg1，那么我们期望得到的就是1节点和7节点。另外，还有一个场景，就是共享模型的提到的，即如果一个RP是共享的，那么在一个Aggregate中的RP都可以共享他的资源。

## 2. 实现深度解析
![image](https://user-images.githubusercontent.com/1736354/43561899-d37ef762-964b-11e8-8820-1ae5acfafe18.png)

### 2.1 Same Provider
在Placment的实现中，也是将single模型和其他模型通过use_same_provider参数区分开来。我们从简单的入手，先看单一模型的实现。建议先找找刺激，看看[代码](https://github.com/openstack/nova/tree/1adc6ad/nova/api/openstack/placement/objects/resource_provider.py#L2811~#L2916)，：）

核心流程主要有以下几个过滤条件：

#### 2.1.1 **指定和禁止traits**
当用户指定或禁止traits时，过滤包含指定traits且不包含禁止traits的resource provider

```python
    if required_traits:
        # 获取包含所有traits信息的resource provider ids
        trait_rps = _get_provider_ids_having_all_traits(ctx, required_traits)
       # 如果未获取到，直接做短路处理
        if not trait_rps:
            return []
    if forbidden_traits:
        # 获取包含任何forbidden traits的rp
        forbidden_rp_ids = _get_provider_ids_having_any_trait(
            ctx, forbidden_traits)
    # ... ...
    # First filter by the resource providers that had all the required traits
    if trait_rps:
        where_conds.append(rpt.c.id.in_(trait_rps))
    # 除去这些包含forbidden traits的rp
    if forbidden_rp_ids:
        where_conds.append(~rpt.c.id.in_(forbidden_rp_ids))
```
![image](https://user-images.githubusercontent.com/1736354/43569516-42cec200-966a-11e8-9543-d2ab9565fb78.png)

我们看到SQL最开始的where条件就是traits和forbidden traits，放到最前面其实有个目的就是将大部分的RP都可以通过前面的条件过滤掉，这样提升了SQL的整体性能。

#### 2.1.2 **保证可用量**
当用户请求某些资源时，保证RP的usage满足需求。可用量的检查类似如下过程：
a. VCPU < 16          **剩余量检查**，已使用+请求量<=(总量-预留量)*超分比
b. 1 < VCPU < 16   **上下限检查**，资源的分配粒度的检查，不能过大，不能过小。
c. VCPU % 1           **分配步长**，比如某些资源仅能5G，5G的分配。

```python
    for rc_id, amount in resources.items():
        # ... ...
        # join对应资源的resource usage信息后，进行条件限制
        usage_cond = sa.and_(
            (
            # 满足剩余可用
            (sql.func.coalesce(usage_by_rc.c.used, 0) + amount) <=
            (inv_by_rc.c.total - inv_by_rc.c.reserved) *
                inv_by_rc.c.allocation_ratio
            ),
            # 满足大于最小限额，小于最大限额，且步长满足
            inv_by_rc.c.min_unit <= amount,
            inv_by_rc.c.max_unit >= amount,
            amount % inv_by_rc.c.step_size == 0,
        )
        # 对于每个资源都append其usage的限制
        where_conds.append(usage_cond)
```
#### 2.1.3 **指定分组**
当用户请求包含member_of分组信息时，仅获取aggregates的的resource provider。
```python
    # If 'member_of' has values, do a separate lookup to identify the
    # resource providers that meet the member_of constraints.
    if member_of:
        rps_in_aggs = _provider_ids_matching_aggregates(ctx, member_of)
        if not rps_in_aggs:
            # Short-circuit. The user either asked for a non-existing
            # aggregate or there were no resource providers that matched
            # the requirements...
            return []
        where_conds.append(rpt.c.id.in_(rps_in_aggs))
```
上述过程完成后，一个Same Provider的过滤获取流程就走完了，最终包含的rp就是我们需要的信息，可以看出我们过滤了traits、forbidden traits、usage(inventory)、aggregates信息。

> Note: 我们在阅读这种长SQL的代码时，一定要抓住where条件，从where条件入手，查看过滤的关键点，理解了整个SQL的大意之后，再根据where条件所需的信息，往前看一连串的join信息。

### 2.2 NOT Same Provider
在上一节中，介绍了单一的Resource provider的获取流程，但是，当嵌套树、共享模型加进来后，事情变得复杂了一些。那么问题变成了，在考虑树状结构和分组信息的情况下，如何获取满足条件的树信息？

#### 2.2.1 获得满足所有资源条件的树信息
代码见[nova/api/openstack/placement/objects/resource_provider.py#L3148-L3187](https://github.com/openstack/nova/blob/1adc6ad5339706faece09ff69c24302748ed456c/nova/api/openstack/placement/objects/resource_provider.py#L3148-L3187)
1. 满足单个条件的Resource Provider（树的叶子节点）。
遍历每个资源类型，获取满足条件的provider id及对应的root id，例如，对于VCPU:16、VF:2的请求，我们会得到的是如下的rp列表：
a. 满足VCPU的（红色虚线框），即1, 6, 7。对应结果为：``(1, 1), (6, 6), (7, 7)``
b. 满足VF的（蓝色虚线框），即4, 5。对应结果为：``(4, 1), (5, 1)``
![image](https://user-images.githubusercontent.com/1736354/43575569-b6a1ecd4-9679-11e8-8a48-548a9588cad4.png)

2. 找出满足所有条件的树（树的根节点）。
在遍历所有用户请求的资源类型的过程中，生成了2个数据：
a. provs_with_inv，记录着**所有满足**资源的(provider_id, root_id, rc_id)，这个是并集。对应结果为：``[(1, 1), (6, 6), (7, 7), (4, 1), (5, 1)]``
b. trees_with_inv，记录着**满足所有**资源请求的root_id，这个是取root的交集，即set([1, 6, 7]) & set([1, 1])。对应结果为：``[1]``。
然后，根据tree_with_inv过滤provs_with_inv，一遍拿到最终满足条件的所有树（树的根节点）
![image](https://user-images.githubusercontent.com/1736354/43618862-71672588-96fd-11e8-969c-28d4e7c20417.png)

最终得到的就是，即满足VCPU又满足VF的根节点。

#### 2.2.2 追加共享的节点。
如果在树的基础上再考虑共享的节点的话，事情复杂了那么一点点。

0. (**共享独有步骤**) 获取所有的共享RP。
首先最开始，捞了一把所有共享的RP。获取的方法比较简单，就是找到所有包含“MISC_SHARES_VIA_AGGREGATE”这一traits的RP，并且其剩余的可用量，满足我们的要求即可。

1. (**在原有步骤追加**) 在“满足单个条件的Resource Provider”追加共享信息。
在2.2.1的第1步完成时，继续append满足条件的共享信息。例如，对于VCPU:16、VF:2、DISK:128的请求，我们会得到的是如下的rp列表：
a. 满足VCPU的（红色虚线框），即1, 6, 7。对应结果为：``(1, 1), (6, 6), (7, 7)``
b. 满足VF的（蓝色虚线框），即4, 5。对应结果为：``(4, 1), (5, 1)``
c. (**共享新增**) 满足DISK的（紫色虚线框），即8。对应结果为：``(8, 1), (8, 6)``
![image](https://user-images.githubusercontent.com/1736354/43621586-e7cb7988-970a-11e8-976a-2fc61c83b2b4.png)

2. (**在原有步骤追加**) 在“满足所有条件的树（树的根节点）”与共享信息再取交集。
追加上sharing的RP后，我们那两个关键的数据变为了：
a. provs_with_inv，记录着**所有满足**资源（**包括共享资源**）的(provider_id, root_id, rc_id)，这个是并集。对应结果为：``[(1, 1), (6, 6), (7, 7), (4, 1), (5, 1), (8, 1), (8, 6)]``，比之前新增了``(8, 1), (8, 6)``。 即“anchors for sharing providers”这一方法完成的。
b. trees_with_inv，记录着**满足所有**资源请求（**包括共享资源**）的root_id，这个是取root的交集，即set([1, 6, 7]) & set([1, 1]) & set([1, 6])，比原来新增了``set([1, 6]``。对应结果仍为：``[1]``。

![image](https://user-images.githubusercontent.com/1736354/43621682-4ec32fc8-970b-11e8-83b5-f95f892279be.png)

最终，就找到了满足条件VCPU:16、VF:2、DISK:128的树。

#### 2.2.3 “anchors for sharing providers” -- 关键步骤单独解析。
刚才我们提到了“anchors for sharing providers”，这个是干啥的？代码见[nova/api/openstack/placement/objects/resource_provider.py#L433-L489](https://github.com/openstack/nova/blob/1adc6ad5339706faece09ff69c24302748ed456c/nova/api/openstack/placement/objects/resource_provider.py#L433-L489)
这个函数名字有点诡异，共享provider的“锚”？其实这个函数解决的就是：已知共享资源的情况下，如何找到可以使用这些共享资源的树根？
其实就是共享的RP与其关联的其他RP取笛卡尔积（即N*M）的过程，可能有点抽象，我们举个例子：
已知1、2、3处于一个AGG，然后，1、2共享了一些资源，我需要找到所有可以享用1、2资源的树。
![image](https://user-images.githubusercontent.com/1736354/43629343-8d9b9e96-972f-11e8-89f6-772eaed7238e.png)

1. 1、2、3均处于同一agg 1中
```SQL
select resource_provider_id, aggregate_id from resource_provider_aggregates;
+----------------------+--------------+
| resource_provider_id | aggregate_id |
+----------------------+--------------+
|                    1 |            1 |
|                    2 |            1 |
|                    3 |            1 |
+----------------------+--------------+
```

2. 通过agg自join取笛卡尔积
```SQL
select sps.resource_provider_id,sps.aggregate_id,rps.aggregate_id,rps.resource_provider_id
    # 笛卡尔积的左项
    -> from resource_provider_aggregates sps
    # 笛卡尔积的右项
    -> inner join resource_provider_aggregates rps
    -> on sps.aggregate_id = rps.aggregate_id
    # 笛卡尔积的左项，限制为共享的RP
    -> where sps.resource_provider_id in (1,2);
+----------------------+--------------+--------------+----------------------+
| resource_provider_id | aggregate_id | aggregate_id | resource_provider_id |
+----------------------+--------------+--------------+----------------------+
|                    1 |            1 |            1 |                    1 |
|                    1 |            1 |            1 |                    2 |
|                    1 |            1 |            1 |                    3 |
|                    2 |            1 |            1 |                    1 |
|                    2 |            1 |            1 |                    2 |
|                    2 |            1 |            1 |                    3 |
+----------------------+--------------+--------------+----------------------+
```

3. 在笛卡尔积的基础上关联root
然后，再将上述结果，和RP一join，就得到了关联的root。最终，发现可以共享1、2资源的跟节点就是1(1所在树根)、2（2所在树根）、0（3所在树根）

#### 2.2.4 member_of过滤。
代码见[nova/api/openstack/placement/objects/resource_provider.py#L3189-L3199](https://github.com/openstack/nova/blob/1adc6ad5339706faece09ff69c24302748ed456c/nova/api/openstack/placement/objects/resource_provider.py#L3189-L3199)
这个逻辑就很简单了，RP和agg一join，然后额外的条件就是RP在agg就行。

#### 2.2.5 指定或禁止traits。
代码见[nova/api/openstack/placement/objects/resource_provider.py#L3213-L3218](https://github.com/openstack/nova/blob/1adc6ad5339706faece09ff69c24302748ed456c/nova/api/openstack/placement/objects/resource_provider.py#L3213-L3218)
留下包含所有traits的RP，干掉包含任意forbidden traits的RP

又是一篇TL;DR的文章，就这样吧。。。