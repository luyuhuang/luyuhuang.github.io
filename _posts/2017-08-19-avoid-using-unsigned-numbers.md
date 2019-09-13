---
title: 避免使用无符号数
category: experience
---
考察这样一段代码：
```c
int a = -1;
unsigned int b = 1;

if (a < b)
     printf("a < b\n");
else
     printf("a > b\n");
```
a是有符号整数，b是无符号整数。C语言在比较他们的大小时会进行隐式类型转换。如果执行的是
`if ((unsigned int)a < b)`
则-1被转换成4294967295，结果是__a > b__；如果执行的是
`if (a < (int)b)`
则结果是__a < b__。采取哪种方式__依赖于编译器__。

在g++中，输出的结果是a > b。当然，也会打出警告：warning: comparison between signed and unsigned integer expressions

为了避免这个问题，我们通常的做法是
`if (a < (int)b)`
但是，如果b大与32有符号整数的最大值2147483647，就会发生数据溢出，(int)b将会是一个负值。

因此，__避免在程序中使用无符号数！！！__