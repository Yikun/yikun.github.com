title: 重新学习Shell
tags:
  - Linux
number: 22
date: 2015-05-19 12:42:23
---

之前，虽然已经对`Shell`比较熟悉了，但是遇到一些不太常用，但是却很有用的命令，还得搜个半天。所以，这几天准备把常用的指令重新过一下，然后再把基础的`Shell`流程控制、`awk`的操作等常用命令系统地学习一下，一方面作为总结，另一方面也作为一个Cheat Sheet，时不时的补充一下也是极好的，: )。
#### 基本语法

**传参**
`$n` - 传递的第n个参数
`$#` - 传递的参数个数
`$*` - 所有参数
`$@` - 所有参数，加引号为字符串数组

``` Bash
# var.sh arg1 arg2 arg3
echo $0 $1 $2 $3

#3
echo $#

# arg1 arg2 arg3
echo $@

# arg1 arg2 arg3
echo $*

# @:arg1
# @:arg2
# @:arg3
for arg in "$@"
do
    echo @:"$arg"
done

# *:arg1 arg2 arg3
for arg in "$*"
do
    echo *:"$arg"
done

```

**if条件控制**

``` Bash
a=10
b=20
if [ $a -eq $b ]
then
    echo "a euqals b."
elif [ $a -lt $b ]
then
    echo "a little than b."
elif [ $a -gt $b ]
    echo "a greater than b."
fi

str="linux"
if [ "$str" == "linux" ]
then
    echo "str is linux."
fi

# [ -e filename]    判断文件存在
# [ -d pathname] 判断目录存在
```

**循环控制**

``` bash
arr=("hello" "bash" "shell")
for a in ${arr[*]}
do
    echo $a
done
```
#### 常用指令

**_head/tail**_

``` bash
# 前5行
head -5
head -n 5
# 前n-5行
head -n -5
# 后n-5行
tail -n +5
# 前5字节
head -c 5

```

**_sort**_

``` bash
# 忽略起始空格(b)数值(n)去重(u)逆序(r)按照:分隔(-t ':')的第二列(-k 2)排序
sort -bnur -t ':' -k 2 somefile
```

**_grep**_

``` bash
# 在当前文件夹的所有文件递归(-r)搜索main
grep -r "main" *
# 搜索匹配正则(-E)的行数(-c)，（带main或者括弧的）
grep -cE "main|\(\)" *
# 搜索不包含extern的(-v --> invert-match)
grep -v "extern"
```

**_wc**_

``` bash
# 打印所有.c文件的行数
grep -r "" *.c | wc -l
```
