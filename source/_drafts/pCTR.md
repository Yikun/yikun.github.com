title    : 点击率预估
tags     : 
date     : 2014-11-20
---
<!--more-->
CTR click-through rate
1. 大数据
广告的内容  是否吸引人
用户        有些用户喜欢点
季节假日	
注意噪声数据，乱点
2.时效性
online
batch
3.exploration
老广告和新广告

训练数据-->           模型训练  -->  预估模型  --> 预估系统
q为网页和广告
q1    q2   q3 .....qm
a1,0
a2,0
a3,2
a4,0
a5,0
          特征 -- 预处理
日志 ---                  --模型训练 --- 模型 -- 评估
          数据 -- 预处理
特征处理
one -hot  --维度太大，太稀疏
特征选择
1. Filter类 统计单一的特征，计算量小
单特征AUC

不全日志删除
数据净化：

特征： 用户(男、女)  流量(网站类别)  广告（特征）

背景介绍
互联网广告是互联网产业的重要营收来源之一，展示广告是互联网广告中的一种，通过在一定的上下文中展示适当的广告给适当的用户以获得用户点击。广告点击率 (click-through rate，CTR) 预估（pCTR）是支持展示广告投放的一项关键技术。估计得到的点击率pCTR会作为广告经济模型的重要输入参数，影响候选广告的最终排名。准确的点击率预估对于展示广告投放优化十分重要。本赛题关注的是多媒体类展示广告的点击率预估问题。
任务描述
训练数据包含在文本文件training.txt中。该文件中每行都对应于一个训练样本，每个训练样本都是由从会话日志中抽取的相关字段构成，字段之间用逗号分隔。构造训练数据集时使用了一个时间窗口内的经过抽样的会话日志。
训练数据
这里所说的会话是指用户和广告系统的一次交互。当用户访问一个页面时，会有一个或者多个广告被展示给用户，用户可能会点击其中0个或者多个广告，同一个广告可能被点击0次，1次或者多次。当展示一个广告给用户时，用户看到的内容包括该广告对应的图片（称作素材，creative），以及一段简短的文字（称作标题，title)。

我们将每一个会话中包含的信息划分为一个或者多个训练样本，其中每个样本描述的是一个广告被展示给一个用户（Impression，称作曝光样本），或者一个用户点击了一个广告（Click，称作点击样本）。每个训练样本中依次包含如下字段：
1. UserID : 用户ID
2. AdID ：广告ID
3. AdvertiserID：广告主ID
4. CreativeID：素材ID
5. Impression：这个字段为1，表示该广告(AdID)被展示给该用户(UserID)，此样本为曝光样本
6. Click：这个字段为1，表示该用户(UserID)点击了该广告(AdID)，此样本为点击样本
注：因为训练数据取自一个时间窗口，可能存在截断的问题，所以可能存在只有点击样本，没有对应的曝光样本的情形，但这种情形应该很少出现。
测试数据

测试数据包含在文本文件testing.txt中，其格式和字段的含义与训练数据相同。测试数据集也是来自相同时间窗口内的会话日志。测试数据集可供参赛者自行评估pCTR模型的精度，并同其他参赛者的结果做比较。
其他数据
除了上面提到的训练数据文件和测试数据文件之外，本赛题还附带了一些有关用户和广告的额外的属性数据，供建模使用：
1. users.txt: 文本文件，每行包含逗号分隔的多个字段，依次是：用户ID(UserID)，用户性别(Gender，枚举类型)，用户年龄(Age，整数类型)，用户从注册至今的时长(Registration Age，整数类型)，用户所在地区(Location，枚举类型).
2. titles.txt: 文本文件，每行包含逗号分隔的多个字段，依次是：广告ID(AdID)，广告标题(title，字符串类型)，素材ID(CreativeID).
3. images.zip: 压缩文件，解压后得到的是广告素材的图片，图片文件名对应于素材ID (CreativeID).
注：用户属性，广告属性和素材图片可能有很少一部分缺失，属于正常现象。