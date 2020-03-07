---
title: 通过 UNIX domain socket 在进程间传递文件描述符
tag: linux
---
Linux 提供了一系列系统调用使我们能在进程间传递文件描述符. 这里的 "传递文件描述符" 不是简单地传递文件描述符这个32位整数, 而是真正地把这个文件句柄传递给目标进程, 使目标进程可以对文件执行读写操作. 现在假设 进程B 要给 进程A 发送文件描述符, 我们来看具体做法.

### 1. UNIX domain socket
要想传递文件描述符, 首先需要建立进程间通信. 这里我们需要用到 UNIX domain socket. UNIX domain socket 是一种进程间通信的方式, 它和普通的 socket 类似, 不同的是不需要用到 ip 地址, 而是使用一个 socket 文件. 我们要利用它发送控制信息, 从而传递文件描述符. 首先我们让进程A先创建一个 socket:

```c
/*code of process A*/
int socket_fd = socket(AF_UNIX, SOCK_DGRAM, 0);
```
注意 `socket` 函数的参数. `AF_UNIX` 便是指定协议族为 UNIX domain socket. 这里我们使用数据报套接字 `SOCK_DGRAM`, 这与 UDP 类似, 不需要建立链接, 直接通过地址发送. 当然也可以使用 `SOCK_STREAM`, 这与就与 TCP 类似. 这里就不列举了.

接下来我们绑定地址:

```c
/*code of process A*/
struct sockaddr_un un;
un.sun_family = AF_UNIX;
unlink("process_a");
strcpy(un.sun_path, "process_a");

if (bind(socket_fd, (struct sockaddr*)&un, sizeof(un)) < 0) {
    printf("bind failed\n");
    return 1;
}
```

注意这里的地址就不再是一个 ip 地址了, 而是一个文件路径. 在这里我们指定地址为 `process_a`, 然后调用 `bind` 绑定地址, 这时就会创建一个名为 `process_a` 的 socket 文件.

这样一来, 其他的进程就可以通过 `process_a` 这样一个特殊的地址跟这个进程发送消息了. 就跟发送 UDP 消息一样, 不同的是使用 `struct sockaddr_un` 来定义地址, 而不是 `struct sockaddr_in` 或 `struct sockaddr_in6`. 除此之外, 重要的是, 其他进程还可以通过发送控制信息向这个进程传递文件描述符.

### 2. sendmsg
Linux 提供了一对系统调用: `sendmsg` 和 `recvmsg`. 与我们平时用的 `send` 和 `recv` 不同, 它们除了可以发送或接收常规数据之外, 还可以用来发送或接收控制信息, 这是传递文件描述符的关键; 此外它们还可以用来发送或接收一段不连续的数据.

我们来看这两个系统调用的声明

```c
#include <sys/types.h>
#include <sys/socket.h>

ssize_t sendmsg(int sockfd, const struct msghdr *msg, int flags);
ssize_t recvmsg(int sockfd, struct msghdr *msg, int flags);
```

`sendmsg` 和 `recvmsg` 使用一个结构体 `struct msghdr` 来描述发送的数据. 结构体定义如下:

```c
struct iovec {                    /* Scatter/gather array items */
    void  *iov_base;              /* Starting address */
    size_t iov_len;               /* Number of bytes to transfer */
};

struct msghdr {
    void         *msg_name;       /* optional address */
    socklen_t     msg_namelen;    /* size of address */
    struct iovec *msg_iov;        /* scatter/gather array */
    size_t        msg_iovlen;     /* # elements in msg_iov */
    void         *msg_control;    /* ancillary data, see below */
    size_t        msg_controllen; /* ancillary data buffer len */
    int           msg_flags;      /* flags on received message */
};
```

- `msg_name` 目标地址. 这个是可选的, 如果协议是面向连接的, 就不需要指定地址; 否则就需要指定地址. 这就类似于 `send()` 和 `sendto()`.
- `msg_iov` 要发送的数据. 这是一个数组, 数组的长度由 `msg_iovlen` 指定, 数组的元素是一个 `struct iovec` 结构体, 这个结构体指定一段连续数据的起始地址(`iov_base`)和长度(`iov_len`). 也就是说, 它可以发送多段连续数据; 或者说, 可以发送一段不连续的数据.
- `msg_control` 控制信息. 这就是我们今天的主角. 我们不能直接设置它, 必须使用一系列的宏来设置它.

