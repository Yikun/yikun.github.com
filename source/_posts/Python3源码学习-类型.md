title: Python3源码学习-类型
tags:
  - Python
number: 38
date: 2015-12-20 23:03:21
---

### 1. 类型

我们在《Python3源码学习-对象》中提到了每个对象都含有一个type的属性，我们看看type是个什么东西，目光移到object.h：

``` c
typedef struct _typeobject {
    PyObject_VAR_HEAD
    const char *tp_name; /* For printing, in format "<module>.<name>" */
    Py_ssize_t tp_basicsize, tp_itemsize; /* For allocation */

    /* Methods to implement standard operations */
    destructor tp_dealloc;

    //... ...

    /* More standard operations (here for binary compatibility) */
    hashfunc tp_hash;
    ternaryfunc tp_call;
    reprfunc tp_str;
    getattrofunc tp_getattro;
    setattrofunc tp_setattro;

    //... ...

} PyTypeObject;
```

<!--more-->

可以看到，PyTypeObject就是类型对象的定义了。其中，包含了一些和类型相关的重要信息：
- **类型名**： `const char *tp_name`，例如对于整型对象，他的这个name就是“int”。
- **开辟空间大小**：`tp_basicsize`和`tp_itemsize`包含了创建该类型的对象所需要分配的控件大小。
- **一些与对象相关联的操作**：比如`tp_dealloc`用于销毁对象，`tp_hash`用于计算hash值，`tp_str`用于将对象转换为str。
### 2. 类型的类型

另外可以看到，由该类的属性`PyObject_VAR_HEAD`看出，类型也是一个对象。我们知道每个对象都会有一个类型，那么思考一个问题，类型对象的类型又是什么呢？这个问题在typeobject.c的文件中给出了答案：

``` c
PyTypeObject PyType_Type = {
    PyVarObject_HEAD_INIT(&PyType_Type, 0)
    "type",                                     /* tp_name */
    sizeof(PyHeapTypeObject),                   /* tp_basicsize */
    sizeof(PyMemberDef),                        /* tp_itemsize */
    (destructor)type_dealloc,                   /* tp_dealloc */
    0,                                          /* tp_print */
    0,                                          /* tp_getattr */
    0,                                          /* tp_setattr */
    0,                                          /* tp_reserved */
    (reprfunc)type_repr,                        /* tp_repr */

    // ... ...
};
```

可以看到类型对象的类型就是`PyType_Type`，而PyType_Type的类型则执行它本身。
### 3. 对象图示

![type object](https://cloud.githubusercontent.com/assets/1736354/11918443/66f1c2c6-a76c-11e5-8838-f742ec215af2.png)

如上图所示，是一个简单的整型对象的例子，我们可以看出：
1. 整型对象的类型是PyLong_Type。
2. PyLong_Type是一个类型对象，其类型为PyType_Type。
3. PyType_Type也是一个类型对象，其类型为它本身。

我们也可以看出因为“万物皆对象”，不同的object虽然type不同，但是都有一个类型指针，通过类型指针ob_type即可完成对应方法的访问，Python也正是利用了指针的特性，从而实现了多态。
