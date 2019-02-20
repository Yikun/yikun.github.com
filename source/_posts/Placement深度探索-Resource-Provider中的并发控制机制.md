title: '[Placement深度探索] Resource Provider中的并发控制机制'
tags:
  - Nova
  - OpenStack
number: 65
date: 2018-01-23 10:02:42
---

### 1. 背景
最近，在处理Nova Metadata并发更新的问题([bug/1650188](https://bugs.launchpad.net/nova/+bug/1650188))的时候，发现Resource Provider的并发控制机制在最开始就考虑，是通过乐观锁的机制实现并发控制的，简单的说就是：

1. 为Resource Provider增加了一个generation的字段，用来记录数据更新迭代的版本。
2. 每次进行刷新（如新增、删除、更新）的时候，检查generation和最初读取的是否一致，若一致则字段值自增，完成数据更新，否则抛出并发更新的异常，返回给用户一个409。

其实，这个方式就是我们常说的乐观并发控制（OCC, Optimistic Concurrency Control，也称作乐观锁）机制。

### 2. 详细流程
用户通过API对Resource Provider的资源进行更新时，会传入一个generation参数

> curl -X PUT http://10.76.6.31/placement/resource_providers/7d2590ae-9999-4080-9306-058b4c915e32/traits -H "X-Auth-Token: $TOKEN" -H "OpenStack-API-Version: placement 1.16" -H "Accept: application/json" -H "Content-Type: application/json" -d '{
    **"resource_provider_generation": 0,**
    "traits": ["CUSTOM_YIKUN_TEST"]
}'

在最终的数据刷新时，完成事务提交前，会对generation进行刷新，例如对于本例中的traits更新，对应的代码在这里：[nova/objects/resource_provider.py#def _set_traits](https://github.com/openstack/nova/blob/6d227722d4287726e144e4cf928c8e6ae52a6a4c/nova/objects/resource_provider.py#L571)，相当于做了一次检查，如果generation和用户预期的一致，更新成功，如果更新失败，则会raise并发更新失败的error。

![generation](https://user-images.githubusercontent.com/1736354/35274760-51f95ca0-0078-11e8-8ad0-29e6f48e3b64.jpg)

如上图所示，如果操作A和操作B并发的请求进来，当A请求成功后，刷新了genration，这样，当B进行刷新的时候，就会刷新失败。

在Placement中，在对Resource Provider下的资源（例如allocation、inventory、trait等）进行修改时，均会对resource provider的generation进行刷新。我们看下实现的细节：
``` Python
def _increment_provider_generation(ctx, rp):
    """Increments the supplied provider's generation value, supplying the
    currently-known generation. Returns whether the increment succeeded.

    :param ctx: `nova.context.RequestContext` that contains an oslo_db Session
    :param rp: `ResourceProvider` whose generation should be updated.
    :returns: The new resource provider generation value if successful.
    :raises nova.exception.ConcurrentUpdateDetected: if another thread updated
            the same resource provider's view of its inventory or allocations
            in between the time when this object was originally read
            and the call to set the inventory.
    """
    rp_gen = rp.generation
    new_generation = rp_gen + 1
    # 注意这里的更新条件，通过id及generation匹配
    upd_stmt = _RP_TBL.update().where(sa.and_(
            _RP_TBL.c.id == rp.id,
            _RP_TBL.c.generation == rp_gen)).values(
                    generation=(new_generation))

    res = ctx.session.execute(upd_stmt)
    # 如果rowcount为0，说明已经不是之前的RP了
    if res.rowcount != 1:
        raise exception.ConcurrentUpdateDetected
    return new_generation
```

### 3. 参考
1. [On Optimistic Methods for Concurrency Control](https://people.eecs.berkeley.edu/~fox/summaries/database/optimistic_concurrency.html)：对乐观并发控制机制及其要点进行了一些总结。
2. 阿里巴巴Java开发手册：
> 并发修改同一记录时,避免更新丢失,要么在应用层加锁,要么在缓存加锁,要么在数据库层使用乐观锁,使用 version 作为更新依据。
> 
> 说明:如果每次访问冲突概率小于 20%,推荐使用乐观锁,否则使用悲观锁。乐观锁的重试次数不得小于 3 次。
3. [深入理解乐观锁与悲观锁](http://www.hollischuang.com/archives/934)：介绍了乐观锁和悲观锁的基本原理，并举例说明。