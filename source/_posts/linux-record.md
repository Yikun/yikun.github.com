title    : Linux Record
tags     : 
date     : 2012-12-06
---
<!--more-->
User Group Password Set
---------------

	useradd –d /home/youtpath yourname
	passwd  yourname
	groupadd yourgroup
	chown yourname:yourgroup /home/yourname

if accuont is exist, try to using `usermod -d /home/yourpath -U yourname`

IP set
---------------

### In Ubuntu

(/etc/network/interfaces)

     # Dynamic IP
     auto eth0
     iface eth0 inet dhcp
 
     # Static IP 
     auto eth0
     iface eth0 inet static
     address 192.168.33.201
     netmask 255.255.255.0
     gateway 192.168.33.1
 
then, in shell(also, need sudo):

    ifconfig eth0 down
    ifconfig eth0 up

last, try to `ifconfig` to check result, perhaps you need using `/etc/init.d/networking restart` to restart all network services

### In RedHat
 
you need modify 3 files:

	/etc/sysconfig/network
	/etc/sysconfig/network-scripts/ifcfg-eth0
	/etc/resolv.conf
 
1./etc/sysconfig/network
 
	NETWORKING=yes
	NETWORKING_IPV6=no
	HOSTNAME=kero
	GATEWAY=192.168.1.1
 
2./etc/sysconfig/network-scripts/ifcfg-eth0
 
	DEVICE=eth0                                
	NETMASK=255.255.255.0             
	IPADDR=192.168.1.88             
	BOOTPROTO=static                      #【none | static | bootp | dhcp】
	ONBOOT=yes                            #【yes | no】引导时是否激活设备
	DNS1=211.99.25.1                      #域名解析服务器
	PEERDNS=yes
 
3./etc/resolv.conf

	nameserver 211.99.25.1          #DNS配置 同2中的 【DNS1=211.99.25.1 】

4.Resart

   /sbin/ifdown eth0
   /sbin/ifup eth0
   /etc/init.d/network restart

SSH
--------

	sudo apt-get install openssh-server

find
--------
	find ./ -name '*.*' 

du
--------
	du -h --max-depth=1

Virtual IP
--------

1. Using `ifconfig` check your IP and eth

	eth1      Link encap:Ethernet  HWaddr 08:00:27:71:DA:8C
	          inet addr:XXX.XXX.XXX.250  Bcast:XXX.XXX.XXX.255  Mask:255.255.255.0
	          inet6 addr: fe80::a00:27ff:fe71:da8c/64 Scope:Link
	          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
	          RX packets:782 errors:0 dropped:0 overruns:0 frame:0
	          TX packets:91 errors:0 dropped:0 overruns:0 carrier:0
	          collisions:0 txqueuelen:1000
	          RX bytes:77624 (75.8 KiB)  TX bytes:14476 (14.1 KiB)
	          Base address:0xd240 Memory:f0820000-f0840000

2. Set the Virtual IP, 

	ifconfig eth1:ha1 XXX.XXX.XXX.252 broadcast XXX.XXX.XXX.255 netmask 255.255.255.0 up

`eth1:ha1`, eth1:XXXX, XXXX is your virtual name, modifiy name what you want.

`XXX.XXX.XXX.252`,  Virtual IP

`XXX.XXX.XXX.255`, broadcast (Same as eth1 Bcast)

`255.255.255.0`, netmask (Same as eth1 Mask)


Also, you can using `ifconfig eth1:ha1 XXX.XXX.XXX.252 broadcast XXX.XXX.XXX.255 netmask 255.255.255.0 down` shutdown Virtual IP

After it, you can using `ifconfig`, check result

	eth1:ha1  Link encap:Ethernet  HWaddr 08:00:27:71:DA:8C
	          inet addr:XXX.XXX.XXX.252  Bcast:XXX.XXX.XXX.255  Mask:255.255.255.0
	          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
	          Base address:0xd240 Memory:f0820000-f0840000

3. To ensure, Ip is unique, you could using arping to check

`arping -c 3 -I eth1 -s XXX.XXX.XXX.250 XXX.XXX.XXX.252`

`-c` is count, 

`-I` is your eth interface name, 

`-s XXX.XXX.XXX.250` is your now ip(source ip)

`XXX.XXX.XXX.252` is the virtual ip you want to check

4. If not active, you could using 

`route add -host XXX.XXX.XXX.252 dev eth1:ha1`