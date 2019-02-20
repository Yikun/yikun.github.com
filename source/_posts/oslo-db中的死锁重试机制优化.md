title: oslo.db中的死锁重试机制优化
tags:
  - OpenStack
  - 数据库
number: 71
date: 2018-04-19 10:26:46
---

### 0. 引言
OpenStack oslo.db是OpenStack中处理DB相关功能的基础组件，基本OpenStack所有的核心组件都会使用这一基础库。

去年12月，遇到一个死锁的问题 #62 [一个死锁问题的深入探究](https://github.com/Yikun/yikun.github.com/issues/62)，研究了下oslo.db死锁重试的方式，发现其中并没有加入随机机制。在通信领域，有一个叫做“二进制退避机制”的算法（嗯，也算没白读了7年通信，哈哈，在本文立刻提升逼格），就是通过指数递增+随机的方式来解决无中心、多节点接入时产生的冲突的。

当时，顺着这个思路，我在oslo.db中提交了一个关于改进死锁重试机制的[patch/527362]：[Improve exponential backoff for wrap_db_retry](https://review.openstack.org/#/c/527362/)。4个多月后，终于合入了。写这篇文章主要是为了记录一下自己学习的过程，以及对死锁及其重试机制的思考。


### 1. 死锁与重试
#### 1.1 从死锁说起
我们先看看MySQL的文档中对死锁的定义：
> A deadlock is a situation where different transactions are unable to proceed because each holds a lock that the other needs. Because both transactions are waiting for a resource to become available, neither ever release the locks it holds.

大致意思就是说，死锁是由于每个事务持有另一个事务需要的锁，而导致不同事务都无法继续。因为两个事务都在等待资源变为可用，所以都不释放它拥有的锁。

一个非常形象的例子如下所示：
![20ca9f2e2faf856e15933d95fd0a6a32_articlex](https://user-images.githubusercontent.com/1736354/38969913-22e76700-43c5-11e8-8ae6-f4b7b6829a14.jpg)
来自4个路口的车“死锁”了，每个路口的车都无法前进，因为自己前行的道路，都被别的路口的车堵住了，而自己因为无法前进也无法释放自己的道路。

#### 1.2 从容的应对死锁
当死锁发生的时候，我们能做什么呢？在Mysql的文档中[How to Minimize and Handle Deadlocks](https://dev.mysql.com/doc/refman/5.7/en/innodb-deadlocks-handling.html)，给出了一些建议，下面我列举几个通用和常见的条目：
> * Always be prepared to re-issue a transaction if it fails due to deadlock. Deadlocks are not dangerous. Just try again.
如果发生了死锁错误了以后随时准备重试，死锁并不危险，放心大胆的重试吧
> * Keep transactions small and short in duration to make them less prone to collision.
让事务尽可能的小而短，减少冲突的可能。
> * Commit transactions immediately after making a set of related changes to make them less prone to collision.
提交事务的时候，也是能提交就尽可能地立刻提交
> * When modifying multiple tables within a transaction, or different sets of rows in the same table, do those operations in a consistent order each time. Then transactions form well-defined queues and do not deadlock. For example, organize database operations into functions within your application, or call stored routines, rather than coding multiple similar sequences of INSERT, UPDATE, and DELETE statements in different places.
当在一个事务中修改不同的表，或者表中不同行的时候，尽量保持一致的顺序。

另外，还提及了一些其他的应对策略，比如调整事务隔离的级别，锁的级别，优化索引的定义之类的，大多数是以预防为主。当发生死锁的时候，我们也应该首先想到是不是这些情况没有处理好，然而，当死锁真正发生的时候，我们还是用最土但最有效的方法去解决：重试！

#### 1.3 重试？没那么简单
在重试机制的实现中，重试时长的选择非常关键，有两个因素需要我们仔细思考一下：

(1) **退避机制-等待的基数时间**。
目前时间的基数是，随着重试次数指数增长的，这个基数对于连接失败类的业务是比较有用的，想象一下，这种类型的业务我们重试的目的说白了就是：**“过一段时间，试一试，看看能不能正常连上”**。

退避策略的选择可以分为普通退避策略和指数退避策略。普通退避策略：也就是傻傻固定间隔的重试，比如，每次重试的时间都是x秒；
而还有一种方式就是指数退避：随着重试次数的增加，我们每次等待的时间也会逐渐递增，1秒，2秒，4秒，8秒，16秒等等。

在[Exponential Backoff And Jitter](https://amazonaws-china.com/blogs/architecture/exponential-backoff-and-jitter/)一文中，也提到了指数退避、普通退避策略，并且附上了实际的仿真结果：
![exponential-backoff-and-jitter-blog-figure-4](https://user-images.githubusercontent.com/1736354/38991051-fe6a7152-440e-11e8-808e-01a0c60f81d6.png)

从图上看到，完成同样的事情，使用指数退避时，总的调用次数变少了。尤其在客户端竞争比较多的时候，指数退避的效果很明显。这个指数退避说白了就是：**“再多等一会儿，别急这那么快就重试”**。

(2) **随机因子-抖动时间窗口**。
不加随机因子的问题是，即使我们大家一起等待了很久，但是还是同时去调用的，没有这个抖动，而单单的增加等待时间基数，只会激增等待时间，而对实际的冲突避免没有什么意思。

我们思考下，对于死锁这种场景来说，我们真的需要很长的等待时间吗？我觉得其实并不需要很长的“等待的基数时间”，我们需要的只是让各种死锁的请求，互相避开即可，所以其实，只需要拉长等待的时间窗口即可。

![jitter](https://user-images.githubusercontent.com/1736354/34139128-e2a3ddfc-e4ad-11e7-88fa-937a926d7f37.jpg)


##### 3.1.1. Non-Jitter，无随机
无随机的方式，就是oslo.db目前使用的方式，仅指数增长，等待时间为1秒，2秒，4秒，8秒。

##### 3.1.2. Full Jitter，全量随机
在退避sleep的时候，加入随机机制，使得sleep的时间随机化，指数拉长调用的窗口，从而降低再次死锁概率。加上这个jitter后，等待时间变为0\~1秒，0\~2秒，0\~4秒，0\~8秒，0\~16秒等范围内随机。

##### 3.1.3. Top X Jitter，顶部随机
除了全量随机因子外，我们也可以选择顶部随机的方式，保底的等待基数时间随指数递增，在基数时间的上沿边界向下抖动（比如25%）。这种方法来说既保留了“安全”的重试时间，而且抖动时间窗口也在递增。例如我们25%的都抖动随机，等待时间就为1\*0.75\~1秒，2\*0.75\~2秒，4\*0.75\~4秒，8\*0.75\~8秒，16\*0.75秒\~16秒。

##### 3.1.4. Other Jitter，其他随机方式
另外，在[Exponential Backoff And Jitter](https://amazonaws-china.com/blogs/architecture/exponential-backoff-and-jitter/)一文中，介绍了各种随机时间窗口加到退避算法中的流程后，对平均时间和竞争的调用数也做了一个仿真。结果如下图所示：

![simuj](https://user-images.githubusercontent.com/1736354/39026065-903c4cea-447d-11e8-85db-1a2fc168fdc1.jpg)

很显然，其中，Fulljitter（0~2**n随机）的抖动范围大，平均抖动时间比较低，因此，从平均时间和冲突避免(总调用数)这两个指标综合看，Fulljitter是获胜的。但这并不意味着在所有情况下，我们都需要很低的时间间隔，更长的时间会拥有更“安全”的重试时间，代价则是更耗时了，我想这确实是一个值得思考的tradeoff。

随机重试时间的选取，我们需要更多的结合业务去看，如果重试的业务是由于竞争冲突引起的（就像死锁），那么，我们就要通过抖动的范围将冲突化解；而如果重试的业务是由于服务暂时不可用，但是可用的时间我们并不确定，这样我们就可以通过增加基数时间来避免无谓的尝试。

总结一下就是：**通过指数退避机制递增的基数时间，来避免无谓的尝试，通过随机因子机制递增的抖动窗口，来减少冲突的可能**。

### 2. oslo.db的改进 
#### 2.1 oslo.db的重试实现
在得到了充分的理论知识的洗礼后，我们回过头来看看，oslo.db的重试机制的实现。
```Python
# 重试的基数时间 
next_interval = self.retry_interva
# 重试的最大次数
remaining = self.max_retries
while True:
    try:
        # 调用需要重试的函数
        return f(*args, **kwargs)
    except Exception as e:
        # 是否继续重试，不继续就reraise
        expected = self._is_exception_expected(e)
        # reraise
        # 休息next_interval秒
        time.sleep(next_interval )
        # 判断是否递增重试时间
        if self.inc_retry_interval:
        # 指数递增，并不超过最大重试时间
            next_interval = min(next_interval * 2, self.max_retry_interval)
        # 剩余次数
        remaining -= 1
```
我将核心的代码提炼出来，我们来分析一下各个入参的作用
* retry_interval：重试的间隔，即基数时间，默认为1秒，即第一次重试1秒
* max_retries：最大重试的次数，默认为20次，即试20次就不试了，并通过内部变量remaining来记录剩余次数
* inc_retry_interval：是否递增最大重试次数，目前为指数递增
* max_retry_interval：最大的重试间隔
* exception_checker：需要进行重试的异常

可以看到，目前的机制就是我们上文所提到的“指数退避机制”。也就是说，并没有增加随机因子jitter进来。

#### 2.2 优化！
于是，这个优化的Patch就诞生了：[Improve exponential backoff for wrap_db_retry](https://review.openstack.org/#/c/527362/)。核心做了2件事情：
1. 通过增加随机因子jitter参数，为重试机制增加随机抖动的能力。
2. 在产生死锁的时候，默认启用随机抖动的能力，其中jitter为全量抖动。

```Python
if self.inc_retry_interval:
# NOTE(jiangyikun): In order to minimize the chance of
# regenerating a deadlock and reduce the average sleep
# time, we are using jitter by default when the
# deadlock is detected. With the jitter,
# sleep_time = [0, next_interval), otherwise, without
# the jitter, sleep_time = next_interval.
if isinstance(e, exception.DBDeadlock):
	jitter = True
else:
	jitter = self.jitter
sleep_time, next_interval = self._get_inc_interval(next_interval, jitter)
```
其中，抖动时间的计算如下：
```Python
def _get_inc_interval(self, n, jitter):
	# NOTE(jiangyikun): The "n" help us to record the 2 ** retry_times.
	# The "sleep_time" means the real time to sleep:
	# - Without jitter: sleep_time = 2 ** retry_times = n
	# - With jitter:    sleep_time = [0, 2 ** retry_times) < n
        # 指数增加重试时间间隔
	n = n * 2
        # 全量随机抖动
	if jitter:
		sleep_time = random.uniform(0, n)
	else:
		sleep_time = n
	return min(sleep_time, self.max_retry_interval), n
```

这个Patch也在4个月后的几天前，完成了合入。下面也记录一下相关的讨论：
* **Michael Bayer（SQLAlchemy的作者）** 也提出了一个[思路](https://review.openstack.org/#/c/527362/1/oslo_db/api.py@178)，就是类似于上文Top X Jitter的随机因子，我和他解释了对于死锁的重试，其实并不需要太多的基数时间，也将aws那个文章给贴上了，最终得到了他的认可。
* **Ben Nemec (oslo的现任PTL)**，认为可以通过deadlock识别以及用户手动指定两种方式来开启这个随机因子。
* **Jay Pipes (Nova Core, MySQL Contributer)**，提到了一个叫做[tenacity](https://github.com/jd/tenacity)的retry库，说未来也可以考虑用这个取代，库的作者还专门为这个“重试”的轮子写了一篇文章：[Get back up and try again: retrying in Python](https://julien.danjou.info/python-retrying/)，感兴趣的可以读读。

### 参考链接
1. Exponential Backoff And Jitter. [链接1](https://amazonaws-china.com/blogs/architecture/exponential-backoff-and-jitter/) [链接2](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
2. Deadlocks in InnoDB https://dev.mysql.com/doc/refman/5.7/en/innodb-deadlocks.html
3. Get back up and try again: retrying in Python https://julien.danjou.info/python-retrying/
4. Improve exponential backoff for wrap_db_retry https://review.openstack.org/#/c/527362/