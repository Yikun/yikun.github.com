title: "[译]Internationalization"
date: 2016-01-23 00:43:37
tags:
  - Nova
---

> Nova uses the **oslo.i18n library** to **support internationalization**. The oslo.i18n library is built on top of **gettext** and provides functions that are used to enable user-facing strings such as log messages to appear in the **appropriate language in different locales**.

> Nova exposes the oslo.i18n library support via the nova/i18n.py integration module. This module provides the functions needed to wrap translatable strings. It provides the _() wrapper for general user-facing messages and specific wrappers for messages used only for logging. DEBUG level messages do not need translation but CRITICAL, ERROR, WARNING and INFO messages should be wrapped with _LC(), _LE(), _LW() or _LI() respectively.

理解：Nova是通过oslo.i18n来支持国际化的，oslo.i18n是基于getnext做的，这个库可以把面向用户的字符（比如日志）翻译成指定的语言。其中DEBUG信息不翻译，其他的信息会被翻译。

比如：
```python
# debug log
LOG.debug("block_device_mapping %(mapping)s",
          {'mapping': block_device_mapping})
# warn log
LOG.warn(_LW('Unknown base file %(img)s'), {'img': img})
# not log
raise nova.SomeException(_('Invalid service catalogue'))
```

> Do not use locals() for formatting messages because: 1. It is not as clear as using explicit dicts. 2. It could produce hidden errors during refactoring. 3. Changing the name of a variable causes a change in the message. 4. It creates a lot of otherwise unused variables.

> If you do not follow the project conventions, your code may cause hacking checks to fail.

另外，文中提到了不要使用`locals()`去格式化消息主要4点原因：1.不清楚是否有关键字. 2.重构时会有潜在的出错可能. 3.变量名变了消息就变. 4.创建很多无用的变量。

这些函数_(), _LC(), _LE(), _LW() and _LI()可以通过以下方法导入：
```python
from nova.i18n import _
from nova.i18n import _LC
from nova.i18n import _LE
from nova.i18n import _LW
from nova.i18n import _LI
```