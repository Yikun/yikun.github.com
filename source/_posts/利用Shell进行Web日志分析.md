title: 利用Shell进行Web日志分析
tags:
  - Linux
number: 23
date: 2015-05-21 00:24:48
---

#### 1.Web日志

Web日志由Web服务器产生，比如Nginx、Apache等。例如一条Nginx的日志格式可能是这样的：

> 222.68.172.190 - - [18/Sep/2013:06:49:57 +0000] "GET /images/my.jpg HTTP/1.1" 200 19939
>  "http://www.angularjs.cn/A00n" "Mozilla/5.0 (Windows NT 6.1)
>  AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36"

可以拆解为以下8个变量

> remote_addr: 记录客户端的ip地址, 222.68.172.190
> remote_user: 记录客户端用户名称, –
> time_local: 记录访问时间与时区, [18/Sep/2013:06:49:57 +0000]
> request: 记录请求的url与http协议, “GET /images/my.jpg HTTP/1.1″
> status: 记录请求状态,成功是200, 200
> body_bytes_sent: 记录发送给客户端文件主体内容大小, 19939
> http_referer: 用来记录从那个页面链接访问过来的, “http://www.angularjs.cn/A00n”
> http_user_agent: 记录客户浏览器的相关信息, “Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36″
#### 提取最近10分钟的日志：

思路一：利用awk提取时间，并做字符串比较

``` bash
# 在OSX环境下，需要安装coreutils保证`date`等指令正常使用
# brew install coreutils
tac log | 
awk 'BEGIN{
    # 获取时间至min10
    "date -d \"-10 minute\" +\"%H:%M:%S\"" | getline min10 
} 
{
    # 日志时间和当前时间比较
    if (substr($4,14) > min10) 
        print ;
    # 若一次不匹配则退出
    else 
        exit;
}' |
tac
```

思路二：利用grep的正则匹配，捕获满足条件的时刻

``` bash
cat log | grep -E "19/Sep/2013:06:2[4-9]|19/Sep/2013:06:3[0-3]"
```

思路三：使用sed的地址(时刻必须出现)

``` bash
cat log | sed -n '/19\/Sep\/2013:06:24/,//19\/Sep\/2013:06:33/p'
```
#### 统计某个接口(xxxapi)访问量和QPS

``` bash
# cat log | grep xxxapi | wc -l
query=$(cat log | grep -c xxxapi)
t=60
qps=$((query/$time))
```
#### 参考资料

[海量Web日志分析 用Hadoop提取KPI统计指标](http://blog.fens.me/hadoop-mapreduce-log-kpi/)
[shell脚本每天自动统计网站访问日志](https://www.centos.bz/2012/11/shell-scrpit-auto-count-log/)
[如何用Shell截取nginx最近10分钟的日志](http://www.oschina.net/question/42741_115440)
[如何用awk从日志文件中找到时间范围的数据](http://bbs.chinaunix.net/thread-4096403-1-1.html)
