title: "Python3源码学习-编译Python源码"
date: 2015-12-20 20:36:58
tags:
  - Python
---

在进行源码学习的时候，“实践出真知”。因此，在进行源码学习的过程中，我们首先需要对源码进行编译，然后，对我们感兴趣的点进行log，甚至debug。本篇文章记录了我在进行Python 3.5.0源码编译时的一些过程。
<!--more-->
### 1. 下载

在官网[下载](https://www.python.org/downloads/)最新源码，为了方便跟踪源码的修改，借助git来管理Python源码。
```shell
git init
git add .
git commit -am "Python 3.5.0 source."
```

### 2. 配置
在编译前需要使用configure对源码进行配置。
```shell
./configure
```
配置完源码后，使用git status观察一下变化：
```
➜  Python-3.5.0 git:(master) ✗ git status
On branch master
Untracked files:
  (use "git add <file>..." to include in what will be committed)

	Makefile
	Makefile.pre
	Misc/python-config.sh
	Misc/python.pc
	Modules/Setup
	Modules/Setup.config
	Modules/Setup.local
	Modules/config.c
	Modules/ld_so_aix
	config.log
	config.status
	pyconfig.h

nothing added to commit but untracked files present (use "git add" to track)
```
我们看到产生了一些和make相关的配置文件，用来适配当前的环境。
用git提交一下：
```
git add .
git commit -am "After ./configure ."
```

### 3.编译
编译Python时，使用make进行编译
```
make
```
编译完成后，产生了一个python.exe文件，便是我们编译所得的执行文件。

> 注
我是在OSX下进行编译的，在编译过程中遇到了`fatal error: 'lzma.h' file not found`问题，把lzma包安上就可以了：
```
brew install xz
```

### 4.运行
```shell
./python.exe
```
以上便完成了整个Python源码的编译。以后，在修改完代码以后，只需要`make;./python.exe`就好~那么，享受Hack python code的乐趣吧。：）

代码已上传，并根据学习过程不断更新：https://github.com/Yikun/Python3