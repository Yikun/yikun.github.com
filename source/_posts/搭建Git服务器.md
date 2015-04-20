title: "搭建Git服务器"
date: 2015-02-05 13:11:46
tags:
  - Git
---

在服务器上安装git
==========
### 1. 安装git
sudo apt-get install git
###  2. 增加git用户
sudo adduser git
###  3. 将用户的公钥添加
cat id_rsa.pub >> /home/git/.ssh/authorized_keys
###  4. 新建一个库
sudo git init --bare sample.git
sudo chown -R git:git sample.git
###  5. 禁止git登陆
vim /etc/passwd
把`git:X:1001:1001:,,,:/home/git:/bin/bash`换为下面的
git:X:1001:1001:,,,:/home/git:/usr/bin/git-shell

git clone git@server:/srv/sample.git

在客户端上安装git
==========
### 1. 在windows下安装git
[下载地址](http://www.git-scm.com/downloads)

### 2. 安装可视化界面(可选)
[下载地址](https://code.google.com/p/tortoisegit/wiki/Download?tm=2)
鼠标邮件，选择“TortoiseGit”->“Settings”，在“User Info”输入Name和Email
    
### 3. 生成公钥
在命令行和tortoisegit中稍有不同：
**In shell**
a. win+r --> Git Bash -->  ssh-keygen.exe
b. 一路回车，将生成“c:/Users/XXX/.ssh/id_rsa.pub”
c. (公钥)把id_rsa.pub重命名为id_rsa.XXX.pub, 例如id_rsa.jiangyikun.pub
d. (私钥)也已经生成到`c:/Users/XXX/.ssh/id_rsa`了
e. 将id_rsa.XXX.pub发送给git管理员

**In tortoisegit**
a. 打开Puttygen，SSH-2 RSA，点击Generate
b. 使用鼠标生成随机key
c. (公钥)复制Key到id_rsa.XXX.pub
d. (私钥)Save private key为XXX.ppk，并将Load Putty Key设为XXX.ppk
e. 将id_rsa.XXX.pub发送给git管理员

### (git管理员操作) 4.添加公钥的服务器
以root权限登陆， 注意是“>>”追加
```shell
cat id_rsa.XXX.pub >> /home/git/.ssh/authorized_keys
# drwx------. 2 git  git  4096 Apr 15 13:17 .ssh
# -rw-------. 1 git git 1189 Apr 15 13:17 authorized_keys
```

在客户端测试：ssh git@XXX.XXX.XXX.XXX，不再输入密码即可。

### 5. 简单学习
这是一个用于测试的repo你可以拿他来做做测试

a. 克隆仓库
git clone git@xxx.xxx.xxx.xxx:/yikun/sample.git
或者使用tortoisegit，在某个文件夹，右键-->Git Clone...--> URL填写“git@xxx.xxx.xxx.xxx:/yikun/sample.git”--> 输入密码

b. 修改文件并提交
1. 在sample目录下简历一个文件比如，XXX.txt
2. 右键 Git Commit -> "Master"
3. 填写Commit Message，并选择需要提交的文件，双击可以可视化的查看diff

c. 点击push， ok
    
### 6. 学习git
[Git教程](http://www.liaoxuefeng.com/wiki/0013739516305929606dd18361248578c67b8067c8c017b000)

Enjoy it! :)

### 附：
#### 1. 如何将一个现有的本地git库上传到服务器上？
从现有repo新建server repo的时候(服务器)

```shell
mkdir newrepo.git
cd newrepo.git
git --bare init
# Initialized empty Git repository in /yikun/newrepo.git/.git/
```
在现有的repo中（客户端）
```shell
cd newrepo.git  
git remote add origin git@xxx.xxx.xxx.xxx:/yikun/newrepo.git
git push origin master
```
#### 2. 如何克隆服务器上现有库？
```shell
# 从服务器克隆
git clone git@xxx.xxx.xxx.xxx:/yikun/newrepo.git
# 修改并本地提交
git commit -am "commitmessage"
# 上传至服务器
git push origin master
```
#### 3. 常见问题
1 **权限问题**

    Counting objects: 179, done.
    Delta compression using up to 4 threads.
    Compressing objects: 100% (176/176), done.
    fatal: Unable to create temporary file: Permission denied
    fatal: sha1 file '<stdout>' write error: Broken pipe
    error: failed to push some refs to 'git@xxx.xxx.xxx.xxx:/yikun/newrepo.git'
    git did not exit cleanly (exit code 1) (3261 ms @ 2015/2/5 11:17:39)
    
可以试试：
```shell
chown -R git *
chgrp -R git *
```    

2 **提交问题**

    error: refusing to update checked out branch: refs/heads/master
    error: By default, updating the current branch in a non-bare repository
    error: is denied, because it will make the index and work tree inconsistent
    error: with what you pushed, and will require 'git reset --hard' to match
    error: the work tree to HEAD.
    error: 
    error: You can set 'receive.denyCurrentBranch' configuration variable to
    error: 'ignore' or 'warn' in the remote repository to allow pushing into
    error: its current branch; however, this is not recommended unless you
    error: arranged to update its work tree to match what you pushed in some
    error: other way.
    error: 
    error: To squelch this message and still keep the default behaviour, set
    error: 'receive.denyCurrentBranch' configuration variable to 'refuse'.
    
可以试试：

```shell
git config 'receive.denyCurrentBranch' warn
```
