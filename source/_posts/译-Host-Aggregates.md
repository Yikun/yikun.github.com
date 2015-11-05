title: "[译]Host Aggregates"
date: 2015-10-17 11:15:40
tags:
  - Nova
  - OpenStack
---

先上一个自己画的图，非常有助于理解Host Aggregates:
![host aggregates](https://cloud.githubusercontent.com/assets/1736354/10556767/3a9f3156-74c0-11e5-94f2-1b8befff9aff.png)

<!--more-->

# Host Aggregates
> Host aggregates can be regarded as a mechanism to further partition an availability zone; while availability zones are visible to users, host aggregates are only visible to administrators. Host aggregates started out as a way to use Xen hypervisor resource pools, but has been generalized to provide a mechanism to allow administrators to assign key-value pairs to groups of machines. Each node can have multiple aggregates, each aggregate can have multiple key-value pairs, and the same key-value pair can be assigned to multiple aggregate. This information can be used in the scheduler to enable advanced scheduling, to set up xen hypervisor resources pools or to define logical groups for migration.

理解：Host Aggregates可以视为是AZ(Avaliability Zone)的更进一步的划分，是对管理员可见的。每一个节点都可以属于多个Aggregates，这些Aggregates可以用作更高级的调度、配置Xen的资源池、或者定义用于升级的逻辑分组。可以理解为aggregate是一组具有相同属性主机的分组。

## Availability Zones (AZs)
> Availability Zones are the end-user visible logical abstraction for partitioning a cloud without knowing the physical infrastructure. That abstraction doesn’t come up in Nova with an actual database model since the availability zone is actually a specific metadata information attached to an aggregate. Adding that specific metadata to an aggregate makes the aggregate visible from an end-user perspective and consequently allows to schedule upon a specific set of hosts (the ones belonging to the aggregate).

> That said, there are a few rules to know that diverge from an API perspective between aggregates and availability zones:

> * one host can be in multiple aggregates, but it can only be in one availability zone
> * by default a host is part of a default availability zone even if it doesn’t belong to an aggregate (the configuration option is named default_availability_zone)

理解：Availability Zones可以理解为将一个aggregate加了一些metadata信息，使得对用户可见。他和Aggregate最主要的区别是，一个节点只能属于一个AZ，默认一个主机属于一个默认的AZ。

## Xen Pool Host Aggregates
> Originally all aggregates were Xen resource pools, now an aggregate can be set up as a resource pool by giving the aggregate the correct key-value pair.

> You can use aggregates for XenServer resource pools when you have multiple compute nodes installed (only XenServer/XCP via xenapi driver is currently supported), and you want to leverage the capabilities of the underlying hypervisor resource pools. For example, you want to enable VM live migration (i.e. VM migration within the pool) or enable host maintenance with zero-downtime for guest instances. Please, note that VM migration across pools (i.e. storage migration) is not yet supported in XenServer/XCP, but will be added when available. Bear in mind that the two migration techniques are not mutually exclusive and can be used in combination for a higher level of flexibility in your cloud management.

理解：可以将Xen的划分到一个Aggregate，来支持Xen资源池的一些特性。

## Design
> The OSAPI Admin API is extended to support the following operations:

> * Aggregates

> list aggregates: returns a list of all the host-aggregates (optionally filtered by availability zone)
create aggregate: creates an aggregate, takes a friendly name, etc. returns an id
show aggregate: shows the details of an aggregate (id, name, availability_zone, hosts and metadata)
update aggregate: updates the name and availability zone of an aggregate
set metadata: sets the metadata on an aggregate to the values supplied
delete aggregate: deletes an aggregate, it fails if the aggregate is not empty
add host: adds a host to the aggregate
remove host: removes a host from the aggregate

> * Hosts

> start host maintenance (or evacuate-host): disallow a host to serve API requests and migrate instances to other hosts of the aggregate
stop host maintenance: (or rebalance-host): put the host back into operational mode, migrating instances back onto that host

理解：对于Aggregate操作有：列出、创建、显示信息、更新、设置metadaa、删除、添加主机、移除主机。对于host的操作有：开启维护主机、停止维护主机。

参考资料：
[openstack中region、az、host aggregate、cell 概念](http://www.cnblogs.com/xingyun/p/4703325.html)