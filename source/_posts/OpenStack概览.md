title: "OpenStack概览"
date: 2015-10-04 19:33:16
tags:
  - OpenStack
number: 29
---

### 1. 概览

![openstack-software-diagram](https://cloud.githubusercontent.com/assets/1736354/10267380/3f2d8b74-6ac4-11e5-9372-6bc21c57f11f.png)

> OpenStack is a **cloud operating system** that controls large pools of **compute**, **storage**, and **networking** resources throughout a datacenter, all managed through a **dashboard** that gives administrators control while empowering their users to provision resources through a web interface.

<!--more-->

正如OpenStack官方定义的那样，OpenStack是一个云操作系统，他管理这大量的计算、存储、网络资源，也提供了一个dashborad让管理员通过Web接口方便的管理资源。目前的版本已经是K版了，在看了[OpenStack Kilo Overview Demo](https://www.youtube.com/v/y39CAXJAW3M)的视频后，对OpenStack有了最初的了解。
### 2. 核心功能

**Compute**

> **Provision and manage large networks of virtual machines.**
> 
> The OpenStack cloud operating system enables enterprises and service providers to **offer on-demand computing resources**, by provisioning and managing large networks of virtual machines. Compute resources are accessible via **APIs** for developers building cloud applications and via **web interfaces** for administrators and users. The compute architecture is designed to **scale horizontally** on standard hardware, enabling the cloud economics companies have come to expect.

几个关键信息：按需提供计算资源、提供API给开发者、提供Web接口给用户、横向扩展。然后又专门介绍了OpenStack的灵活的架构，它支持各种不同的硬件，比如普通的计算机可以，高性能计算机也可以；也支持不同的软件，比如支持各种不同的虚拟化技术，比如KVM、XEN、LXC等等。

**Storage**

> Object and block storage for use with servers and applications.
> 
> In addition to traditional enterprise-class storage technology, many organizations now have a variety of storage needs with varying performance and price requirements. OpenStack has support for both **Object Storage** and **Block Storage**, with many deployment options for each depending on the use case. 
> 
> Object Storage is ideal for **cost effective, scale-out** storage. It provides a fully distributed, API-accessible storage platform that can be integrated directly into applications or used for backup, archiving and data retention. Block Storage allows block devices to be exposed and connected to compute instances for **expanded storage, better performance and integration** with enterprise storage platforms, such as NetApp, Nexenta and SolidFire.

几个关键信息，提供了对象存储和块存储，对象存储有高效的成本，横向扩展性，块存储则为了更好的扩容、更好的性能以及和企业其他存储平台的集成。

**Network**

> Pluggable, scalable, API-driven network and ip management.
> 
> Today's datacenter networks contain more devices than ever before servers, network equipment, storage systems and security appliances — many of which are further divided into virtual machines and virtual networks. The number of IP addresses, routing configurations and security rules can quickly grow into the millions. Traditional network management techniques fall short of providing a **truly scalable, automated approach to managing these next-generation networks**. At the same time, **users expect more control and flexibility with quicker provisioning**.
> 
> OpenStack Networking is a **pluggable**, **scalable** and **API-driven** system for managing networks and IP addresses. Like other aspects of the cloud operating system, it can be used by administrators and users to increase the value of existing datacenter assets. OpenStack Networking ensures the network will not be the bottleneck or limiting factor in a cloud deployment and gives users real self service, even over their network configurations.

关键信息：现今数据中心的设备越来越多，配置也非常多，需要一个可扩展、自动化的管理下一代网络，同时用户也希望仅通过快速配置，掌控更多，更灵活。所以就有OpenStack Networking了，一个用于管理网络和IP的可插拔、可扩展、API驱动的系统。
### 参考资料

[OpenStack官方介绍](http://www.openstack.org/software/)
