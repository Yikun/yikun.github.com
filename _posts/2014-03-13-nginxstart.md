--- 
layout   : post
title    : nginx启动流程分析
category : nginx源码学习
tags     : 
tagline  : 
---

*   [1.解析命令参数。](#getopt)
*   [2.初始化工作](#init)
*   [3.信号处理的初始化](#siginit)
*   [4.守护进程](#daemon) 
*   [5.ngx_master_process_cycle，mater干的活](#ngx_master_process_cycle)
*   [6.master开始工作](#ngx_master)
*   [7.ngx_worker_process_cycle，worker开始工作](#ngx_worker)

-------

最近，开始学习nginx的代码，大致根据[阿里数据平台](http://www.alidata.org/archives/category/%E9%AB%98%E6%80%A7%E8%83%BD%E6%9C%8D%E5%8A%A1%E5%99%A8)的一些文章，加上Tengine 2.0的代码来看的。这次看代码主要是了解一下nginx的基本框架和主要工作流程。

如下图所示，为总的启动流程分析，后面是我对每个部分的总结和分析
![启动流程分析](/assets/post/2014-03-13-nginxstart/nginx_start.png)

-------

<h3 id="getopt"><a>1.解析命令参数。</a></h3>

nginx是由C语言写成的，因此，从main函数开始开启我们的“旅程”，传入参数为argc，还有argv，最开始的任务当然就是解析它们了，以获得用户启动的参数，调用ngx_get_options解析参数，一般情况，Linux的解析命令参数都会调用getopt之类的系统函数，而nginx却没有，应该是考虑到了跨平台性。解析命令参数的代码比较简单，大致的工作就是标记flag，类似ngx_show_version，ngx_show_modules的全局参数可以记录命令参数。
而后，根据这些flag来做一些事情，例如使用nginx -h，会将ngx_show_version，ngx_show_help置为有效(1)，然后后面回到main后，就是做一些对应的输出。

-------
<h3 id="init"><a>2.初始化工作。</a></h3>


包括了time、regex、log、ssl等初始化，而后进行一个很重要的结构的初始化ngx_cycle。
{% highlight c %}
struct ngx_cycle_s {
    void                  ****conf_ctx;						//配置上下文数组(含所有模块)
    ngx_pool_t               *pool;						//内存池

    ngx_log_t                *log;						//日志
    ngx_log_t                 new_log;

    ngx_connection_t        **files;						//连接文件
    ngx_connection_t         *free_connections;					//空闲连接
    ngx_uint_t                free_connection_n;				//空闲连接个数

    ngx_queue_t               reusable_connections_queue;			//再利用连接队列

    ngx_array_t               listening;					//监听数组
    ngx_array_t               paths;						//路径数组
    ngx_list_t                open_files;					//打开文件链表
    ngx_list_t                shared_memory;					//共享内存链表

    ngx_uint_t                connection_n;					//连接个数
    ngx_uint_t                files_n;						//打开文件个数

    ngx_connection_t         *connections;					//连接
    ngx_event_t              *read_events;					//读事件
    ngx_event_t              *write_events;					//写事件

    ngx_cycle_t              *old_cycle;					//old cycle指针

    ngx_str_t                 conf_file;					//配置文件
    ngx_str_t                 conf_param;					//配置参数
    ngx_str_t                 conf_prefix;					//配置前缀
    ngx_str_t                 prefix;						//前缀
    ngx_str_t                 lock_file;					//锁文件
    ngx_str_t                 hostname;						//主机名
};
{% endhighlight %}

ngx_init_cycle的过程的详细情况可以参考[Nginx启动初始化过程(二)](http://www.alidata.org/archives/1148)。因为现在功力不是很深，等以后对nginx有透彻了解后，再仔细分析。这里第一次出现了内存池的操作，后面重点分析一下内存池的实现。

-------
<h3 id="siginit"><a>3.信号处理的初始化</a></h3>

ngx_init_signals会进行信号处理的初始化，signals是一个结构体数组，存储着各种信号的结构体，在初始化的过程中，会利用sigaction函数对每个信号进行设置，如下所示，主要是对signo和handler回调函数进行设置。初始化成功以后，当信号产生以后，便可以调用信号处理函数了，因此可以利用ngx_signal_handler进行信号处理了。
{% highlight c %}
ngx_int_t
ngx_init_signals(ngx_log_t *log)
{
    ngx_signal_t      *sig;
    struct sigaction   sa;

    for (sig = signals; sig->signo != 0; sig++) {
        ngx_memzero(&sa, sizeof(struct sigaction));
        sa.sa_handler = sig->handler;
        sigemptyset(&sa.sa_mask);
        if (sigaction(sig->signo, &sa, NULL) == -1) {
            ngx_log_error(NGX_LOG_EMERG, log, ngx_errno,
                          "sigaction(%s) failed", sig->signame);
            return NGX_ERROR;
        }
    }

    return NGX_OK;
}

{% endhighlight %}

--------
<h3 id="daemon"><a>4.守护进程</a></h3>

在启动过程中，会调用ngx_daemon(cycle->log)，这个函数实现的很经典。
{% highlight c %}
ngx_int_t
ngx_daemon(ngx_log_t *log)
{
    int  fd;
    //父进程fork
    switch (fork()) {
    //fork执行完后，master的
    case -1:
    	//fork出错了
        ngx_log_error(NGX_LOG_EMERG, log, ngx_errno, "fork() failed");
        return NGX_ERROR;
    case 0:
    	//master daemon(子进程)什么也不做
        break;

    default:
    	//master前台进程(父进程)退出，以给控制终端一个“假象”，这个程序执行完了
        exit(0);
    }
    /*
    执行到这，说明最开始的“前台”进程已经退出了，这时得刷新下ngx_pid，以便后面ngx_create_pidfile用(用来优雅的重启)
    当然，有人问为什么main最开始就记录了，ngx_pid呢？那是因为nginx不一定会daemon形式启动，这样开始的进程就是master
    然而在这里，nginx将原来的前台master exit掉，然后master fork出来的，所以这里的ngx_pid就是就是daemon master的了。
    */
    ngx_pid = ngx_getpid();
    /*
    作为daemon只fork还是不够的，需要第二步，setsid，他的作用是让daemon成为真正的daemon
    1.会话组的老大; 2.进程组的老大; 3.不受任何控制终端控制
    */
    if (setsid() == -1) {
        ngx_log_error(NGX_LOG_EMERG, log, ngx_errno, "setsid() failed");
        return NGX_ERROR;
    }
    //umask(0)是为了让读写权限保持原来的状态
    umask(0);

    //后面几句就是把STD的输入/输出/错误都输出到/dev/null，也就是什么也不输出
    fd = open("/dev/null", O_RDWR);
    if (fd == -1) {
        ngx_log_error(NGX_LOG_EMERG, log, ngx_errno,
                      "open(\"/dev/null\") failed");
        return NGX_ERROR;
    }

    if (dup2(fd, STDIN_FILENO) == -1) {
        ngx_log_error(NGX_LOG_EMERG, log, ngx_errno, "dup2(STDIN) failed");
        return NGX_ERROR;
    }

    if (dup2(fd, STDOUT_FILENO) == -1) {
        ngx_log_error(NGX_LOG_EMERG, log, ngx_errno, "dup2(STDOUT) failed");
        return NGX_ERROR;
    }

#if 0
    if (dup2(fd, STDERR_FILENO) == -1) {
        ngx_log_error(NGX_LOG_EMERG, log, ngx_errno, "dup2(STDERR) failed");
        return NGX_ERROR;
    }
#endif

    if (fd > STDERR_FILENO) {
        if (close(fd) == -1) {
            ngx_log_error(NGX_LOG_EMERG, log, ngx_errno, "close() failed");
            return NGX_ERROR;
        }
    }

    return NGX_OK;
}
{% endhighlight %}

守护进程指的是后台运行不与任何控制终端相联的进程，许多网络服务器都作为守护进程运行。那么，什么样的进程才是守护进程呢？2种方法:

        1. 这个进程是“富二代“，由内核无终端启动;
        2. 是靠自己后天努力，这个后天努力需要借助setid的帮助，新建一个会话，这样这个进程就成老大了，而且不受任何终端控制。

注释已经写的很详细了，总结一下就是以下几步。

        1. fork一个daemon进程，退出前台进程。
        2. setsid 让daemon彻底脱离控制终端（如果没用这步的话，就会造成终端一退出，进程也就退了）
        3. umask(0)
        4. 不让他输入输出
        5. 改变目录，避免父进程工作目录的影响（nginx没做）
        6. 关闭没用的fd

这个是APUE中提到的6步。当然，也有人建议进行第二次fork，二次fork的原因是不让进程重新被终端控制。是这样的，如果一个进程是一个不属于任何一个终端的会话组的首进程，当这个进程打开终端的时候，系统就会为他分配一个终端，这样就惨了，它又要受终端控制了(一个会话组的首进程如果不属于任何终端，则该进程打开终端时会被分配终端，一个会话如果属于某个终端，就会有一个前台进程组)，也就做不成守护进程了。不过要是二次fork的话，daemon A fork 出来 daemon B，这个daemon B不是会话首进程，就不会被分配到终端控制了。但是nginx没做，我觉得可能是因为nginx不会作类似操作吧。
注：不过2次fork，要记得Sighnal(SIG_HUP, SIG_IGN)，否则daemon A作为首进程退出的时候，会告诉所有的小弟(包括B了)。

具体的守护进程参考UNP和APUE中的资料。

---------
<h3 id="ngx_master_process_cycle"><a>5.ngx_master_process_cycle，mater干的活</a></h3>


在完成main中的初始化后，我们的“初始化”旅程到了结尾，热身结束，开始重点。到调用这个函数的时候，nginx还是只有master进程的，作为master进程的开始工作，最终要的就是启动“work”进程。其实，很多软件都有master，work的概念，诸如Hadoop的jobtracker、tasktracker。master处理和用户的交互，然后work专心的去做业务，这样的话，master可以想象为一个管理者，work则是真正的工人。

屏蔽一下干扰

{% highlight c %}
    sigemptyset(&set);
    sigaddset(&set, SIGCHLD);
    sigaddset(&set, SIGALRM);
    sigaddset(&set, SIGIO);
    sigaddset(&set, SIGINT);
    sigaddset(&set, ngx_signal_value(NGX_RECONFIGURE_SIGNAL));
    sigaddset(&set, ngx_signal_value(NGX_REOPEN_SIGNAL));
    sigaddset(&set, ngx_signal_value(NGX_NOACCEPT_SIGNAL));
    sigaddset(&set, ngx_signal_value(NGX_TERMINATE_SIGNAL));
    sigaddset(&set, ngx_signal_value(NGX_SHUTDOWN_SIGNAL));
    sigaddset(&set, ngx_signal_value(NGX_CHANGEBIN_SIGNAL));

    if (sigprocmask(SIG_BLOCK, &set, NULL) == -1) {
        ngx_log_error(NGX_LOG_ALERT, cycle->log, ngx_errno,
                      "sigprocmask() failed");
    }

    sigemptyset(&set);
{% endhighlight %}
最开始的工作就是做一些信号处理的工作，首先将系统信号，nginx自定义的信号加入'sigset_t set;'信号集中，然后调用sigprocmask进行信号的屏蔽，函数为 'sigprocmask(SIG_BLOCK, &set, NULL)' ，第一个参数为SIG_BLOCK意思就是按照set屏蔽信号，也就是说把之前通过 'sigaddset' 的10个信号都屏蔽掉了，以防止在fork Work的过程中发生的意外。

--------
<h3 id="ngx_master"><a>6.master开始工作</a></h3>

master进程在屏蔽完信号干扰后，便调用了ngx_start_worker_processes来启动worker进程，这个函数的核心就是一个for循环，调用ccf->worker_processes次ngx_spawn_process函数，fork了ccf->worker_processes个worker。

ngx_spawn_process则是真正fork worker的函数。


{% highlight c %}
    pid = fork();

    switch (pid) {

    case -1:
        ngx_log_error(NGX_LOG_ALERT, cycle->log, ngx_errno,
                      "fork() failed while spawning \"%s\"", name);
        ngx_close_channel(ngx_processes[s].channel, cycle->log);
        return NGX_INVALID_PID;

    case 0:
        ngx_pid = ngx_getpid();
        proc(cycle, data);
        break;

    default:
        break;
    }
{% endhighlight %}

又是熟悉的fork了，能进入case 0的就是worker进程。而master进程则继续ngx_master_process_cycle，在worker都被master fork出来之后，master就要正常开始他的工作了
{% highlight c %}
for ( ;; ) {
// ... 
	sigsuspend(&set);
// ...
}
{% endhighlight %}

这个就是master的工作框架，简单吧？就是休眠，等信号，做事儿，再休眠，等信号，做事儿。sigsuspend(&set);就是让进程休眠，直到有信号的时候，去处理。

在main开始初始化的时候，就通过'ngx_init_signals'对每个信号的回调函数进行[初始化](./#siginit)，也就是说，每次信号来了都会调用 'ngx_signal_handler' 去设全局的flag，如果有信号了，master的 'ngx_master_process_cycle' 就会对这些全局flag进行对应的处理。

最后，总结一下master的工作，就是先把信号都屏蔽了，然后去fork worker进程，fork完work以后，master就进入信号处理的循环了，利用sigsuspend等信号，等到信号就处理，处理完了再sigsusoend，如此循环，完成伟大的幕后工作。

--------
<h3 id="ngx_worker"><a>7.ngx_worker_process_cycle，worker开始工作</a></h3>


worker开始工作的真正时候，应该是在master调用ngx_spawn_process之后的，master传入的proc参数就是ngx_worker_process_cycle函数指针，再回到刚才master中那个fork的过程，case 0的时候调用了proc(cycle, data);也就是相当与调用了ngx_worker_process_cycle，这样worker的工作也马不停蹄的开始了。

首先，惯例，进行初始化，ngx_worker_process_init，这里面就包括了自身的初始化，还有去除一下从master过来的没用的东西，比如sigprocmask一下，把之前master的屏蔽掉信号都开启了。这样，才能对master的信号进行处理，以便完成master和work的进程间的通信。

然后就开始真正的工作了，也是一个大循环。

{% highlight c %}
for ( ;; ) {
// ... 
    ngx_process_events_and_timers(cycle)
// ...
}
{% endhighlight %}

到此worker的框架也就这样了，然后for循环的底部会有一些对master发来的信号的处理。

至此，master和worker的初始化工作以及基本的框架算是完了，经过上面的学习以后，发现对nginx的整个流程有了一个大概的认识。学习初始化的过程中，我学到了daemon，多进程，信号处理等基本知识。