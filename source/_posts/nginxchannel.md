title    : nginx中channel机制
category : nginx源码学习
tags     : 
date     : 2014-03-16
---

*   [1.概述](#abstract)
*   [2.worker进程的创建](#worker)
*   [3.nginx频道](#siginit)
*   [4.master写入与worker读取数据](#read) 
*   [5.nginx中channel指令](#channelcmd)
<!--more-->
-------
<h3 id="abstract"><a>1.概述</a></h3>
由于nginx使用的是多进程的模型，因此，进程间的通信或者同步很重要，为什么要进行进程同步呢？我们知道，nginx有master和worker进程，在上篇文章已经分析过了master具体是怎样创建worker进程的。不过，在创建worker进程的时候，是需要对进程同步的。举个具体的例子，我们假设服务器共有4个worker进程，我们知道nginx有一个全局变量，是ngx_processes数组，他存储着所有进程的信息，在worker1创建的时候，worker2，worker3，worker4进程是没有创建的，因此，这个时候就牵扯到同步，最合理的方式是，在master创建一个进程的时候，就应该通知所有子进程有新的进程被fork了，以及这个进程的基本信息。

这个好比一个集体(由很多processes组成)，当有新的成员加入这个集体的时候，老大应该告诉大伙，有新成员进来了，他的基本信息是balabala。因此，也就引出了本文所要总结的内容，即nginx的进程通信机制。

-------

<h3 id="worker"><a>2.worker进程的创建</a></h3>
我们先回顾一下worker进程的创建过程，ngx_master_process_cycle -> ngx_start_worker_processes，在 `ngx_start_worker_processes` 函数中，有下面的代码


    static void
    ngx_start_worker_processes(ngx_cycle_t *cycle, ngx_int_t n, ngx_int_t type)
    {
        ngx_int_t      i;
        ngx_channel_t  ch;

        ngx_log_error(NGX_LOG_NOTICE, cycle->log, 0, "start worker processes");

        ch.command = NGX_CMD_OPEN_CHANNEL;

        for (i = 0; i < n; i++) {

            ngx_spawn_process(cycle, ngx_worker_process_cycle,
                              (void *) (intptr_t) i, "worker process", type);

            ch.pid = ngx_processes[ngx_process_slot].pid;
            ch.slot = ngx_process_slot;
            ch.fd = ngx_processes[ngx_process_slot].channel[0];

            ngx_pass_open_channel(cycle, &ch);
        }
    }


注意观察下， `ngx_channel_t` 结构体的定义如下：


    typedef struct {
         ngx_uint_t  command;
         ngx_pid_t   pid;
         ngx_int_t   slot;
         ngx_fd_t    fd;
    } ngx_channel_t;


没错，这个就是master与worker进程通信的最重要的结构，短小精汗。

该结构封装了四个变量，分别是指令(master要worker干啥)，pid(worker的进程id)，slot(worker进程在ngx_processes的索引)，文件描述符。我们思考一下概述中的那个问题，怎么将master后创建的进程通知前面已创建的进程。 `ngx_pass_open_channel(cycle, &ch);` 注意一下这个函数，没错就是它了，通过它对每个进程进行通知。

----------

<h3 id="channel"><a>3.nginx频道</a></h3>
那么具体又是怎么实现通知的呢？我们看到在 `ngx_channel_t` 中有一个 `ngx_fd_t    fd;` 这个文件描述便存储着通信的“接口”，从之前的代码我们看出来， `ch.fd = ngx_processes[ngx_process_slot].channel[0];` 这个channel[0]是真正传输的接口。那么他是什么呢？简单的说，就是master写给每个process的channel[0]一些信息(ngx_channel_t的实际内容)，worker就能在自己的channel[1]中，读取到这些信息。

nginx使用的是 `socketpair` 方法关联套接字，我们看看socketpair的原型：

    int socketpair(int d, int type, int protocol, int sv[2]);


我们关注一下第四个参数，当这个socketpair函数执行成功后，就会生成一个socket对在数组中，sv[2]中的socket是关联起来的，什么意思呢？就是说向sv[0]写数据，在sv[1]就能读到相应的数据；相反的，在sv[1]写数据，在sv[0]也可以读到相应的数据。在master进程fork worker进程的时候，也把这个套接字传给了worker，也就是说在master向worker的sv[0]写数据，那么worker便可以在自己的sv[1]中读到数据。

![nginx_channel](/assets/post/2014-03-16-nginxchannel/nginx_channel.png)

nginx的具体的实现方式如上图所示：
channel[0]和channel[0]为一对socketpair。

    1. 向channel[0]写数据时，可从channel[1]读数据；
    2. 向channel[1]写数据时，可从channel[0]读数据。
    
而nginx，只利用了第一条，即master向channel[0]写数据时，worker可从channel[1]读数据
socketpair也用来进行父子进程的通信，子进程会继承父进程的资源。


<h3 id="read"><a>4.master写入与worker读取数据</a></h3>

我们具体的来看下nginx写入数据的过程，

    ngx_write_channel(ngx_processes[i].channel[0],
                              ch, sizeof(ngx_channel_t), cycle->log);

和上节介绍的一样，我们看到master对每一个ngx_processes[i].channel[0]写入数据。并且写入的数据就是 `ngx_channel_t` 变量。
好了，既然master向worker写数据的接口有了，那么woker又怎么对master写入的数据进行读取和处理呢？

我们目光移到worker进程上面，ngx_worker_process_cycle函数，在初始化时，调用了 `ngx_worker_process_init` 函数，这个初始化函数又调用了

    ngx_add_channel_event(cycle, ngx_channel, NGX_READ_EVENT,ngx_channel_handler)

这个就利用了nginx强大的事件机制，这个函数大概的功能就是，如果worker channel[1]有可读的数据，便会调用  `ngx_channel_handler`  进行处理。


    switch (ch.command) {

    case NGX_CMD_QUIT:
        ngx_quit = 1;
        break;

    case NGX_CMD_TERMINATE:
        ngx_terminate = 1;
        break;

    case NGX_CMD_REOPEN:
        ngx_reopen = 1;
        break;

    case NGX_CMD_OPEN_CHANNEL:
        ...
        ngx_processes[ch.slot].pid = ch.pid;
        ngx_processes[ch.slot].channel[0] = ch.fd;
        break;

    case NGX_CMD_CLOSE_CHANNEL:
        ...
        if (close(ngx_processes[ch.slot].channel[0]) == -1) {
            ngx_log_error(NGX_LOG_ALERT, ev->log, ngx_errno,
                          "close() channel failed");
        }

        ngx_processes[ch.slot].channel[0] = -1;
        break;

    case NGX_CMD_PIPE_BROKEN:
        ngx_pipe_broken_action(ev->log, ch.pid, 0);
        break;
    }
 

由于nginx目前的读写数据只是单向的即mater-->worker，因此，这些指令的解析，都是需要让worker做一些事儿。我们可以关注一下 `NGX_CMD_OPEN_CHANNEL` 这个分支。在ngx_start_worker_processes函数中，master就向worker写入了 `NGX_CMD_OPEN_CHANNEL` 指令。

那么worker进程，便根据这个 `ngx_channel_t ch` 信息，更新processes数组。这样便完成了进程的同步。

--------------

<h3 id="channelcmd"><a>5.nginx中channel指令</a></h3>
我们发现，ngx_channel_handler中共有6个指令类型，分别是NGX_CMD_QUIT、NGX_CMD_TERMINATE、NGX_CMD_REOPEN、NGX_CMD_OPEN_CHANNEL、NGX_CMD_CLOSE_CHANNEL、NGX_CMD_PIPE_BROKEN。下面我们分析下，和channel相关的命令。

`NGX_CMD_OPEN_CHANNEL`
之前，我们已经分析了NGX_CMD_OPEN_CHANNEL信号的解析大致过程，现在仔细观察一下，我先搜索了一下使用`NGX_CMD_OPEN_CHANNEL`命令的地方，对`ch.command`赋值的地方有四处。第一处是用于worker进程的，第二、三处是和cache manager进程有关的，暂不关注，第四处，是`ngx_reap_children`主要是用于nginx重启后，重新开启channel的。

我们只分析第一处，master进程的函数`ngx_start_worker_processes` 在开启worker进程的时候，把命令设置为`NGX_CMD_OPEN_CHANNEL`，并且通过`ngx_write_channel`把指令给相应的进程，这样当worker进程解析这个消息时，便根据新进程的slot把新进程的信息(新进程的pid、新进程的channel[0])保存起来。
![nginx_open_channel](/assets/post/2014-03-16-nginxchannel/nginx_open_channel.png)

上图已经表明了`NGX_CMD_OPEN_CHANNEL`的传递与生效过程。
分为2个部分
1. Master部分。
    第一步，由Master进程创建socket pair，即创建channel，利用socketpair函数，master进程processes数组中存储了master与新的work的channel信息。
    第二步，2. Fork的子进程会继承父进程，Fork子进程，利用fork函数，子进程会继承父进程的资源。
    第三步，3. 利用ngx_pass_open_channel向各进程发送NGX_CMD_OPEN_CHANNEL，通知其他进程信息更新。
2.Worker部分。
    第一步，关闭除自己以外的channel[1]。
    第二步，关闭自己的channel[0]。

总结一下，这个命令就是告诉worker，有新的进程来，他OPEN_CHANNEL了，你得存起来，然后worker就存这个新进程的信息了，当然这个信息是存在processes数组里了。

`NGX_CMD_CLOSE_CHANNEL`
当然，与打开对应的就是关闭channel指令了，与这个命令相关的赋值只有一处，就是`ngx_reap_children`，当然就是master向每个进程更新信息，如果发现某个进程exited了，就告诉大家，可以把它的channel关闭了，即把这个channel的flag置为-1。而关闭的时候，`close(ngx_processes[ch.slot].channel[0])`关闭了channel[0]，先开始有疑问了，为什么只关0呢？1怎么办？原来1其实在work刚开始的时候就关闭了，即最开始就已经“关闭了除了自己外的channel[1]，然后再关闭自己的channel[0]。

总结一下，这个命令就是告诉work，你要关闭这个CHANNEL了，原因从目前的nginx代码来看，只有一个，就是需要重启。关闭已经exited的进程的channel。

不过，有些疑问，

1.目前来看只有master向worker的消息，不存在worker向master，或者worker向worker写了，那么为什么不关闭其他worker的channel[0]呢？我觉得可能是不是和cache load进程有关，后面再思考一下。

2.为什么master中要保留所有子进程channel[1]？可以在fork完子进程，就关闭，为什么不关闭呢？
