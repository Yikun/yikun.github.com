title: "读《OpenStack设计与实现》"
date: 2015-10-08 21:52:35
tags:
  - OpenStack
number: 30
---

### 初始OpenStack和开发基础

![openstack_ch1ch2](https://cloud.githubusercontent.com/assets/1736354/10370055/daf455b2-6e0f-11e5-98c3-d3e17ee7d97d.PNG)

OpenStack起于RakeSpace和NASA的合作，相关知识涉及到了云计算和虚拟化，体系结构上来看OpenStack是处于Iaas层，目前来看，还是处于追随AWS的阶段。OpenStack的子项目从新项目、孵化项目最终发展成为核心及集成项目。

<!--more-->

作者比较文艺，对于文档的重要性是这么描述的：

> 每一个项目，每一个模块，甚至每一行代码都有着自己的故事，这些故事都应该被留存在自己的历史档案里，而我们大部分的时间都只是他们的过客而已。

另外，还有一个重要的东西就是Code Review，核心思想：

> 一旦一个问题被充分地描述了他的细节，那么解决方法也是显而易见的。

OpenStack的代码质量保证体系大概就是以下几点：
- 编码规范：编码规范遵循着PEP-8，使用Flake8进行代码静态检测；
- 代码评审：使用Gerrit进行代码评审，保证所有代码都Code Review后才能Merge；
- 单元测试：位于tests目录，使用tox执行；
- 持续集成：使用Jenkins来做自动化测试，测试例则用Tempest框架

其实，整个过程还是比较清晰的，现在只是大致了解一下过程，后面真正开发的时候亲身体验一下再深入理解。最后，又介绍了一些关于贡献代码、文档、Review之类的一些说明，其中，Feature的贡献，需要先在Blueprint提出来一些想法和设计，然后通过后再在spec里详细描述一些细节。

对于阅读代码，也给了一个基本的思路，因为代码的脉络比较复杂，所以推荐先阅读setup.cfg，然后从entry point入手，逐个功能、服务去突破。OpenStack牵扯到的背景知识，主要有Python、Linux、网络基础、虚拟化、Git，除了虚拟化外，其他掌握的还行。所以，后面多看看虚拟化方面的内容。
### 虚拟化

![default](https://cloud.githubusercontent.com/assets/1736354/10417118/0f341a10-7063-11e5-8e1d-63e13f5eadb4.png)

对于OpenStack来说，虚拟化相关内容是非常核心的内容，自然本书的第三章独立出来介绍虚拟化的知识。
虚拟化的按照实现方式来说，主要分为Hypervisior模型和Hosted模型。
- Hypervisior模型，VMM直接运行在硬件平台上，控制所有硬件并管理客户操作系统。操作系统运行在VMM之上；
- Hosted模型，VMM则是在操作系统之上，就想是操作系统的一个软件层。

按照平台类型来说，则大致分为完全虚拟化和类虚拟化。
- 完全虚拟化，最初是使用二进制翻译实现的，后期硬件支持后，也可以通过硬件辅助支持；
- 类虚拟化，通过修改系统内核来实现，通用性较差。
  虚拟化包括了CPU虚拟化、内存虚拟化、I/O虚拟化、网络虚拟化，引入虚拟化后主要的特性为：动态迁移、快照、克隆，这些新特性对于目前对需要长时间稳定运行的系统来说，有非常重要的意义。

对于虚拟化相关知识，有参考了一些其他资料：
[《虚拟化技术原理与实现》](http://book.douban.com/subject/19986436/)
[《系统虚拟化原理与实现》](http://book.douban.com/subject/3619896/)
[Understanding Full Virtualization, Paravirtualization, and Hardware Assist](http://www.vmware.com/files/pdf/VMware_paravirtualization.pdf)([翻译](http://blog.csdn.net/flyforfreedom2008/article/details/45113635))
