---
key: 70
title: 使用 tcpdump 抓包
tags: [tools, network]
aside: false
---
[tcpdump](https://www.tcpdump.org/) 是一个很实用用的抓包工具. 一直以来我都只是复制网上的常用命令, 对其使用逻辑缺乏理解. 最近我仔细阅读了它的 manual, 总结一下 tcpdump 用法.

### 命令格式

如果使用 `tcpdump --help` 查看它的使用方法, 总是会得到一大堆参数选项, 至于如何使用还是一头雾水. tcpdump 的用法实际是这样的:

```
$ tcpdump [选项] [表达式]
```

tcpdump 会读取网络中的数据, 解析协议, 然后与表达式相匹配. 如果匹配上, 则用指定的方式打印数据包的内容. 选项则用于指定如何从网络中读取数据 (如指定网络接口) 以及如何输出抓取到的数据.

在深入了解选项和表达式语法前, 先看个简单的例子. 选项 `-A` 表示用 ASCII 以文本的形式打印数据包的内容, `-i` 指定网卡; 表达式 `tcp && port 80` 表示抓取协议为 `tcp`, 且端口为 `80` 的数据包.

```
$ tcpdump -i eth0 -A 'tcp && port 80'
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
```

这个使用如果我们在这个机器上执行 `curl http://luyuhuang.tech` 就可以看到 tcpdump 打印出:

```
16:43:22.947734 IP 172.29.57.43.41858 > luyuhuang.tech.http: Flags [S], seq 3607076262, win 64240, options [mss 1460,sackOK,TS val 2356831936 ecr 0,nop,wscale 7], length 0
E..<..@.@.....9++..+...P.............&.........
.zf.........
16:43:22.961963 IP luyuhuang.tech.http > 172.29.57.43.41858: Flags [S.], seq 1991848100, ack 3607076263, win 65160, options [mss 1424,sackOK,TS val 1839405528 ecr 2356831936,nop,wscale 7], length 0
E..<..@.1...+..+..9+.P..v.0.........g..........
m....zf.....
16:43:22.962003 IP 172.29.57.43.41858 > luyuhuang.tech.http: Flags [.], ack 1, win 502, options [nop,nop,TS val 2356831951 ecr 1839405528], length 0
E..4..@.@.....9++..+...P....v.0............
.zf.m...
```

上面是 TCP 的三次握手. 每个包会先打印一行基础信息, 称为 "dump line", 如当前时间, 通讯双方的 IP 地址和端口, TCP 的标志位, 序列号, 以及选项等内容. 接下来是包体内容, 以文本形式打印. 如果不是 ASCII 码则打印为 `.`. 接下来就是 HTTP 请求:

```
16:43:22.962049 IP 172.29.57.43.41858 > luyuhuang.tech.http: Flags [P.], seq 1:79, ack 1, win 502, options [nop,nop,TS val 2356831951 ecr 1839405528], length 78: HTTP: GET / HTTP/1.1
E.....@.@..g..9++..+...P....v.0......l.....
.zf.m...GET / HTTP/1.1
Host: luyuhuang.tech
User-Agent: curl/7.68.0
Accept: */*


16:43:22.975713 IP luyuhuang.tech.http > 172.29.57.43.41858: Flags [.], ack 79, win 509, options [nop,nop,TS val 1839405541 ecr 2356831951], length 0
E..4..@.1...+..+..9+.P..v.0................
m....zf.
16:43:22.975715 IP luyuhuang.tech.http > 172.29.57.43.41858: Flags [P.], seq 1:368, ack 79, win 509, options [nop,nop,TS val 1839405542 ecr 2356831951], length 367: HTTP: HTTP/1.1 301 Moved Permanently
E.....@.1...+..+..9+.P..v.0..........7.....
m....zf.HTTP/1.1 301 Moved Permanently
Server: nginx/1.20.2
Date: Sat, 26 Nov 2022 08:43:22 GMT
Content-Type: text/html
Content-Length: 169
Connection: keep-alive
Location: https://luyuhuang.tech/

<html>
<head><title>301 Moved Permanently</title></head>
<body>
<center><h1>301 Moved Permanently</h1></center>
<hr><center>nginx/1.20.2</center>
</body>
</html>

16:43:22.975748 IP 172.29.57.43.41858 > luyuhuang.tech.http: Flags [.], ack 368, win 501, options [nop,nop,TS val 2356831964 ecr 1839405542], length 0
E..4..@.@.....9++..+...P....v.2............
.zf.m...
```

我们可以看到文本形式的 HTTP 请求 `GET / HTTP/1.1`, 接着是服务器发的 ACK. 然后是服务器发的响应报文 `HTTP/1.1 301 Moved Permanently`, 最后是客户端发的 ACK.

### 常用选项

tcpdump 的选项很多, 这里我们只介绍常用的一些选项. 其它的等真正要用的时候再去查 manual 或者 Google 也不迟.

- `-i INTERFACE` 指定网络接口. 使用 `-i any` 表示抓取所有网络接口的数据.
- `-A` 用 ASCII 以文本的形式打印数据包的内容, 不包括链路层头部. 适合抓取文本协议.
- `-X` 同时以十六进制和文本的形式打印数据包的内容, 不包括链路层头部. 类型这样的格式:
    ```
    0x0000:  4500 0082 6aa1 4000 4006 27dd ac1d 392b  E...j.@.@.'...9+
    0x0010:  2b84 972b cf7e 0050 1b87 34d8 b04b de5b  +..+.~.P..4..K.[
    0x0020:  8018 01f6 a86c 0000 0101 080a 8cca db1f  .....l..........
    0x0030:  6df3 8eff 4745 5420 2f20 4854 5450 2f31  m...GET./.HTTP/1
    0x0040:  2e31 0d0a 486f 7374 3a20 6c75 7975 6875  .1..Host:.luyuhu
    0x0050:  616e 672e 7465 6368 0d0a 5573 6572 2d41  ang.tech..User-A
    ```
    适合抓取二进制协议.
- `-XX` 同时以十六进制和文本的形式打印数据包的内容, 包括链路层头部.
- `-t` 不在 dump line 打印时间.
- `-tt` 以 UNIX 时间戳的格式打印时间.
- `-ttt` 打印与上一个包时间的时间间隔.
- `-v` 在 dump line 显示详细信息. 例如会显示 IP 分组的 ttl, id, 总长度; TCP 段的校验和等信息. 还会打印出应用层协议的内容, 例如会以文本形式打印出 HTTP 协议的内容.
- `-vv` 显示更详细的信息.
- `-vvv` 显示更更详细的信息.
- `-n` 不将地址转换成名称. 例如上面的例子显示服务器地址是 `luyuhuang.tech.http`, 如果指定 `-n` 就是显示 IP 地址和端口号 80.
- `-c COUNT` 抓取指定数量的包, 达到这个数量自动退出.
- `-s SNAPLEN` 抓取包的前 `SNAPLEN` 个字节, 默认为 262144.
- `-#` 打印出数据包的编号.
- `-w FILE` 将原始包数据写入到指定的文件, 而不是在终端打印它们. 文件扩展名通常是 `.pcap`, 保存的数据可以随后使用 tcpdump 分析.
- `-r FILE` 读取分析指定的 pcap 文件, 而不是抓取网络接口的数据. 下面是一个 `-w` 和 `-r` 的使用例子:
    ```
    $ tcpdump -i eth0 -w luyu.pcap 'tcp && port 80'
    ^C11 packets captured
    11 packets received by filter
    0 packets dropped by kernel

    $ tcpdump -r luyu.pcap -# -ttt 'dst port 80'  # 筛选发送到 80 端口的包
    reading from file luyu.pcap, link-type EN10MB (Ethernet)
        1   00:00:00.000000 IP 172.19.180.38.34716 > luyuhuang.tech.http: Flags [S], seq 3218407543, win 64240, options [mss 1460,sackOK,TS val 4127289318 ecr 0,nop,wscale 7], length 0
        2   00:00:00.026788 IP 172.19.180.38.34716 > luyuhuang.tech.http: Flags [.], ack 1418465742, win 502, options [nop,nop,TS val 4127289345 ecr 1941966167], length 0
        3   00:00:00.000199 IP 172.19.180.38.34716 > luyuhuang.tech.http: Flags [P.], seq 0:78, ack 1, win 502, options [nop,nop,TS val 4127289345 ecr 1941966167], length 78: HTTP: GET / HTTP/1.1
        4   00:00:00.028462 IP 172.19.180.38.34716 > luyuhuang.tech.http: Flags [.], ack 368, win 501, options [nop,nop,TS val 4127289374 ecr 1941966194], length 0
    ```

    值得一提的是 pcap 文件还可以被 [wireshark](https://www.wireshark.org/) 读取. 如果你喜欢用 wireshark 的图形界面查看抓包数据, 使用 `-w` 导出 pcap 文件是个不错的选择.

### 表达式语法