`msg_control` 指向一个由 `struct cmsghdr` 结构体及其附加数据构成的序列. `struct cmsghdr` 的定义如下:

```c
struct cmsghdr {
    socklen_t cmsg_len;    /* data byte count, including header */
    int       cmsg_level;  /* originating protocol */
    int       cmsg_type;   /* protocol-specific type */
/* followed by
    unsigned char cmsg_data[]; */
};
```

`struct cmsghdr` 实际上定义的是数据的头部, 后面应该紧跟着一个 `unsigned char` 数组, 存放控制信息的实际数据. 也就是大家常说的 "变长结构体". `msg_control` 便是指向一个由这样的变长结构体构成的序列. 内存结构如下图所示:

![control data](/assets/images/pass-fd-over-domain-socket_1.gif)

我们需要用到以下几个宏:

```c
#include <sys/socket.h>

struct cmsghdr *CMSG_FIRSTHDR(struct msghdr *msgh);
size_t CMSG_SPACE(size_t length);
size_t CMSG_LEN(size_t length);
unsigned char *CMSG_DATA(struct cmsghdr *cmsg);
```

- `CMSG_FIRSTHDR()` 返回 `msg_control` 指向的序列的第一个元素
- `CMSG_SPACE()` 传入控制信息的实际数据的长度, 返回变长结构体需要占用的空间
- `CMSG_LEN()` 传入控制信息的实际数据的长度, 返回变长结构体的长度
- `CMSG_DATA()` 返回存放控制信息的实际数据的首地址.

> 需要注意 `CMSG_SPACE()` 和 `CMSG_LEN()` 的区别: 前者包含 padding 的长度, 是实际占用的空间; 后者则不包含 padding 的长度, 用于赋值给 `cmsg_len`.

接下来我们来让进程B传递文件描述符给进程A. 首先设置进程A的地址, 也就是 "process_a":

```c
/*code of process B*/
struct sockaddr_un ad;
ad.sun_family = AF_UNIX;
strcpy(ad.sun_path, "process_a");
```

我们只需要发送控制信息, 不需要发送常规数据, 所以把常规数据置空:

```c
/*code of process B*/
struct iovec e = {NULL, 0};
```

接下来为控制数据分配空间, 因为我们只传递一个文件描述符, 所以长度是 `sizeof(int)`:

```c
/*code of process B*/
char cmsg[CMSG_SPACE(sizeof(int))];
```

然后就可以设置 `struct msghdr` 结构体:

```c
/*code of process B*/
struct msghdr m = {(void*)&ad, sizeof(ad), &e, 1, cmsg, sizeof(cmsg), 0};
```

接下来获取我们获取 `struct cmsghdr` 并设置它:

```c
/*code of process B*/
struct cmsghdr *c = CMSG_FIRSTHDR(&m);
c->cmsg_level = SOL_SOCKET;
c->cmsg_type = SCM_RIGHTS;
c->cmsg_len = CMSG_LEN(sizeof(int));
*(int*)CMSG_DATA(c) = cfd; // set file descriptor
```

最后发送出去即可:

```c
/*code of process B*/
sendmsg(mfd, &m, 0)
```

### 3. recvmsg
现在我们让进程A接收传递过来的文件描述符. 这里我们调用 `recvmsg`.

```c
/*code of process A*/
char buf[512];
struct iovec e = {buf, 512};
char cmsg[CMSG_SPACE(sizeof(int))];
struct msghdr m = {NULL, 0, &e, 1, cmsg, sizeof(cmsg), 0};

int n = recvmsg(socket_fd, &m, 0);
printf("Receive: %d\n", n);

struct cmsghdr *c = CMSG_FIRSTHDR(&m);
int cfd = *(int*)CMSG_DATA(c); // receive file descriptor
```

这样, 进程A 就收到了进程B传递过来的文件描述符, 并且进程B打开着这个文件, 可以对其执行读写操作.

***
**参考资料**:
- [cmsg(3) - Linux man page](https://linux.die.net/man/3/cmsg)
- [Ancillary Data](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch14lev1sec6.html)
