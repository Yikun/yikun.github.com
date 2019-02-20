title: '[Placement深度探索] Get Allocation Candidates'
tags:
  - Nova
  - OpenStack
number: 63
date: 2017-12-25 17:25:17
---

## 1 功能概述
Placement的一个重要的接口，就是获取满足指定资源条件的allocation。举个例子，用户说，`我需要1个VCPU，512MB内存，1GB磁盘的资源，Placement你帮我找找看看，有没有合适的资源`。

<!--more-->

```bash
curl -X GET http://10.76.6.31/placement/allocation_candidates?resources=DISK_GB:1,MEMORY_MB:512,VCPU:1 -H "X-Auth-Token: $TOKEN" -H "OpenStack-API-Version: placement 1.15"
```
用户通过allocation_cadidates接口进行查询，参数是`DISK_GB:1,MEMORY_MB:512,VCPU:1`，随后，Placement自己做了一大堆的查询之后，“告诉”用户：
```json
{
    "allocation_requests": [{
        "allocations": {
            "f05575b2-3df6-4018-84f6-f2a75795b59b": {
                "resources": {
                    "DISK_GB": 1,
                    "MEMORY_MB": 512,
                    "VCPU": 1
                }
            }
        }
    }],
    "provider_summaries": {
        "f05575b2-3df6-4018-84f6-f2a75795b59b": {
            "resources": {
                "DISK_GB": {
                    "capacity": 243,
                    "used": 6
                },
                "MEMORY_MB": {
                    "capacity": 11206,
                    "used": 3200
                },
                "VCPU": {
                    "capacity": 16,
                    "used": 8
                }
            }
        }
    }
}
```
上面就是我查找到的结果：
> 1. **资源请求参数(allocation_requests)**：您请求资源，DISK有1GB，MEMORY有512MB，VCPU有1个。我帮你找到一个UUID为`f05575b2-3df6-4018-84f6-f2a75795b59b`的Resource Provider，满足这个条件。
> 2. **Provider详细信息(provider_summaries)**：这个Resource Provider，它DISK总量为243GB使用了6GB，MEMORY总量为11206MB使用了3200MB，VCPU总个数为16个，已使用了8个。


