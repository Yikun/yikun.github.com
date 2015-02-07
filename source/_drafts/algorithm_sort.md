title    : 排序算法总结
category : 算法学习
tags     : 
date     : 2014-11-20
---

### 1. 排序算法汇总

|算法名称|复杂度|实现关键|
|-----------|----------------|----------------|  
|冒泡排序|$O(n^2)$|（无序区，有序区）。从无序区通过交换找出最大元素放到有序区前端。|
|选择排序|$O(n^2)$|（有序区，无序区）。在无序区里选择一个最小的元素跟在有序区的后面。|
|插入排序|$O(n^2)$|（有序区，无序区）。把无序区的第一个元素插入到有序区的合适的位置。|
|希尔排序|$nlog^2(n)$|每一轮按照事先决定的间隔进行插入排序，间隔会依次缩小，最后一次一定要是1(插入)。|
|快速排序|$nlog(n)$|（小数，枢纽元，大数）。|
|堆排序|$nlog(n)$||
|桶排序|O(n)|将值为i的元素放入i号桶，最后依次把桶里的元素倒出来。|

不稳定的排序：选择排序、快速排序、堆排序、希尔排序；
(注：稳定性一个形象的比喻，本来有两个并列第三，一排序把原来并列的顺序给变了)
[参考链接](http://zh.wikipedia.org/wiki/%E6%8E%92%E5%BA%8F%E7%AE%97%E6%B3%95)
<!--more-->
### 2. 冒泡排序

![](/assets/post/algorithm/sort/Bubble_sort_animation.gif)

每次都把未排序的第一个作为起始点，然后逐渐冒泡上升，之后未排序区越来越少，最终排序完成

![](/assets/post/algorithm/sort/bubble_sort.png)

```C
	// 冒泡排序
	void bubble_sort(int a[], int n)
	{
		int i = 0;
		int j = 0;
		for (i=0; i<n-1; i++)
		{
			// 比较相邻元素，若a[j]比a[j+1]大，则交换
			// a[j]就像一个气泡一样“浮”到合适位置了
			for(j=0; j<n-1-i; j++)
			{
				if(a[j]>a[j+1])
				{
					swap(&a[j], &a[j+1]);
				}
			}
		}
	}
```

### 3. 选择排序

![](/assets/post/algorithm/sort/Selection_sort_animation.gif)

每一趟从待排序的数据元素中**选出最小（或最大）的一个元素**，顺序放在已排好序的数列的最后，直到全部待排序的数据元素排完。

![](/assets/post/algorithm/sort/select_sort.png)

```C
	// 选择排序
	void select_sort(int a[], int n)
	{
		int i=0,j=0,min=0;
		for (i=0; i < n-1; i++)
		{
			min = i;
			// 找到最小值
			for (j=i+1; j <= n-1; j++)
			{
				if (a[min] > a[j])
					min = j;
			}
			if(min != i)
			{
				swap(&a[min], &a[i]);
			}
		}
	}
```

### 4. 插入排序
![](/assets/post/algorithm/sort/Insertion_sort_animation.gif)

每次排序从未排序区取一个“牌”，然后往前插入(包括了两步：大的往后移，把牌放到合适位置)。
![](/assets/post/algorithm/sort/Insert-sort-animation.gif)

```C
// 插入排序
void insert_sort(int a[], int n)
{
	int i=0;
	int j=0;
	int tmp=0;
	for (i = 1; i < n; i++)
	{
		// 取牌
		tmp = a[i];
		// 往前插的起始位置
		j = i - 1;

		// 大的a[j]都放后面，寻找出j
		while ((j >= 0) && a[j] > tmp)
		{
			// 往后放一个
			a[j+1] = a[j];
			j--;
		}

		// 放到该放的位置
		a[j+1]=tmp;
	}
}
```

另外还有种思路，把数据后移的过程换成交换的过程

```C
// 插入排序，选中的牌冒泡向前插入
void insert_sort_2(int a[], int n)
{
	int i=0;
	int j=0;
	//通过i选牌
	for (i=1; i < n; i++)
	{
		// 冒泡向前插入(i-1 --> 0)
		for (j=i-1; j>=0 && a[j] > a[j + 1]; j--)
		{
			swap(&a[j], &a[j+1]);
		}
	}
	print_a(a, n);
}
````

### 5. 希尔排序
对插入排序再加一个步长的循环就是希尔排序了，例如
```
[ 13 14 94 33 82 25 59 94 65 23 45 27 73 25 39 10 ]
```
按照5步长排序，则相当于按列先进行排序(实际是通过下标实现的)
```
13 14 94 33 82
25 59 94 65 23
45 27 73 25 39
10
```
排序后结果为
```
10 14 73 25 23
13 27 94 33 39
25 59 94 65 82
45
```
多次循环后，只需要**最终步长为1**即可。

```C
// 希尔排序
void shell_sort(int a[], int n)
{
	int i=0;
	int j=0;
	int tmp=0;
	int gap=0;
	while (gap <= n)
	{
		gap = gap*3 + 1;
	}
	while (gap > 0)
	{
		// 取牌
		for (i = gap; i < n; i++)
		{
			// 冒泡向前插入(i-gap : gap : 0), 保证每列ok
			for (j = i - gap; (j >= 0) && (a[j] > a[j + gap]); j = j - gap)
			{
				swap(&a[j], &a[j+gap]);
			}
		}
		gap = (gap-1) / 3;
	}
}
```

### 6. 快速排序

![](/assets/post/algorithm/sort/quicksort.gif)
每次迭代都选出一个基准，左边放小的，右边放大的，最终迭代完成。

![](/assets/post/algorithm/sort/quick_sort.png)


```C
	// 快速排序分区
	static int partition(int a[], int p, int r)
	{
		int x=0;
		int i=0;
		int j=0;
		// x为基准
		x = a[r];
		// i为界限,发现小于x的，就i++，再放到i处
		i = p-1;
		for (j=p; j<= r-1; j++)
		{
			if (a[j]<=x)
			{
				i++;
				swap(&a[i], &a[j]);
			}
		}
		// 至此，所有小于x的都到i左边了(a[0]~a[i-1])，a[r]是x，因此交换a[i+1]和a[r]
		swap(&a[i+1], &a[r]);
		return i+1;
	}

	// 快速排序
	void quick_sort(int a[], int p, int r)
	{
		int q=0;
		if (p < r)
		{
			// 在数据集之中，选择一个元素作为"基准"（pivot）
			// 所有小于"基准"的元素，都移到"基准"的左边；所有大于"基准"的元素，都移到"基准"的右边
			q = partition(a, p, r);
			// 对"基准"左边和右边的两个子集，不断重复第一步和第二步，直到所有子集只剩下一个元素为止。
			quick_sort(a, p, q-1);
			quick_sort(a, q+1, r);
		}
	}
```