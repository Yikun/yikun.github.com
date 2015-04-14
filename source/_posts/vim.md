title    : 我的vim配置
tags     : vim
date     : 2014-03-19
---

最近把vim的配置整理的一下，然后更新到github上了。
<!--more-->
之前一直在用vim，不过一直把他作为编辑器而已，就是写，然后:wq。最近在看nginx的代码，然后稍微归整了下vim的配置，也总结了一些有用的插件，让我阅读代码爽一些。放到github的主要目的还是为了备份，虽然插件不多，但是对我来说基本够用了。大致插件是实现的功能集中在高亮、函数列表、文件夹列表、函数跳转、代码补全、头源文件跳转、文件打开、状态栏美化。下面具体的介绍下我的配置。

![vim概览](/assets/post/2014-03-19-vim/vim_all.png)

###我的vim插件概览###

`pathogen.vim` 用于插件管理，把插件放到bundle目录就可以了。

`Trinity.vim` 用于集中管理taglist、nerdtree、srcexpl三个插件，按 `F8` 就可以快速打开这三个插件了。

`taglist.vim` 用于生成、展示函数列表

`nerdtree.vim` 用于生成、展示目录和文件

`srcexpl.vim` 用于函数的展示，当移动到函数上的之后，就会在srcexpl的窗口里面显示函数定义的。

`CSApprox.vim` 这是一个vim配色的插件，我比较喜欢desert这个配色。

`OmniCppComplete.vim` 用于代码补全工作，能够加快[效果](/assets/post/2014-03-19-vim/vim_omni.png)

`a.vim` 用于快速切换*.c和*.h

`ctrlp.vim` 用于文件的模糊搜索，能够加快打开文件的速度[效果](/assets/post/2014-03-19-vim/vim_ctrlp.png)

`powerline.vim` 一个优雅的状态栏插件

`vimgrep` 自带插件，用于搜索tags中匹配字符，可以查看函数调用情况[效果](/assets/post/2014-03-19-vim/vim_grep.png)

###如何使用的我的配置###

最简单的方法就是clone所有的配置到你的`.vim`目录之中，首先交代下我的vim配置方法，与vim相关的配置主要是`.vim`里的插件，一般目录位于`~/.vim`，还有vim的配置文件`~/.vimrc`，为了让配置vim更简单些，利用了`ln -s  ~/.vim/.vimrc ~/.vimrc`命令，这样，就相当于`～/.vimrc`是一个指向`~/.vim/.vimrc`的快捷方式。因此使用我的配置，也很简单。

第一步，备份。

        # mv ~/.vim backup
        # mv ~/.vimrc backup

第二部，复制配置。

        # git clone git@github.com:Yikun/vim-config.git ~/.vim
    
第三部，创建.vimrc链接

        # ln -s ~/.vim/.vimrc ~/.vimrc
    
这样就ok了。
