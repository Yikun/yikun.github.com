--- 
layout   : post
title    : GDB Record
category : Linux Skill
tags     : 
tagline  : Some thing about gdb
---
Debug jni Code
---------------

1.Start your java application, set the breakpoint in java before call jni function
	
	java -Xdebug -Xrunjdwp:transport=dt_socket,address=6666,server=y,suspend=y com.kero.test.HelloJNI

2.Look up the pid using top, ps, ...
	
	ps -ef |grep com.kero.test.HelloJNI

3.Start gdb with this pid

	gdb -p pidnum
or
	gdb -p $(ps -ef |grep com.kero.test.HelloJNI |grep -v 'grep'|awk '{print $2}')

4.Attach your program code

	dir XXX/HelloJNI/

5.Debug as usual using gdb

	b function_name_XXX

6.Continue in java

Now, you will it will stop in c code where you set breakpoint.
