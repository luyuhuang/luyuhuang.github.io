---
title: 并不可靠的 TCP 连接
tag: [experience, network]
---
我们都知道 TCP 是可靠的协议, 它有自动重传机制, 能保证数据完整有序地送达对端. 然而这个 "可靠" 是有前提的, 只有在**传输过程中连接始终建立**并且**传输结束后连接正常关闭**时才是可靠的. 这两个条件缺一不可, 它们看似简单, 但很容易被忽视. 这篇文章我们讨论这个问题.

### send 做了什么

为了将一段数据通过 TCP 发送到对端, 我们通常调用 `send(2)`. 传入文件描述符和数据, 它会返回发送数据的长度. 我们知道, 在 TCP 中, 必须收到相应的 ACK 才能保证数据送达对端.


然而当 `send(2)` 返回时, 并不能保证发送的数据被确认, 甚至不能保证数据发出去了. 它的返回只代表内核接受了用户的数据, 已经将它放入缓冲区, 且将会在合适的时候发送出去.

让我们来做个实验. 我们用 C 写一个客户端, 它用 TCP 连接上服务器, 然后 sleep 一段时间, 然后发送一段数据.

```c
int main() {
    int fd = socket(PF_INET, SOCK_STREAM, 0);

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(8000);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    if (connect(fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        printf("connect error: %d\n", errno);
        return 1;
    }

    printf("connected\n");

    sleep(5); // pull the network cable

    printf("try send\n");

    const char *data = "Hello";
    if (send(fd, data, strlen(data), 0) < 0) {
        printf("send error: %d\n", errno);
        return 1;
    }
    printf("sent\n");

    return 0;
}
```

我们运行这个客户端, 然后在它连接上服务器后, 趁它在 sleep 时, 把网线拔了. 结果是, 它会正常发送, 然后正常退出. 服务器什么都没收到.

```
$ ./cli
connected
try send
sent
```

在如今的移动应用中, 这种事情经常发生. 手机的无线网络是不稳定的, 上面 "拔网线" 的情况会经常发生. 那么怎样才能确保对端收到了数据呢?

### 四次挥手

### close 做了什么

我们修改第一节中的代码, 在程序结束前调用 `close(2)`, 确保连接正常关闭.

```c
int main() {
    ...

    if (close(fd) < 0) {
        printf("close error: %d\n", errno);
        return 1;
    }
    printf("closed\n");

    return 0;
}
```

我们再次运行程序, 同样趁它 sleep 的时候拔掉网线. 这样不出意外的话, close 应该会失败才对.

```
connected
try send
sent
closed
```

什么? 居然 close 成功了, 难道数据成功送达了吗? 这显然是不可能的, 网线都被拔了.

### 应用层处理方案
