--- 
layout   : post
title    : nginx的连接池
category : nginx源码学习
tags     : 
tagline  : 
---

*   [1. 连接池的初始化](#connectionsinit)
*   [2. 连接的获取](#connectionget)
*   [3. 连接的获取](#connectionfree)

最近，有些忙，没看nginx代码，前几天去阿里实习面试了，结果还不错。:)让我激动的是二面面试我的居然是褚霸！面完了以后，还和他握了手。简直是激动得不能再激动啦。面试的时候也有很大收获，至少知道自己的路是对的，也应该加强自己后台开发的相关项目经历。加油吧！


<h3 id="connectionsinit"><a>1. 连接池的初始化</a></h3>

首先，初始化连接池，

    cycle->connections =
        ngx_alloc(sizeof(ngx_connection_t) * cycle->connection_n, cycle->log);
    if (cycle->connections == NULL) {
        return NGX_ERROR;
    }

我们可以看到cycle->connections被分配了一个足够的空间。

    i = cycle->connection_n;
    next = NULL;

    do {
        i--;

        c[i].data = next;
        c[i].read = &cycle->read_events[i];
        c[i].write = &cycle->write_events[i];
        c[i].fd = (ngx_socket_t) -1;

        next = &c[i];
    } while (i);

    cycle->free_connections = next;
    cycle->free_connection_n = cycle->connection_n;

初始化完成后，连接池的样子就想一个前一个元素的一个数组。最后，free_connection指向第一个元素。我们可以看下
我们可以看下，初始化后连接池情况：

![connections_init](/assets/post/2014-04-17-nginxconnections/connections_init.png)

现在的结果就是，沿着free-->connection-->connection就连成了一串，然后get的时候直接把free_connection拿出来就可以了，然后free_connection指向原来的那个next。

<h3 id="connectionget"><a>2. 连接的获取</a></h3>

    ngx_connection_t *
    ngx_get_connection(ngx_socket_t s, ngx_log_t *log)
    {
        ngx_uint_t         instance;
        ngx_event_t       *rev, *wev;
        ngx_connection_t  *c;

        /* disable warning: Win32 SOCKET is u_int while UNIX socket is int */

        if (ngx_cycle->files && (ngx_uint_t) s >= ngx_cycle->files_n) {
            ngx_log_error(NGX_LOG_ALERT, log, 0,
                          "the new socket has number %d, "
                          "but only %ui files are available",
                          s, ngx_cycle->files_n);
            return NULL;
        }

        /* ngx_mutex_lock */

        //把free_connections给c，最后会返回c
        c = ngx_cycle->free_connections;

        //连接池不够了
        if (c == NULL) {
            ngx_drain_connections();
            c = ngx_cycle->free_connections;
        }

        if (c == NULL) {
            ngx_log_error(NGX_LOG_ALERT, log, 0,
                          "%ui worker_connections are not enough",
                          ngx_cycle->connection_n);

            /* ngx_mutex_unlock */

            return NULL;
        }
        // free_connections指向下一个可用连接
        ngx_cycle->free_connections = c->data;
        ngx_cycle->free_connection_n--;

        /* ngx_mutex_unlock */

        if (ngx_cycle->files) {
            ngx_cycle->files[s] = c;
        }

        rev = c->read;
        wev = c->write;

        ngx_memzero(c, sizeof(ngx_connection_t));

        c->read = rev;
        c->write = wev;
        c->fd = s;
        c->log = log;

        instance = rev->instance;

        ngx_memzero(rev, sizeof(ngx_event_t));
        ngx_memzero(wev, sizeof(ngx_event_t));

        rev->instance = !instance;
        wev->instance = !instance;

        rev->index = NGX_INVALID_INDEX;
        wev->index = NGX_INVALID_INDEX;

        rev->data = c;
        wev->data = c;

        wev->write = 1;

        return c;
    }
我们可以看下，get了三次后的连接池情况：

![connections_get](/assets/post/2014-04-17-nginxconnections/connections_get.png)


<h3 id="connectionfree"><a>3. 连接的释放</a></h3>

下面是free_connection的过程，连接释放后，重新加入到连接池的过程很像链表在头指针后插入节点的操作(其实就是)，free之后，可能连接池的整体情况不像开始那样“整齐”，不过，我们把他当做链表来看，free_connection是头指针，通过c->data把指针一个一个串了起来，保证下次get的时候，get头节点的，free的时候，也是free头节点。

    void
    ngx_free_connection(ngx_connection_t *c)
    {
        /* ngx_mutex_lock */
        //free节点next指向
        c->data = ngx_cycle->free_connections;
        ngx_cycle->free_connections = c;
        ngx_cycle->free_connection_n++;

        /* ngx_mutex_unlock */

        if (ngx_cycle->files) {
            ngx_cycle->files[c->fd] = NULL;
        }
    }
我们可以看下，free了三次后的连接池情况：

![connections_free](/assets/post/2014-04-17-nginxconnections/connections_free.png)

以上就是连接池的基本操作。