## 2 实现详情
### 2.1 整体流程
![list_allocation_candidates](https://user-images.githubusercontent.com/1736354/35491560-223fbf9a-04e2-11e8-98d9-13f5d5ba2658.jpg)

整体流程如上图所示
1. 在[bp/granular-resource-requests](https://specs.openstack.org/openstack/nova-specs/specs/queens/approved/granular-resource-requests.html)中，对输入的资源请求格式，进行了定义，使能用户请求诸如traits、nest、share资源的请求方式。
2. 在请求前，对Resource Class、os_traits信息进行同步。
3. 请求时，对不同种的资源结构，分别进行了处理
(1) 最简单的分支，就是按照资源来匹配满足要求的单个Resource Provider，主要就是对比请求的资源和现有资源的情况，看是否满足用户的需求，即请求量+已使用量<=总存量
(2) 考虑共享的资源，在满足“请求量+已使用量<=总存量”的情况下，再对共享资源进行考虑，需要额外将在同一aggreegate的共享资源，考虑进来。
(3) 考虑嵌套的资源，如果Resource Provider之间存在嵌套关系，需要获取满足资源请求的tree的信息，主要流程是先获取满足（考虑树中的总和、共用信息）的树的根节点（一般就是计算节点了），然后根据满足的信息，再获取资源的情况。

### 2.2 最简单的例子
下面以一个single reousrce provider（就是说不考虑嵌套、共享之类的）的请求来举个例子：
##### Step 1. 查询满足条件的resouce provider
```SQL
SELECT rp.id
FROM resource_providers AS rp
    -- vcpu信息join
    -- vcpu总存量信息
    INNER JOIN inventories AS inv_vcpu
        ON inv_vcpu.resource_provider_id = rp.id 
        AND inv_vcpu.resource_class_id = %(resource_class_id_1)s
    -- vcpu已使用量信息
    LEFT OUTER JOIN (
        SELECT allocations.resource_provider_id AS resource_provider_id,
        sum(allocations.used) AS used
        FROM allocations
        WHERE allocations.resource_class_id = %(resource_class_id_2)s
        GROUP BY allocations.resource_provider_id
    ) AS usage_vcpu
        ON inv_vcpu.resource_provider_id = usage_vcpu.resource_provider_id
    -- memory信息join
    -- memory总存量信息
    INNER JOIN inventories AS inv_memory_mb
        ON inv_memory_mb.resource_provider_id = rp.id
        AND inv_memory_mb.resource_class_id = %(resource_class_id_3)s
    -- memory已使用量信息
    LEFT OUTER JOIN (
        SELECT allocations.resource_provider_id AS resource_provider_id,
            sum(allocations.used) AS used
        FROM allocations
        WHERE allocations.resource_class_id = %(resource_class_id_4)s
        GROUP BY allocations.resource_provider_id
    ) AS usage_memory_mb
        ON inv_memory_mb.resource_provider_id = usage_memory_mb.resource_provider_id
    -- disk信息join
    -- disk总存量信息
    INNER JOIN inventories AS inv_disk_gb
        ON inv_disk_gb.resource_provider_id = rp.id
        AND inv_disk_gb.resource_class_id = %(resource_class_id_5)s
    -- disk已使用量信息
    LEFT OUTER JOIN (
        SELECT allocations.resource_provider_id
        AS resource_provider_id, sum(allocations.used) AS used
        FROM allocations
        WHERE allocations.resource_class_id = %(resource_class_id_6)s
        GROUP BY allocations.resource_provider_id
        ) AS usage_disk_gb
            ON inv_disk_gb.resource_provider_id = usage_disk_gb.resource_provider_id
WHERE 
-- vcpu满足上限/下限/步长条件
coalesce(usage_vcpu.used, %(coalesce_1)s) + %(coalesce_2)s <= (
inv_vcpu.total - inv_vcpu.reserved) * inv_vcpu.allocation_ratio AND
inv_vcpu.min_unit <= %(min_unit_1)s AND
inv_vcpu.max_unit >= %(max_unit_1)s AND
%(step_size_1)s % inv_vcpu.step_size = %(param_1)s AND
-- memory满足上限/下限/步长条件
coalesce(usage_memory_mb.used, %(coalesce_3)s) + %(coalesce_4)s <= (
inv_memory_mb.total - inv_memory_mb.reserved) * inv_memory_mb.allocation_ratio AND
inv_memory_mb.min_unit <= %(min_unit_2)s AND
inv_memory_mb.max_unit >= %(max_unit_2)s AND
%(step_size_2)s % inv_memory_mb.step_size = %(param_2)s AND
-- disk满足上限/下限/步长条件
coalesce(usage_disk_gb.used, %(coalesce_5)s) + %(coalesce_6)s <= (
inv_disk_gb.total - inv_disk_gb.reserved) * inv_disk_gb.allocation_ratio AND
inv_disk_gb.min_unit <= %(min_unit_3)s AND
inv_disk_gb.max_unit >= %(max_unit_3)s AND
%(step_size_3)s % inv_disk_gb.step_size = %(param_3)s
```
此步完成后，就可以拿到满足给定条件的Resource Provider的ID了。

##### Step 2. 查询满足条件的resouce provider及其对应的总存量、已使用量信息
```SQL
-- 从inventory/allocation/resource_provider表取信息
SELECT rp.id AS resource_provider_id, rp.uuid AS resource_provider_uuid,
    inv.resource_class_id, inv.total, inv.reserved, inv.allocation_ratio,
    `usage`.used
FROM resource_providers AS rp
    -- inventory信息，每个rp的总量
    INNER JOIN inventories AS inv
        ON rp.id = inv.resource_provider_id
    -- allocation信息
    LEFT OUTER JOIN (
        -- 每个rp和class的已使用量
        SELECT allocations.resource_provider_id AS resource_provider_id,
        allocations.resource_class_id AS resource_class_id,
        sum(allocations.used) AS used
        FROM allocations
        WHERE allocations.resource_provider_id IN (%(resource_provider_id_1)s) AND
            allocations.resource_class_id IN (
                %(resource_class_id_1)s,
                %(resource_class_id_2)s,
                %(resource_class_id_3)s
            )
        -- 按照rp_id和rp_class_id进行分组
        GROUP BY allocations.resource_provider_id, allocations.resource_class_id
    ) AS `usage`
        ON `usage`.resource_provider_id = inv.resource_provider_id AND
        `usage`.resource_class_id = inv.resource_class_id
-- 查询指定id及class的resource
WHERE rp.id IN (%(id_1)s) AND
    inv.resource_class_id IN (
        %(resource_class_id_4)s,
        %(resource_class_id_5)s,
        %(resource_class_id_6)s
    )
```
查询的最终结果如下：
![image](https://user-images.githubusercontent.com/1736354/34344401-874dbff4-ea20-11e7-835b-c3bea5599896.png)

其实我们可以看到，这个接口的作用就是说，用户给一些资源的请求，然后placement就去查，满足条件的resource provider。

当然，作为placement最重要也是最复杂的接口之一，加上嵌套、共享、分组之后，情况变得越来越复杂，但是，核心的实现是差不多的，都是一个套路，join一系列我们需要的信息，然后在where判断这些信息是否满足条件，最后，把满足条件的RP返回给用户。

后续，我也会在分析学习独立的feature（比如Nested Resource Provider、Sharing Resource Provider等），加上此接口的变化点和深入解析。

