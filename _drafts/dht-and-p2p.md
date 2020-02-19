---
title: 分布式哈希表 (DHT) 和 p2p 技术
category: design
featured: true
---
## 1. 引言
相信没有人没使用过 p2p 技术. BT 种子和磁力链接就是最常见的 p2p 技术, 使用 p2p 技术, 文件不再需要集中存储在一台服务器(或一个集群)上, 而是分散再各个用户的节点上, 每个人都是服务的提供者, 也是服务的使用者. 这样的系统具有高可用性, 不会由于一两台机的宕机而导致整个服务不可用. 那么这样一个系统是怎样实现的, 如何做到**去中心化(decentralization)**和**自我组织(self-organization)**的呢? 这篇文章我们来讨论一下这个问题.

这篇文章先会介绍 p2p 网络的整体思路, 并引出 p2p 网络的主角 -- **分布式哈希表(Distributed Hash Table)**; 接着会介绍两种分布式哈希表算法. 这些会让你对 p2p 技术有一个较为具体的了解.

## 2. p2p 网络的概述

### 2.1 传统 CS 网络和 p2p 网络

CS 架构即 Client-Server 架构, 由服务器和客户端组成: 服务器为服务的提供者, 客户端为服务的使用者. 我们如今使用的很多应用程序例如网盘, 视频应用, 网购平台等都是 CS 架构. 它的架构如下图所示:

![cs]()

当然服务器通常不是一个单点, 往往是一个集群; 但本质上是一样的. CS 架构的问题在于, 一旦服务器关闭, 例如宕机, 被 DDos 攻击或者被查水表, 客户端就无法使用了, 服务也就失效了.

为了解决这个问题, 人们提出了 **p2p 网络(Peer-to-peer networking)**. 在 p2p 网络中, 不再由中心服务器提供服务, 不再有"服务器"的概念, 每个人即使服务的提供者也是服务的使用者 -- i.e., 每个人都有可能是服务器. 我们常用的 BT 种子和磁力链接下载服务就是 p2p 架构. 人们对 p2p 系统作了如下定义:

> **a Peer-to-Peer system** is a self-organizing system of equal, autonomous entities (peers) **which** aims for the shared usage of distributed resources in a networked environment avoiding central services.

一个 p2p 系统是每个节点都是平等, 自主的一个自我组织的系统, 目的是在避免中心服务的网络环境中共享使用分布式资源.

![p2p]()

p2p 系统的架构如上图所示. 由于去掉了中心服务器, p2p 系统的稳定性就强很多: 少数几个个节点的失效几乎不会影响整个服务; 除非所有的节点都失效, 否则很难对整个服务造成毁灭性的打击.

### 2.2 朴素的 p2p 网络

如何实现这样一个 p2p 系统呢? 早期的

### 2.3 分布式哈希表

## 3. Chord 算法

## 4. Kademlia 算法

## 5. 总结

---

**参考资料**
- [Peer-to-Peer Systems and Applications](https://www.springer.com/us/book/9783540291923)
- [Chord: A scalable peer-to-peer lookup service for internet applications](https://dl.acm.org/doi/abs/10.1145/964723.383071)
- [Kademlia: A Peer-to-Peer Information System Based on the XOR Metric](https://link.springer.com/chapter/10.1007/3-540-45748-8_5)
