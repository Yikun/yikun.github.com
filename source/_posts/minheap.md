title    : 最小堆
category : 算法学习
tags     : 
date     : 2014-04-18
---

<!--more-->
<h3><a>最小堆</a></h3>

----------

<div class="heap">
	<div class="thumbnail page-header">
	<div class="heap-viz"></div>
	<div class="btn-group">
	<a class="btn btn-inverse pause-button" type="button">
		<i class="icon-pause" style="display:display"></i>
		<i class="icon-play" style="display:none"></i>
		<span class="pause-label">暂停</span>
	</a>
	<a class="btn btn-inverse restart-button"><i class="icon-repeat" style="display:display"></i> 重来</a>
	</div>
	</div>
</div>
<script src="/assets/themes/hooligan/js/d3.v3.min.js"></script>
<script src="/assets/algorithms/heap.js"></script>
<script>createHeapVis(d3.select(".heap"));</script>