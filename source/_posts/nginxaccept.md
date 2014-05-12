title    : nginx建立连接过程分析
category : nginx源码学习
tags     : 
date     : 2014-04-01
---

*   [1. 概述](#abstract)
*   [2. 建立连接过程](#accept)
*   [3. 负载均衡问题](#balance)

<h3 id="abstract"><a>1. 概述</a></h3>
本文主要学习了nginx连接accept的步骤，以及nginx的负载均衡的方法。
<!--more-->
<h3 id="accept"><a>2. 建立连接过程</a></h3>
处理新链接事件的回调函数是ngx_event_accept函数，当处理建立连接事件的时候就调用ngx_event_accept函数。该函数的具体步骤如下所示。

1.调用accpet方法。

		s=accept(lc->fd, (struct sockaddr *)sa, &socklen)

2.设置负载均衡的阈值。

		ngx_accept_disabled = ngx_cycle->connection_n/8 - ngx_cycle->free_connection_n;

3.从连接池获取连接。

		c = ngx_get_connection(s, ev->log);

4.给连接分配内存空间。

5.设置套接字属性，设置非阻塞
		ngx_nonblocking(s)

6.将连接加入事件循环。
		ngx_add_conn(c)

		#define ngx_add_conn         ngx_event_actions.add_conn

7.调用监听对象的回调方法。

<h3 id="balance"><a>3. 负载均衡问题</a></h3>
在建立连接前需要使用ngx_trylock_accept_mutex()去“抢锁”，抢到锁了之后，才有资格去accept连接。

代码比较简单，拿出来分析一下

		ngx_int_t
		ngx_trylock_accept_mutex(ngx_cycle_t *cycle)
		{
			//尝试锁，无论取到还是未取到，均立即返回，取到返回1，否则返回0。
		    if (ngx_shmtx_trylock(&ngx_accept_mutex)) {

		        ngx_log_debug0(NGX_LOG_DEBUG_EVENT, cycle->log, 0,
		                       "accept mutex locked");
		    
		        if (ngx_accept_mutex_held
		            && ngx_accept_events == 0
		            && !(ngx_event_flags & NGX_USE_RTSIG_EVENT))
		        {
		            return NGX_OK;
		        }
		    	//将所有读事件加入epoll
		        if (ngx_enable_accept_events(cycle) == NGX_ERROR) {
		            ngx_shmtx_unlock(&ngx_accept_mutex);
		            return NGX_ERROR;
		        }

		        ngx_accept_events = 0;
		        ngx_accept_mutex_held = 1;

		        return NGX_OK;
		    }

		    ngx_log_debug1(NGX_LOG_DEBUG_EVENT, cycle->log, 0,
		                   "accept mutex lock failed: %ui", ngx_accept_mutex_held);
		    //未取到锁，ngx_accept_mutex_held还为1，则删除所有监听的读事件
		    if (ngx_accept_mutex_held) {
		        if (ngx_disable_accept_events(cycle) == NGX_ERROR) {
		            return NGX_ERROR;
		        }

		        ngx_accept_mutex_held = 0;
		    }

		    return NGX_OK;
		}

总结一下就是说，拿到锁了，就监听事件，拿不到就不能监听。若ngx_accept_mutex_held为1，则拥有了把accept事件加入到自己的ngx_posted_accept_events的权利。