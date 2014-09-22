title: 指尖上的设计
layout: page
---
<hr>
报告被[大学生嵌入式系统专题邀请赛优秀作品选编(第六届)](http://www.amazon.cn/%E5%A4%A7%E5%AD%A6%E7%94%9F%E5%B5%8C%E5%85%A5%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B8%93%E9%A2%98%E9%82%80%E8%AF%B7%E8%B5%9B%E4%BC%98%E7%A7%80%E4%BD%9C%E5%93%81%E9%80%89%E7%BC%96/dp/B00EXHNXAA)收录
报告下载：[Report](https://github.com/Yikun/Design-On-Fingertips/blob/master/%E5%AE%A4%E5%86%85%E4%BA%A4%E4%BA%92%E8%AE%BE%E8%AE%A1%E6%B8%B8%E8%A7%88%E7%B3%BB%E7%BB%9F-%E4%B8%AD%E6%96%87%E6%8A%A5%E5%91%8A_V2.0%E6%9C%80%E7%BB%88%E7%A8%BF_%E5%9C%BA%E6%99%AF%E5%9B%BE%E6%9B%B4%E6%96%B0.pdf)  演示介绍：[PPT](https://github.com/Yikun/Design-On-Fingertips/blob/master/%E6%8C%87%E5%B0%96%E4%B8%8A%E7%9A%84%E8%AE%BE%E8%AE%A1final.ppt) 源代码：[Code](https://github.com/Yikun/Design-On-Fingertips)
<hr>
针对室内装修设计这一民众关注的问题，以构建一个直观、立体、便捷的室内交互设计系统为目的，设计了这一新概念的室内交互设计游览系统。系统将增强现实技术、现代计算机技术与室内设计相结合，以搭载着 Yocto 操作系统的高性能、可配置的 Intel Atom 嵌入式系统为平台，结合精心设计的手势交互操控指环，实现了新概念的室内装修的交互设计游览系统，并在其中使用 3D 引擎，增加了碰撞检测、重力场以及逼真的图像渲染，使得系统场景更接近于现实。特意设计的模型与场景管理功能，也使得系统的可扩展性、易定制性大大提高。

本系统旨在提供一个立体的室内交互设计系统，实现了一个全新的人机交互方式，在售楼宣传、模型展示、室内设计、设计教育等诸多领域有良好的应用前景。


![all](/assets/project/DesignonFingertips/all.png)

系统环境
-------
	Ubuntu 12.04 LTS(Desktop)
	Linux Yocto(Embeded System)

安装依赖库
-------
	sudo apt-get install build-essential freeglut3-dev qt4-dev-tools qt4-doc qt4-qtconfig qt4-demos qt4-designer qtcreator xorg-dev glutg3-dev libxxf86vm-dev libjpeg8 libjpeg8-dbg libjpeg8-dev

操作说明
-------
+ 虚拟现实场景 

![ar](/assets/project/DesignonFingertips/ar.png)
虚拟现实场景可以将房屋的外景展示给使用者。

+ 室内设计场景
![scene](/assets/project/DesignonFingertips/scene.png)
进入室内设计场景后，你也可以利用下面的键盘按键对家具进行操作。

	- 视角控制

	I : 向前移动视角
	K : 向后移动视角
	J : 向左移动视角
	L : 向右移动视角
	M : 向下移动视角
	U : 向上移动视角
	O : 恢复主视角

	家具操控

	N : 新建家具
	Y : 摆放家具
	W : 向前移动家具
	S : 向后移动家具
	A : 向左移动家具
	D : 向右移动家具
	Q : 向上移动家具
	Z : 向下移动家具
	'+' : 放大家具尺寸 
	'-' : 缩小家具尺寸
	X : 顺时针旋转家具
	C : 逆时针旋转家具
	E : 前一个家具
	R : 后一个家具

实际效果
---

![actual](/assets/project/DesignonFingertips/actual.PNG)