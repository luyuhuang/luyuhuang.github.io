---
title: 详解 KCP 协议的原理和实现
tags: [network, featured]
---
## 1. 引言

[KCP](https://github.com/skywind3000/kcp) 是一个快速可靠的 ARQ 协议, 采用了不同于 TCP 的自动重传策略, 有着比 TCP 更低的网络延迟. 实际通常使用 KCP over UDP 代替 TCP, 应用在网络游戏和音视频传输中. KCP 的实现短小精悍, 非常适合学习. KCP 的 ARQ 机制与 TCP 类似, 只是部分策略不同, 学习 KCP 也有助于我们理解 TCP. 本文剖析 KCP 的源码, 分析 KCP 的实现, 这包括它的发送与接收队列, 重传机制, 拥塞控制等.

我们首先在第 2 节看下 KCP 的各个主要的接口; 接着第 3 节开始介绍 KCP 中的数据结构, 包括 KCP 对象, 报文段, 队列; 第 4 节开始介绍 KCP 的发送, 接收与重传机制; 第 5 节分析 KCP 的拥塞控制机制; 最后简单做一个总结. KCP 源码的可读性还是比较好的, 建议大家阅读本文的同时也结合 KCP 源码.

## 2. 使用接口

打开 `ikcp.h`, 关注这几个接口:

```c
// 一个 ikcpcb 实例代表一个 KCP 连接
typedef struct IKCPCB ikcpcb;

// 创建一个 KCP 实例
ikcpcb* ikcp_create(IUINT32 conv, void *user);

// 释放一个 KCP 实例
void ikcp_release(ikcpcb *kcp);

// 设置下层协议输出回调函数
void ikcp_setoutput(ikcpcb *kcp, int (*output)(const char *buf, int len,
	ikcpcb *kcp, void *user));

// 接收数据
int ikcp_recv(ikcpcb *kcp, char *buffer, int len);

// 发送数据
int ikcp_send(ikcpcb *kcp, const char *buffer, int len);

// 时钟更新
void ikcp_update(ikcpcb *kcp, IUINT32 current);

// 下层协议输入
int ikcp_input(ikcpcb *kcp, const char *data, long size);

// flush 发送缓冲区, 会在 ikcp_update 中调用
void ikcp_flush(ikcpcb *kcp);
```

`ikcp_create` 创建一个 KCP 实例. 传入的 `conv` 参数标识这个 KCP 连接, 也就是说, 这个连接发出去的每个报文段都会带上 `conv`, 它也只会接收 `conv` 与之相等的报文段. 通信的双方必须先协商一对相同的 `conv`. KCP 本身不提供任何握手机制, 协商 `conv` 交给使用者自行实现, 比如说通过已有的 TCP 连接协商.

KCP 是纯算法实现的, 不负责下层协议收发, 内部没有任何系统调用, 连时钟都要外部传进来. 因此我们需要:

- 调用 `ikcp_setoutput` 设置下层协议输出函数. 每当 KCP 需要发送数据时, 都会回调这个输出函数. 例如下层协议是 UDP 时, 就在输出回调中调用 `sendto` 将数据发送给对方. 输出回调的 `user` 参数等于 `ikcp_create` 传入的 `user` 参数.
- 当下层协议数据到达时, 调用 `ikcp_input` 将数据传给 KCP.
- 以一定的频率调用 `ikcp_update` 以驱动 KCP 的时钟. `current` 表示当前时间, 单位为毫秒.

设置好下层协议和时钟后, 就可以调用 `ikcp_recv` 和 `ikcp_send` 收发 KCP 数据了.

![kcp_io](/assets/images/kcp_1.svg)

在深入细节之前, 先简单浏览下这几个函数, 我们就能知道它们大概会做什么:

- `ikcp_send` 将数据放在发送队列中等待发送;
- `ikcp_recv` 从接收队列中读取数据;
- `ikcp_input` 读取下层协议输入数据, 解析报文段; 如果是数据, 就将数据放入接收缓冲区; 如果是 ACK, 就在发送缓冲区中标记对应的报文段为已送达;
- `ikcp_flush` 调用输出回调将发送缓冲区中的数据发送出去.

接下来几节我们会逐步深入探索 KCP 的实现细节.

## 3. 数据结构

### 3.1 报文段

#### 3.1.1 报文段结构

我们先来看 KCP 的报文段结构. 首先, KCP 的有四种报文段, 或者说四个 Command:

- 数据报文 `IKCP_CMD_PUSH`
- 确认报文 `IKCP_CMD_ACK`
- 窗口探测报文 `IKCP_CMD_WASK`, 询问对端剩余接收窗口的大小.
- 窗口通知报文 `IKCP_CMD_WINS`, 通知对端剩余接收窗口的大小.

无论是那种报文段, 其结构都是这样的:

```
0               4   5   6       8 (BYTE)
+---------------+---+---+-------+
|     conv      |cmd|frg|  wnd  |
+---------------+---+---+-------+   8
|     ts        |     sn        |
+---------------+---------------+  16
|     una       |     len       |
+---------------+---------------+  24
|                               |
|        DATA (optional)        |
|                               |
+-------------------------------+
```

可以看到有这么几个字段:

- `conv` 4 字节: 连接标识, 前面已经讨论过了.
- `cmd` 1 字节: Command.
- `frg` 1 字节: 分片数量. 表示随后还有多少个报文属于同一个包.
- `wnd` 2 字节: 发送方剩余接收窗口的大小.
- `ts` 4 字节: 时间戳.
- `sn` 4 字节: 报文编号.
- `una` 4 字节: 发送方的发送缓冲区中最小还未确认送达的报文段的编号. 也就是说, 编号比它小的报文段都已确认送达.
- `len` 4 字节: 数据段长度.
- `data`: 数据段. 只有数据报文会有这个字段.

首先, 每个数据报文和 ACK 都会带上 sn, 唯一标识一个报文; 发送方发送一个数据报文, 接收方收到后回一个 ACK, 接收放收到 ACK 后根据 sn 将对应的报文标记为已送达; 同时, 每个报文都会带上 una, 发送方也会根据 una 将相应的报文标记已送达.

ts 可以用来估算 RTT (Round-Trip Time, 往返时间), 从而计算出 RTO (Retransmission TimeOut, 重传超时时间). 我们会根据 RTO 确定每个报文的超时时间, 如果报文在超时时间内未被标记为已送达, 就会被重传.

数据包的大小可能会超过一个 MSS (Maximum Segment Size, 最大报文段大小). 这个时候需要进行分片, frg 表示随后的分片数量, 即随后还有多少个报文属于同一个包.

每个报文都会带上 wnd, 告诉对端发送方剩余接收窗口的大小, 这有助于对端控制发送速率. 我们会在第 5 节详细讨论.

#### 3.1.2 实现

在 KCP 的实现中, 使用如下的结构体表示一个 KCP 报文段:

```c
struct IKCPSEG
{
	struct IQUEUEHEAD node;
	IUINT32 conv;
	IUINT32 cmd;
	IUINT32 frg;
	IUINT32 wnd;
	IUINT32 ts;
	IUINT32 sn;
	IUINT32 una;
	IUINT32 len;
	IUINT32 resendts;
	IUINT32 rto;
	IUINT32 fastack;
	IUINT32 xmit;
	char data[1];
};
```

除了报文的几个字段之外, 还有如下字段:

- `node`: 链表节点. 我们会在 3.3 节详细讨论.
- `resendts`: 重传时间戳. 超过这个时间表示该报文超时, 需要重传.
- `rto`: 该报文的 RTO.
- `fastack`: ACK 失序次数. 也就是 [KCP Readme 中](https://github.com/skywind3000/kcp#%E5%BF%AB%E9%80%9F%E9%87%8D%E4%BC%A0)所说的 "跳过" 次数.
- `xmit`: 该报文超时的次数

### 3.2 KCP 实例

一个 `struct IKCPCB` 实例表示一个 KCP 连接. 它的字段比较多, 这里先列出每个字段的含义. 不必现在就细看每个字段的含义, 可以先跳过这一段, 需要的时候再返回来查.

```c
struct IKCPCB
{
	IUINT32 conv, mtu, mss, state;
	IUINT32 snd_una, snd_nxt, rcv_nxt;
	IUINT32 ts_recent, ts_lastack, ssthresh;
	IINT32 rx_rttval, rx_srtt, rx_rto, rx_minrto;
	IUINT32 snd_wnd, rcv_wnd, rmt_wnd, cwnd, probe;
	IUINT32 current, interval, ts_flush, xmit;
	IUINT32 nrcv_buf, nsnd_buf;
	IUINT32 nrcv_que, nsnd_que;
	IUINT32 nodelay, updated;
	IUINT32 ts_probe, probe_wait;
	IUINT32 dead_link, incr;
	struct IQUEUEHEAD snd_queue;
	struct IQUEUEHEAD rcv_queue;
	struct IQUEUEHEAD snd_buf;
	struct IQUEUEHEAD rcv_buf;
	IUINT32 *acklist;
	IUINT32 ackcount;
	IUINT32 ackblock;
	void *user;
	char *buffer;
	int fastresend;
	int fastlimit;
	int nocwnd, stream;
	int logmask;
	int (*output)(const char *buf, int len, struct IKCPCB *kcp, void *user);
	void (*writelog)(const char *log, struct IKCPCB *kcp, void *user);
};
```

- `conv`: 连接标识, 前面已经讨论过了.
- `mtu`, `mss`: 最大传输单元 (Maximum Transmission Unit) 和最大报文段大小. mss = mtu - 包头长度(24).
- `state`: 连接状态, 0 表示连接建立, -1 表示连接断开. (注意 `state` 是 unsigned int, -1 实际上是 `0xffffffff`)
- `snd_una`: 发送缓冲区中最小还未确认送达的报文段的编号. 也就是说, 编号比它小的报文段都已确认送达.
- `snd_nxt`: 下一个等待发送的报文段的编号.
- `rcv_nxt`: 下一个等待接收的报文段的编号.
- `ts_recent`, `ts_lastack`: 未使用.
- `ssthresh`: Slow Start Threshold, 慢启动阈值.
- `rx_rto`: Retransmission TimeOut(RTO), 超时重传时间.
- `rx_rttval`, `rx_srtt`, `rx_minrto`: 计算 `rx_rto` 的中间变量.
- `snd_wnd`, `rcv_wnd`: 发送窗口和接收窗口的大小.
- `rmt_wnd`: 对端剩余接收窗口的大小.
- `cwnd`: congestion window, 拥塞窗口. 用于拥塞控制.
- `probe`: 是否要发送控制报文的标志.
- `current`: 当前时间.
- `interval`: flush 的时间粒度.
- `ts_flush`: 下次需要 flush 的时间.
- `xmit`: 该链接发送超时的总次数.
- `nrcv_buf`, `nsnd_buf`, `nrcv_que`, `nsnd_que`: 接收缓冲区, 发送缓冲区, 接收队列, 发送队列的长度.
- `nodelay`: 是否启动快速模式, 控制 RTO 增长速度.
- `updated`: 是否调用过 `ikcp_update`.
- `ts_probe`, `probe_wait`: 确定何时需要发送窗口询问报文.
- `dead_link`: 当一个报文发送超时次数达到 `dead_link` 次时认为连接断开.
- `incr`: 用于计算 cwnd.
- `snd_queue`, `rcv_queue`: 发送队列和接收队列.
- `snd_buf`, `rcv_buf`: 发送缓冲区和接收缓冲区.
- `acklist`, `ackcount`, `ackblock`: ACK 列表, ACK 列表的长度和容量.
- `buffer`: flush 时用到的临时缓冲区.
- `fastresend`: ACK 失序 `fastresend` 次时触发快速重传.
- `fastlimit`: 一个报文最多执行 `fastlimit` 次快速重传.
- `nocwnd`: 是否不考虑拥塞窗口.
- `stream`: 是否开启流模式, 开启后可能会合并包.
- `logmask`: 用于控制日志. 本文不讨论它.
- `output`: 下层协议输出函数.
- `writelog`: 日志函数. 本文不讨论它.

### 3.3 队列与缓冲区

我们先来看 `snd_queue`, `rcv_queue`, `snd_buf` 和 `rcv_buf` 这四个字段. 它们分别是发送队列, 接收队列, 发送缓冲区和接收缓冲区. 队列和缓冲区其实都是循环双链表, 链表的节点都是 `struct IKCPSEG`.

调用 `ikcp_send` 发送数据时会先将数据加入 `snd_queue` 中, 然后再伺机加入 `snd_buf`. 每次调用 `ikcp_flush` 时都将 `snd_buf` 中满足条件的报文段都发送出去. 之所以不将报文直接加入 `snd_buf` 是为了防止一次发送过多的报文导致拥塞, 需要再拥塞算法的控制下伺机加入 `snd_buf` 中.

调用 `ikcp_input` 收到的数据解包后会先放入 `rcv_buf` 中, 再在合适的情况下转移到 `rcv_queue` 中. 调用 `ikcp_recv` 接收数据时会在 `rcv_queue` 取出数据返回给调用者. 这时因为报文传输的过程中会出现丢包, 失序等情况. 为了保证顺序, 需要将收到的报文先放入 `rcv_buf` 中, 只有当 `rcv_buf` 中的报文段顺序正确才能将其移动到 `rcv_queue` 中供调用者接收. 如下图所示, `rcv_buf` 中节点为灰色表示可以移动到 `rcv_queue` 中. 只有当 2 号报文重传成功后, 才能将 2, 3, 4 号报文移动到 `rcv_queue` 中.

![receive buffer](/assets/images/kcp_2.svg)

#### 3.3.1 链表的实现

队列和缓冲区都是循环双链表, 它是由一组宏实现的:

```c
struct IQUEUEHEAD {
	struct IQUEUEHEAD *next, *prev;
};

#define IQUEUE_HEAD_INIT(name) { &(name), &(name) }
#define IQUEUE_HEAD(name) \
	struct IQUEUEHEAD name = IQUEUE_HEAD_INIT(name)

#define IQUEUE_INIT(ptr) ( \
	(ptr)->next = (ptr), (ptr)->prev = (ptr))

#define IOFFSETOF(TYPE, MEMBER) ((size_t) &((TYPE *)0)->MEMBER)

#define ICONTAINEROF(ptr, type, member) ( \
		(type*)( ((char*)((type*)ptr)) - IOFFSETOF(type, member)) )

#define IQUEUE_ENTRY(ptr, type, member) ICONTAINEROF(ptr, type, member)

#define IQUEUE_ADD(node, head) ( \
	(node)->prev = (head), (node)->next = (head)->next, \
	(head)->next->prev = (node), (head)->next = (node))

#define IQUEUE_ADD_TAIL(node, head) ( \
	(node)->prev = (head)->prev, (node)->next = (head), \
	(head)->prev->next = (node), (head)->prev = (node))

#define IQUEUE_DEL(entry) (\
	(entry)->next->prev = (entry)->prev, \
	(entry)->prev->next = (entry)->next, \
	(entry)->next = 0, (entry)->prev = 0)

#define IQUEUE_IS_EMPTY(entry) ((entry) == (entry)->next)
```

带头节点的循环双链表, 两个指针, `next` 指向后一个节点, `prev` 指向前一个节点; `IQUEUE_INIT` 初始化时将 `next` 和 `prev` 都指向自己, 这标志着链表为空 (见 `IQUEUE_IS_EMPTY`). `IQUEUE_ADD` 将节点插入到 `head` 后面; `IQUEUE_ADD_TAIL` 将节点插入到 `head` 前面, 因为是循环链表, 所以插到头节点前面就相当于插到链表末尾. 这些都很好理解.

`struct IKCPSEG` 中的 `node` 字段为链表节点. 将一个报文段插入链表时, 实际上是将它的 `node` 字段插入链表中. 那么在链表中取出节点时怎么将它还原成报文段呢? `IQUEUE_ENTRY` 这个宏通过链表节点获取包含这个节点的对象. `IQUEUE_ENTRY` 需要传入节点的指针, 包含这个节点的对象的类型, 以及节点所在的成员. 例如对于链表节点指针 `p`, 我们要还原成 `struct IKCPSEG` 指针, 只需调用 `IQUEUE_ENTRY(p, struct IKCPSEG, node)`. 原理是通过 `IOFFSETOF` 这个宏获取节点成员在结构体中的地址偏移, 然后再用节点的地址减去地址偏移, 就能得到这个结构体对象的地址. `&((TYPE *)0)->MEMBER` 这个表达式对 `NULL` 指针执行 `->` 操作, 但因为只是取地址而并没有访问那个地址, 所以没有任何问题.

## 4. 发送, 接收与重传

## 5. 拥塞控制

## 6. 总结

***

**参考资料:**

- [KCP 源码剖析](https://disenone.github.io/2019/12/17/kcp)
- TCP/IP 详解 卷1: 协议, 机械工程出版社
