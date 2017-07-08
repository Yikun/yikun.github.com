title: "一个简单的网络数据包工具——Packet Assistant"
date: 2015-06-15 19:11:00
tags:
  - Python
  - 网络
number: 27
---

### 1. 起因

最近一段时间，总是有一些**发数据包、抓数据包**之类的需求，主要是需要定制以太网MAC层的源MAC地址、目的MAC地址、协议类型之类的东西。

之前实现这些都是用Winpcap实现的，然后用某基础类库去实现界面，实在是受不了“某基础类库”庞大冗余的结构了。这时，看到了PyQt，整个人一下清爽起来。所以，Packet Assistant就诞生了。

总而言之，言而总之：

> Packet Assistant是一个简单的发包、抓包工具。

<!--more-->
### 2. 依赖
- [PyQt 4](http://www.riverbankcomputing.com/software/pyqt/download)

Python底下其实有很多的GUI库，比如[这里](http://www.zhihu.com/question/27159913)提到的一些，因为之前对C++的Qt比较熟，所以，比较能够理解Qt的设计思想，用PyQt的时候，也觉得还好，和原生Qt没什么差，主要是考虑了需要一个类似Qt Designer的东西快速搭界面。所以就选了PyQt了。
- [Pcapy](https://github.com/CoreSecurity/pcapy/wiki/Compiling-Pcapy-on-Windows-Guide)

Python网络抓包的库，Winpcap官网的[友情链接](https://www.winpcap.org/misc/links.htm)提到了这个库，比起[PyPcap](https://github.com/dugsong/pypcap)，Pcapy的例子、支持感觉更好些。
### 3. 截图

![packetassist](https://cloud.githubusercontent.com/assets/1736354/8158460/d367be9a-138f-11e5-84ae-346611f8aa59.png)
### 4. 最后

Enjoy it! :+1: 
