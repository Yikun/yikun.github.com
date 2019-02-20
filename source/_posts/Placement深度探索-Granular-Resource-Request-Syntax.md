title: '[Placement深度探索] Granular Resource Request Syntax'
tags:
  - Nova
  - OpenStack
number: 69
date: 2018-04-02 10:54:51
---

### 1. 问题背景
在进行资源请求的时候，由于目前支持的能力有限，我们目前只能请求一个单一类型包含整数数量的资源。

例如，我们请求VCPU为2，内存为2G，要求其架构为X86架构，即通过以下URL进行请求：

> GET /allocation_candidates?resources=VCPU:2,MEMORY_MB:2048&required=HW_CPU_X86_AVX

也不能指定我们需要某一个RP具有某种特质，所有不同类型的资源也只能从一个RP提供。

但是，在进行一些通用和嵌套的Resource Provider时，会有诸如下列的需求：
Requirement 1. 根据类型、特质来请求一个allocation，根据相同类型和不同特质来请求不同的多个allocation。
Requirement 2. 保证指定的资源来自同一个resource provider
Requirement 3. 在资源有限（高饱和度）的情况下，将allocations散布到多个resource provider（多个resource provider拼凑起来）的能力。

我们通过一个例子来说下这几个场景：
![unnamed](https://user-images.githubusercontent.com/1736354/38181314-c5e0d054-3664-11e8-951e-bd811909b6e2.jpg)

**Use Case 1** 
我们希望请求一个在NET1上的VF，一个在NET2上的VF。
* [RP1(SRIOV_NET_VF:1), RP2(SRIOV_NET_VF:1)]
* [RP1(SRIOV_NET_VF:1), RP4(SRIOV_NET_VF:1)]
* [RP3(SRIOV_NET_VF:1), RP2(SRIOV_NET_VF:1)]
* [RP3(SRIOV_NET_VF:1), RP4(SRIOV_NET_VF:1)]
那么，我们请求的时候，可以使用：

> GET /allocation_candidates?resources=SRIOV_NET_VF:1&resources1=SRIOV_NET_VF:1

体现需求1要求的分组能力，在解析的时候，会将resource根据后面的number分组
Expect:
[RP1(SRIOV_NET_VF:1), RP2(SRIOV_NET_VF:1)]
[RP1(SRIOV_NET_VF:1), RP4(SRIOV_NET_VF:1)]
[RP3(SRIOV_NET_VF:1), RP2(SRIOV_NET_VF:1)]
[RP3(SRIOV_NET_VF:1), RP4(SRIOV_NET_VF:1)]

**Use Case  2**
请求一个带宽为10000 bytes/sec的vf

> GET /allocation_candidates?resources1=SRIOV_NET_VF:1,NET_EGRESS_BYTES_SEC=1

体现需求二，来自同一个Resource Provider。每个分组，通过suffix来作为后缀，来区分resource，同一个组的资源后面number相同，期望请求同一个Resource Provider。
Expect:
[RP1(SRIOV_NET_VF:1), RP1(NET_EGRESS_BYTES_SEC:10000)]
[RP2(SRIOV_NET_VF:1), RP2(NET_EGRESS_BYTES_SEC:10000)]
[RP3(SRIOV_NET_VF:1), RP3(NET_EGRESS_BYTES_SEC:10000)]
[RP4(SRIOV_NET_VF:1), RP4(NET_EGRESS_BYTES_SEC:10000)]

**Use Case 3**
请求一个在NET1上带宽为10000bytes/sec的VF，并同时请求一个在NET2上贷款为20000bytes/sec的且网卡带有SSL加速的能力

> GET /allocation_candidates?resources1=SRIOV_NET_VF:1,NET_EGRESS_BYTES_SEC=10000
&resource2=SRIOV_NET_VF:1,NET_EGRESS_BYTES_SEC=20000&required2=HW_NIC_ACCEL_SSL

体现了需求一和需求二，通过分组来获取不同的Resource Provider，通过同一分组编号来指定一个Resource Provider的能力。

* [RP1(SRIOV_NET_VF:1, NET_EGRESS_BYTES_SEC:10000), RP2(SRIOV_NET_VF:1, NET_EGRESS_BYTES_SEC:20000)]
* [RP3(SRIOV_NET_VF:1, NET_EGRESS_BYTES_SEC:10000), RP2(SRIOV_NET_VF:1, NET_EGRESS_BYTES_SEC:20000)]

**Use Case 4**
假设一个PF只剩2个VF了，请求一个NET1上4个VF。

> GET /allocation_candidates?resources=SRIOV_NET_VF:4

体现需求三，内部会自动将4分割成2个2：
Expect: [RP1(SRIOV_NET_VF:2), RP3(SRIOV_NET_VF:2)]

### 2. 核心实现

这种表达方式我们称之为“Numbered Request Groups”，名字中包含了2个重要信息，一个是“Numbered”，对请求资源进行编号，另一个是“Groups”，根据编号对请求资源进行分组.
形如：
```
resources = { resource_classA: rcA_count,
              resource_classB: rcB_count,
              ... },
required = [ TRAIT_C, TRAIT_D, ... ],

resources1 = { resource_class1A: rc1A_count,
               resource_class1B: rc1B_count,
               ... },
required1 = [ TRAIT_1C, TRAIT_1D, ... ],

resources2 = { resource_class2A: rc2A_count,
               resource_class2B: rc2B_count,
               ... },
required2 = [ TRAIT_2C, TRAIT_2D, ... ],

...,

resourcesX = { resource_classXA: rcXA_count,
               resource_classXB: rcXB_count,
               ... },
requiredX = [ TRAIT_XC, TRAIT_XD, ... ],
```

目前的解析部分的核心实现在[nova/api/openstack/placement/util.py#L349-L465](https://github.com/openstack/nova/blob/master/nova/api/openstack/placement/util.py#L349-L465)。

目前已支持的参数有resources（对inventory请求）、required（对trait请求）、member_of（对aggregate请求）。