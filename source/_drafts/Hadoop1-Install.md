title    : Hadoop伪分布式模式搭建
category : Hadoop
tags     : 
date     : 2014-09-21
---

### 1. 搭建
<!--more-->
#### 1.1 安装maven
	
	sudo apt-get install maven
	$ mvn -version
	Apache Maven 3.0.4

#### 1.2 安装protobuf
	
	$ wget http://protobuf.googlecode.com/files/protobuf-2.5.0.tar.gz
	$ tar -zxvf protobuf-2.5.0.tar.gz
	$ sudo ./configure
	$ sudo make
	$ sudo make check
	$ sudo make install
	$ sudo ldconfig
	$ protoc --version
	libprotoc 2.5.0

#### 1.3 下载hadoop源码和环境并解压
	
	$ tar -zxvf hadoop-src-2.2.0.tar.gz
	$ tar -zxvf hadoop-2.2.0.tar.gz
	$ cd ~/code/hadoop/hadoop-2.2.0-src/hadoop-maven-plugins
	$ mvn install
	[INFO] ------------------------------------------------------------------------
	[INFO] BUILD SUCCESS
	[INFO] ------------------------------------------------------------------------
	[INFO] Total time: 3:59.330s
	[INFO] Finished at: Fri Sep 19 19:20:23 CST 2014
	[INFO] Final Memory: 15M/70M
	[INFO] ------------------------------------------------------------------------

#### 1.4 编译
	
	$ cd ${HADOOP_HOME}
	$ mvn eclipse:eclipse -DskipTests

#### 1.5 在eclipse导入代码

	“File” → “Import” → “Existing Projects into Workspace”

1.6 设置库文件

	hadoop-2.2.0-src右键 → "Java Build Path" → "Libraries" → "Add Library" → "User Library" → "User Libirary" → "New" → "hadoop2.2core" → "Add External JARs"

添加hadoop-2.2.0/share下的common、hdfs、httpfs、mapreduce、tools、yarn的lib加入到lib里，然后在"User Library"选中新建的库。

### 2. 搭建Hadoop环境
#### 2.1 配置Hadoop

需要配置5个文件

/hadoop-2.2.0/etc/hadoop/hadoop-env.sh

	JAVA_HOME=XXX

/hadoop-2.2.0/etc/hadoop/mapred-site.xml

	<property>
	<name>mapreduce.framework.name</name>
	<value>yarn</value>
	</property>

/hadoop-2.2.0/etc/hadoop/core-site.xml

	<property>
	<name>fs.default.name</name>
	<value>hdfs://YARN001:8020</value>
	</property>

/hadoop-2.2.0/etc/hadoop/yarn-site.xml

	<property>
	<name>yarn.nodemanager.aux-services</name>
	<value>mapreduce-shuffle</value>
	</property>

/hadoop-2.2.0/etc/hadoop/hdfs-site.xml

	<property>
	<name>dfs.replication</name>
	<value>1</value>
	</property>

#### 2.2 设置ssh

	ssh-keygen -t rsa
	cd ~/.ssh/
	cat id_rsa.pub >> authorized_keys

#### 2.3 初始化HDFS(仅第一次做)

	$ ./bin/hadoop namenode -format
	DEPRECATED: Use of this script to execute hdfs command is deprecated.
	Instead use the hdfs command for it.

	14/09/21 19:12:58 INFO namenode.NameNode: STARTUP_MSG:
	/************************************************************
	STARTUP_MSG: Starting NameNode

	........

	SHUTDOWN_MSG: Shutting down NameNode at kero-pc/127.0.0.1
	************************************************************/

#### 2.4启动

启动HDFS

	$ ./sbin/start-dfs.sh
	$ jps
	13095 SecondaryNameNode
	13422 Jps
	12415 NameNode
	12725 DataNode

启动Yarn

	$ ./sbin/start-yarn.sh
	$ jps
	11865 ResourceManager
	13663 Jps
	8705  NameNode
	10992 DataNode
	9386  SecondaryNameNode
	12876 NodeManager

#### 2.5 测试环境

	./bin/hadoop jar $HADOOP_HOME/hadoop-2.2-examples.jar pi 3 5 

