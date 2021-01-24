---
key: 47
title: Go 设置 socket 端口复用
tag: [go, network, linux]
---
我们知道, 一般来说, TCP/UDP 的端口只能绑定在一个套接字上. 当我们尝试监听一个已经被其他进程监听的端口时, `bind` 调用就会失败, `errno` 置为 98 EADDRINUSE. 也就是所谓的端口占用.

```c
int fd1 = socket(AF_INET, SOCK_DGRAM, 0);
int fd2 = socket(AF_INET, SOCK_DGRAM, 0);

struct sockaddr_in addr = {0};
addr.sin_family = AF_INET;
addr.sin_port = htons(1234);
addr.sin_addr.s_addr = inet_addr("127.0.0.1");

bind(fd1, (struct sockaddr*)&addr, sizeof(addr)); // 0
bind(fd2, (struct sockaddr*)&addr, sizeof(addr)); // -1, errno = 98
```

但是一个端口只能被一个进程监听吗? 显然不是的. 比如说我们可以先 bind 一个套接字再 fork, 这样两个子进程就监听了同一个端口. Nginx 就是这样做的, 它的所有 worker 进程都监听着同一个端口. 我们还可以[使用 UNIX domain socket 传递文件](/2019/10/11/pass-fd-over-domain-socket.html), 将一个 fd "发送" 到另一个进程中, 实现同样的效果.

事实上, 根据 TCP/IP 的标准, 端口本身就是允许复用的. 绑定端口的本质就是当系统收到一个 TCP 报文段或 UDP 数据报时, 可以根据其头部的端口字段找到对应的进程, 并将数据传递给对应的进程. 另外对于广播和组播, 端口复用是必须的, 因为它们本身就是多重交付的.

### setsockopt

在 Linux 中, 我们可以调用 `setsockopt` 将 `SO_REUSEADDR` 和 `SO_REUSEPORT` 选项置为 1 以启用地址和端口复用.

```c
int val = 1;
setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &val, sizeof(val));
setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &val, sizeof(val));
```

对于 Go 来说稍微麻烦点, 因为 Go 会在调用 `net.Listen` 的时候将 `socket()`, `bind()`, `listen()` 这几步一次性做完. 所以我们只能使用 `net.ListenConfig` 设置回调函数以控制中间过程. 在回调函数中拿到原始的文件描述符后, 我们可以调用 `syscall.SetsockoptInt` 设置 socket 选项, 这与原始的 `setsockopt` 系统调用类似.

```go
cfg := net.ListenConfig{
    Control: func(network, address string, c syscall.RawConn) error {
        return c.Control(func(fd uintptr) {
            syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, unix.SO_REUSEADDR, 1)
            syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, unix.SO_REUSEPORT, 1)
        })
    },
}
tcp, err := cfg.Listen(context.Background(), "tcp", "127.0.0.1:1234")
```

### 作用

端口复用有什么作用呢? 根据 TCP/IP 标准, 对于单播数据报, 如果存在端口复用, 只能将其交付给其中一个进程 (组播和广播相反, 会交付给所有的进程). 我们可以让多个进程监听同一个端口, 让它们抢占式地接收处理数据, 提高服务器效率. Nginx 就是这么做的.

```go
func main() {
    cfg := net.ListenConfig{
        Control: func(network, address string, c syscall.RawConn) error {
            return c.Control(func(fd uintptr) {
                syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, unix.SO_REUSEADDR, 1)
                syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, unix.SO_REUSEPORT, 1)
            })
        },
    }
    tcp, err := cfg.Listen(context.Background(), "tcp", "127.0.0.1:1234")
    if err != nil {
        fmt.Println("listen failed", err)
        return
    }

    buf := make([]byte, 1024)
    for {
        conn, err := tcp.Accept()
        if err != nil {
            fmt.Println("accept failed", err)
            continue
        }
        for {
            n, err := conn.Read(buf)
            if err != nil {
                fmt.Println("read failed", err)
                break
            }

            fmt.Println(string(buf[:n]))
        }
    }
}
```

上面是一个迭代式 TCP 服务器, 同时只能处理一条连接. 但是我们启用了端口复用, 如果我们同时启 N 个这样的服务器, 它们就可以同时处理 N 条连接, 这个过程是抢占式的.

除此之外, 我们还可以同时监听同样的端口, 不同的 IP 地址, 以处理不同的数据报. 例如我们可以创建两个 goroutine, 其中一个监听 127.0.0.1:1234, 而另一个监听 0.0.0.0:1234, 针对不同的来源作不同的处理.

```go
func serve(addr string) {
    cfg := net.ListenConfig{
        Control: func(network, address string, c syscall.RawConn) error {
            return c.Control(func(fd uintptr) {
                syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, unix.SO_REUSEADDR, 1)
            })
        },
    }
    udp, err := cfg.ListenPacket(context.Background(), "udp", addr)

    if err != nil {
        fmt.Println("listen failed", err)
        return
    }

    buf := make([]byte, 1024)
    for {
        n, caddr, err := udp.ReadFrom(buf)
        if err != nil {
            fmt.Println("read failed", err)
            continue
        }

        fmt.Println(addr, caddr, string(buf[:n]))
    }
}

func main() {
    go serve("127.0.0.1:1234")
    go serve("0.0.0.0:1234")
    select {}
}
```

在上面的例子中就可以根据不同的目的地 IP 地址分发到不同的 goroutine 了.

***

**参考资料:** TCP/IP 详解 卷1: 协议, 机械工程出版社