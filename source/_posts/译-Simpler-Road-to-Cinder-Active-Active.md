title: '[译] Simpler Road to Cinder Active-Active'
tags:
  - Cinder
number: 56
date: 2017-08-16 20:50:32
---


> 译注：本篇文章为作者介绍Cinder AA方案的文章，作者是gorka，是实现cinder AA BP的core，文章介绍了这哥们实现AA时的记录，算是对方案的一种解释以及设计思路的总结，核心思想为以下几点：
> 1. 每个volume node都增加一个`cluster`的配置项，作为集群，标记这个节点属于某个集群；
> 2. 通过cluster@backend作为消息队列的topic，并且启动cluster@backend的服务；
> 3. scheduler进行调度时，投递到某个合适的集群，集群中的某个后端进行消费；
> 4. 消费时，将操作记录在worker中，用来标记这个资源由某个worker来操作，这样当发生异常时，可以确保仅有某个worker进行cleanup的操作。

原文链接：[Simpler Road to Cinder Active-Active](https://gorka.eguileor.com/simpler-road-to-cinder-active-active/)

上一周，我发了一篇文，来介绍Cinder AA配置方案，可是，让我很受伤的是，觉得那个方案有点太复杂了，所以呢，这一波又搞了个简单的方案。

## 变更初心

我确实很喜欢我上周发布的允许Cinder使用AA HA配置的方案，不过想起来，确实有些复杂了，没必要为了一点点的益处，就把那么复杂的机制加到组件里。（比如恢复排队任务）

这个方案从决绝到接受，没有花费我太多时间，毕竟上个方案确实留下了一些复杂，所以必须要一个更简单的方案，所以呢，我相信这一波方案是一个合理的选择。

我准备用上篇博客同样的格式，来对同样的问题给出解决方案，这样对于读上篇博客的人来说看起来比较熟悉。尽管在这我没有太多的时间来搞patch和流程图，我会在Cinder Midcycle Sprint的时候把他们准备好。

## 任务调度
我们应该如何在一个cluster中的不同node去做任务调度呢？

在任务调度的时候，我们仍然不想让API或者Scheduler节点太多的考虑有多少volume节点或者说操心具体集群中哪一个节点时可用的。我们将还是用原来的方法——主题队列，唯一的不同在于，我们改变了这些队列的主题，从原来的host@backend变为了cluster@backend。

cluster将成为一个新的配置——同一集群中的所有节点都使用相同的配置。如果没有配置的话，默认会使用host作为值。同时，在cinder部署时，任何一个节点的host应该是唯一的。

将host的值作为cluster的默认值有很多好处，非AA配置可以将服务视为之前的host@backend，如果一个节点或者说原来的主备配置的节点，想要变为AA模式，只需要把后面加进来的节点，把cluster都改成和第一个host的值就行了，这样就可以保证服务可以不挂掉。这样做虽然不是那么干脆利落，但这个可以帮助管理员在可以down机的时候，再去做整改。

## 清理资源
为了进行清理，我们需要在所有的资源表（如卷、备份、快照等）增加一个新的字段。我们称其为“worker”，它可以有3个不同的值：
1. 空值：资源无节点操作
2. cluster@backend：资源正在排队等待worker操作
3. host@backned：资源已经被一个worker选择

或许，我们不需要cluester@backend这个值也可以工作的很好，不过我还是觉得应该记录现在处于什么状态了
我们也用到了“previous_status”这个字段，就像我们对in-used卷做备份操作那样。
对于已经存在的资源，正常的工作流程像下面一样：
1. API接受请求，在RPC调用投递到指定的volume topic队列之前，需要修改status和pre_vious_status以及worker字段来匹配资源的host字段（cluster@backend）
2. 当volume节点接受这个job，将会在DB把worker字段更改为host@backend
3. 当完成这个操作后，将置空worker字段，然后将status恢复为previous_status字段。

看起来不错，但我们如何去做清理呢？其实和目前的实现差不多，仅有一点小小的改动。
当节点启动时，搜寻所有worker为自己所属的host@backend的资源，然后对这个worker filed做compare-and-swap置空，确保没有其他节点来操作这个资源，也保证仅做了我们需要的改动。
然后对于一些资源的操作（比如deleting）我们设置worker字段为cluser@backend，然后RPC调用。这样，我们在所有集群的节点做了分发。
还是看起来不错吧？但是我们如何处理那些没有恢复如初，或者那些无法failover的备节点呢？这个case会通过Scheduler来处理，我们会在后面介绍。
另外的选择是，我们不用在每个资源表里都增加一个新的字段，我们可以为资源创建一个特殊的表来记录work。如果我们使用了这个方案，我们需在wokrer里面存储resource id，来记录这个ID那个资源的。这个方案修改量比较小，我们想知道谁操作某个特定的资源有点困难，但我们只需要访问一个表，就可以很简单的获取所有某个节点操作的所有资源。

## API Nodes
接下来，我们需要移除race，就像我上篇文章介绍的那样。但是我们也需要额外的变化依赖于我们如何处理资源的互斥。

## Volume Nodes
我并不想再赘述我们如何如何的需要改变目前的本地锁机制，这已经在上篇文章介绍过了。
在社区有一个分歧，一部分人认为应该使用DLM解决资源锁，另一部分人认为应该避免让云管理员去部署和配置更多的软件（比如，redis、zookeeper等）
我个人理解是使用DLM去实现AA是一个中间方案，直到我们完全的实现AA。因为我们使用Tooz可以很轻松的实现，这也是为什么我更偏向这个选择。我们可以先快速实现它，然后后面的版本再把锁从Manager和driver中移除。

附注一点，一些driver可以移除锁只要我们移除了API竞争，然后添加一些缺失的锁。
DLM这种方案，仅会影响AA的部署，而对初始的没有其他影响。

但是，通常思考另一种选择是好事情，这仅仅是我喜欢的而不是说是最好的，那么另外一种选择就是使用资源的状态。

## Service state reporting
为了探测节点有没有挂掉，也为了对那些还没有就位的节点（或者还得一段时间才能恢复的节点）进行清理，每一个集群节点都会进行report，分别占用DB不同的行。

我们可以用现在的host字段，上报时使用“cluster@backend@hostend”或者使用一个新的字段backend或者cluster里面包含cluster@backend段，然后host还是放在host字段不变。

其实，这一点倒不那么重要，这只是实现细节而已。在任何一个scheduler节点，都会有个周期任务检查数据库的内容，然后创建创建一个key为cluster@backend的字典，并存在value里，如果他是不同节点的信息以及是否我们对这个节点完成了清理。节点起来后，将会把cleanup_done设置为False。

如果cluster中的任何一个节点up，那么这个服务就up。

对于那些已经down的节点，我们将进行cleanup操作，就像我们在voluem node启动时做的那样，然后把cleanup_done字段设置为True。所以我们在下一次这个task启动时不会检查这个任务。

如果多个scheduler尝试同时对一个node进行清理，或者scheduler和之前的备节点现在active了，并且同时对资源进行修复。由于我们在数据库做的是使用compare and
swap的原子变更，跳过失败即可，确保只有一个完成资源的清理。

## Capabilities reporting
我们上报容量使用cluser@backend作为host即可，我们不需要作任何变动。

## Prevent data corruption
与上周的方案不同，组织数据出错更简单，这也是这个方案简单的一个主要原因。

我们不需要关心我们是否和后端失去连接，也不用关心我们与消息队列失去连接

如果我们与数据库失去连接我们需要停掉一切正在进行的操作，最简单的就是在心跳周期方案做这个事情。我们可以停掉backend的一切操作。

当我们使用DLM，我们应该检查连接，连接丢失要停掉所有操作，并且停止发送心跳，因为我们做不了任何事。
