title: "搭建OpenStack开发环境"
date: 2016-02-10 00:10:09
tags:
  - OpenStack
number: 44
---

前段时间主要了解了一些OpenStack相关的基础性东西，现在希望通过安装使用来增强一下对系统整体的认识，最近也读了一篇文章[如何学习开源项目](http://www.csdn.net/article/2014-04-10/2819247-how-to-learn-opensouce-project-&-ceph)，基本和我的想法很类似，所以基本上也就是按照这个节奏来的。不说废话了，开始。

<!--more-->
### 1. 环境准备

整体的环境安装是基于[devstack]来搭建，本来就是一个脚本一个配置文件就可以了，不过因为部分网络环境比较“艰苦”，所以需要做一些优化，所以需要做一些准备工作。
#### 1.1 安装系统

Virtual Box，[下载](https://www.virtualbox.org/)
Ubuntu 14.04，[下载](http://www.ubuntu.com/download/desktop/install-ubuntu-desktop)
网络的话，我是选择了NAT模式，保证虚拟机能够通过宿主机来上网，然后另设了一个Host Only网卡做SSH访问，最近突然发现还可以用NAT端口转发的方式（把22端口转发到主机）完成类似功能，这样就只需要一个网卡了。
#### 1.2 基本工具

``` shell
# 安装Git
sudo apt-get install git
```
#### 1.3 加速Python源

为了加速下载速度，对Python源进行优化，这里用豆瓣的源。

```
# vim ~/.pip/pip.conf
[global]
timeout = 6000
trusted-host = pypi.douban.com
index-url = http://pypi.douban.com/simple/
```
#### 1.4 加速Ubuntu源

为了加速下载速度，对Ubuntu源进行优化，这里用网易的源。

```
# vim /etc/apt/sources.list
deb http://mirrors.163.com/ubuntu/ trusty main restricted universe multiverse
deb http://mirrors.163.com/ubuntu/ trusty-security main restricted universe multiverse
deb http://mirrors.163.com/ubuntu/ trusty-updates main restricted universe multiverse
deb http://mirrors.163.com/ubuntu/ trusty-proposed main restricted universe multiverse
deb http://mirrors.163.com/ubuntu/ trusty-backports main restricted universe multiverse
deb-src http://mirrors.163.com/ubuntu/ trusty main restricted universe multiverse
deb-src http://mirrors.163.com/ubuntu/ trusty-security main restricted universe multiverse
deb-src http://mirrors.163.com/ubuntu/ trusty-updates main restricted universe multiverse
deb-src http://mirrors.163.com/ubuntu/ trusty-proposed main restricted universe multiverse
deb-src http://mirrors.163.com/ubuntu/ trusty-backports main restricted universe multiverse
```
### 2. 下载Devstack

使用Git安装脚本切换到自己需要的版本：

```
# 下载devstack
git clone https://git.openstack.org/openstack-dev/devstack
# 切换版本
git checkout stable/liberty
```
### 3. 创建Stack用户

```
devstack/tools/create-stack-user.sh; su stack
```
#### 4. 创建local.conf

创建local.conf文件，并且写入自己的配置，可以参考官方的[Minimal configuration](http://docs.openstack.org/developer/devstack/configuration.html#minimal-configuration)，我的配置如下所示，参考[链接](http://www.chenshake.com/install-ubuntu-14-04-devstack/)做的。

```
# vim ~/devstack/local.conf
[local|localrc]]
GIT_BASE=https://github.com
# Define images to be automatically downloaded during the DevStack built process.
IMAGE_URLS="http://download.cirros-cloud.net/0.3.4/cirros-0.3.4-x86_64-disk.img"
# Credentials
DATABASE_PASSWORD=1
ADMIN_PASSWORD=1
SERVICE_PASSWORD=1
SERVICE_TOKEN=1
RABBIT_PASSWORD=1

HOST_IP=192.168.56.102
SERVICE_HOST=192.168.56.102
MYSQL_HOST=192.168.56.102
RABBIT_HOST=192.168.56.102
GLANCE_HOSTPORT=192.168.56.102:9292

# Work offline(不需要更新时打开)
# OFFLINE=True
# Reclone each time(需要更新时打开)
RECLONE=yes

# Logging
# -------
# By default ``stack.sh`` output only goes to the terminal where it runs. It can
# be configured to additionally log to a file by setting ``LOGFILE`` to the full
# path of the destination log file. A timestamp will be appended to the given name.
LOGFILE=/opt/stack/logs/stack.sh.log
VERBOSE=True
LOG_COLOR=True
SCREEN_LOGDIR=/opt/stack/logs

# the number of days by setting ``LOGDAYS``.
LOGDAYS=1

# Database Backend MySQL
enable_service mysql

# RPC Backend RabbitMQ
enable_service rabbit

# Enable Keystone - OpenStack Identity Service
enable_service key

# Horizon - OpenStack Dashboard Service
enable_service horizon

# Enable Swift - Object Storage Service without replication.
enable_service s-proxy s-object s-container s-account
SWIFT_HASH=66a3d6b56c1f479c8b4e70ab5c2000f5
SWIFT_REPLICAS=1

# Enable Glance - OpenStack Image service
enable_service g-api g-reg

# Enable Cinder - Block Storage service for OpenStack
enable_service cinder c-api c-vol c-sch c-bak

# Branches
KEYSTONE_BRANCH=stable/liberty
NOVA_BRANCH=stable/liberty
NEUTRON_BRANCH=stable/liberty
SWIFT_BRANCH=stable/liberty
GLANCE_BRANCH=stable/liberty
CINDER_BRANCH=stable/liberty
HEAT_BRANCH=stable/liberty
TROVE_BRANCH=stable/liberty
HORIZON_BRANCH=stable/liberty
SAHARA_BRANCH=stable/liberty
CEILOMETER_BRANCH=stable/liberty
TROVE_BRANCH=stable/liberty
```
### 5. 开始安装

```
cd devstack; ./stack.sh
```

最终安装完毕：

```
#... ...
This is your host IP address: 192.168.56.102
This is your host IPv6 address: ::1
Horizon is now available at http://192.168.56.102/dashboard
Keystone is serving at http://192.168.56.102:5000/
The default users are: admin and demo
The password: 1
```
### 问题解决

问题： InsecurePlatformWarning: A true SSLContext object is not available. This prevents urllib3 from configuring SSL appropriately [duplicate] 参考[链接](http://stackoverflow.com/questions/29134512/insecureplatformwarning-a-true-sslcontext-object-is-not-available-this-prevent)解决的：

```
sudo apt-get install libffi-dev libssl-dev
sudo pip install requests[security]
sudo pip install --upgrade pyopenssl ndg-httpsclient pyasn1 pip
```

问题： ERROR: tox version is 2.1.1, required is at least 2.3.1

``` shell
> sudo pip install 'tox==2.3.1'
```
### 参考链接

[Ubuntu 14.04 Devstack安装Liberty](http://www.chenshake.com/install-ubuntu-14-04-devstack/)
[使用DEVSTACK搭建OPENSTACK可remote debug的开发测试环境](http://bingotree.cn/?p=687)
[DevStack - an OpenStack Community Production](http://docs.openstack.org/developer/devstack/)
[stack.sh](http://docs.openstack.org/developer/devstack/stack.sh.html)
[Minimal Configuration](http://docs.openstack.org/developer/devstack/configuration.html#minimal-configuration)
