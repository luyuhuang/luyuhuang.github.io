---
title: Clang 编译安装指南
tag: [linux, c/c++]
---
Clang 是一个基于 LLVM 的 C/C++ 编译器，与 GCC 相比有一些优势

- 编译速度比 GCC 快
- 内存占用更小
- 编译报错信息更友好
- 工具链丰富：ASan, clangd, clang-tidy, clang-doc 等

如果 Linux 发行版比较新，可以直接用包管理器安装；但如果发行版比较老旧，就只能编译安装了。本文介绍一些编译安装 Clang 的方法。

## 直接编译安装

Clang 是 LLVM 项目的一部分。LLVM 是一个编译器基础设施，它定义一种中间代码 (IR)，并且能够将这种中间代码编译成各个平台 (x86, ARM, ...) 的机器码。这在 LLVM 中称为*编译器后端*。而 Clang 则是 C/C++ 的*编译器前端*，负责将 C/C++ 代码编译成 LLVM 中间代码。因此要编译安装 Clang，我们就要编译 LLVM。

我们进入 LLVM 官网的下载页面 <https://releases.llvm.org/> 下载 LLVM 源码。LLVM 10.0.0 之后提供整合包 <ruby>llvm-project<rt>LLVM 全家桶</rt></ruby> 下载，包含 clang 在内的各种 LLVM 组件。以最新的 20.1.0 为例，我们直接下载 LLVM 20.1.0 并解压

```bash
curl -LO https://github.com/llvm/llvm-project/releases/download/llvmorg-20.1.0/llvm-project-20.1.0.src.tar.xz
unxz llvm-project-20.1.0.src.tar.xz
tar -xf llvm-project-20.1.0.src.tar
```

LLVM 使用 CMake 构建，要求版本至少为 3.20.0。进入 llvm-project 目录，接着创建 build 目录，然后执行 cmake

```bash
cd llvm-project-20.1.0.src
mkdir build && cd build
cmake ../llvm -DCMAKE_BUILD_TYPE=Release \
              -DLLVM_ENABLE_PROJECTS='clang' \
              -DLLVM_ENABLE_RUNTIMES='compiler-rt;libcxx;libcxxabi;libunwind'
```

CMake 这一步可以传入各种参数，这里介绍一些常用的参数

- `CMAKE_BUILD_TYPE` 构建类型，可以为 `Debug`, `Release`, `RelWithDebInfo`, 或 `MinSizeRel`。默认为 `Debug`，一般设置为 `Release`。
- `DLLVM_ENABLE_PROJECTS` 启用的组件。llvm-project 中有很多组件，除了 `clang`，常用的还有
    - `clang-tools-extra` 额外工具集。包含 clangd, clang-tidy, clang-doc, clang-include-fixer 等。
    - `lldb` 调试器。Clang 编译的程序用 gdb 调试可能会遇到各种问题，最好用 lldb 调试。
    - `lld` 链接器，可替代 ld。

    此外还有 `bolt`, `polly`, `libclc` 等组件，具体可参见 LLVM 文档。多个组件之间用分号 `;` 分隔。
- `DLLVM_ENABLE_RUNTIMES` 启用的运行时组件。常用的组件有
    - `compiler-rt` 编译器运行时。如果要用 Sanitizer 系列工具（如 ASan），则必选。
    - `libcxx` 和 `libcxxabi` 是 LLVM 的 C++ 标准库实现。Clang 默认将程序链接到系统的 libstdc++，但如果要链接到 LLVM 的标准库 libc++，这两个必选
    - `libunwind` 实现堆栈展开的库。如果要链接到 libc++，则必选。
    
    此外还有 `libc`, `llvm-libgcc`, `offload` 等组件，具体可参见 LLVM 文档。多个组件之间用分号 `;` 分隔。
- `CMAKE_INSTALL_PREFIX` 安装路径前缀，默认为 `/usr/local`
- `CMAKE_C_COMPILER` 和 `CMAKE_CXX_COMPILER` 分别指定 C 和 C++ 的编译器，默认为 `gcc` 和 `g++`。后面可以看到，bootstrap 构建时要指定这两个参数。
- `LLVM_ENABLE_LIBCXX` 是否链接到 libc++。默认链接到 libstdc++。后面 bootstrap 构建时要用到这个参数。

如果 LLVM 的各个依赖项都没有问题、这一步成功后，便可执行 `make` 开始构建

```bash
make -j8 # 根据机器情况调整线程数 
```

如果一切顺利，执行 `make install` 即可完成安装。安装前可以执行 `make check-clang` 执行 clang 的测试用例，确认没有问题。

## 老旧发行版编译

要成功构建 LLVM 20.1.0，GCC 版本至少为 7.4。然而在一些老旧发行版（如 CentOS 7）中，GCC 版本并不能满足要求。为此我们需要先用系统的老版编译器编译一个新版编译器，再用新版编译器编译 LLVM。

```
# 下载 gcc-9.1.0
curl -LO https://ftp.gnu.org/gnu/gcc/gcc-9.1.0/gcc-9.1.0.tar.xz
unxz gcc-9.1.0.tar.xz
tar -xf gcc-9.1.0.tar

cd gcc-9.1.0

# 安装依赖
./contrib/download_prerequisites
./configure --prefix=${HOME}/toolchains # 安装到 ~/toolchains
make -j8
make install
```

这里我们编译的 gcc-9.1.0 是用于构建 LLVM 的“临时”编译器，我们不把它安装到系统目录 (`/usr/local/`)，而是安装到 `~/toolchains`。GCC 是系统编译器，不可随意升级，否则可能导致系统其它软件出现兼容性问题。

接着我们用刚刚编译的 gcc-9.1.0 构建 LLVM。

```
cd llvm-project-20.1.0.src
mkdir build && cd build
cmake ../llvm -DCMAKE_C_COMPILER=${HOME}/toolchains/bin/gcc \
              -DCMAKE_CXX_COMPILER=${HOME}/toolchains/bin/g++ \
              -DCMAKE_BUILD_TYPE=Release \
              -DLLVM_ENABLE_PROJECTS='clang' \
              -DLLVM_ENABLE_RUNTIMES='compiler-rt;libcxx;libcxxabi;libunwind'

LD_LIBRARY_PATH=${HOME}/toolchains/lib:${HOME}/toolchains/lib64 make -j8
```

这样我们编译出的 LLVM 工具链依赖于 gcc-9.1.0 的 C++ 运行时环境。需要用环境变量 `LD_LIBRARY_PATH` 指定动态库的路径才能正常运行。

```
$ bin/clang --version # 直接运行通常会出现 libstdc++ 不兼容的报错
bin/clang: /lib64/libstdc++.so.6: version `GLIBCXX_3.4.26' not found (required by bin/clang)
$
$ LD_LIBRARY_PATH=${HOME}/toolchains/lib:${HOME}/toolchains/lib64 bin/clang --version # 需要指定 gcc-9.1.0 的动态库路径
clang version 20.1.0
$
$ LD_LIBRARY_PATH=${HOME}/toolchains/lib:${HOME}/toolchains/lib64 ldd bin/clang
```

## Bootstrap

前面使用 gcc-9.1.0 编译的 LLVM 工具链虽然可以运行，但是却依赖于 gcc-9.1.0 的动态库。由于系统的 C++ 动态库不能随意升级，我们不便将 gcc-9.1.0 的动态库安装到系统中。因此这里比较合适的做法是让 Clang 做一次 Bootstrap（自举），用 gcc-9.1.0 编译的 Clang 构建 LLVM，并链接到 LLVM 的 C++ 运行时环境（也就是 libc++）。

```
cd llvm-project-20.1.0.src
mkdir build1 && cd build1 # 创建一个新的构建目录
cmake ../llvm -DCMAKE_C_COMPILER= $(realpath ../build)/bin/clang \      # 使用 ../build 目录下，用 gcc-9.1.0 编译的 clang 构建
              -DCMAKE_CXX_COMPILER= $(realpath ../build)/bin/clang++ \
              -DLLVM_ENABLE_LIBCXX=ON \                                 # 使用 LLVM 的 libc++
              -DCMAKE_BUILD_TYPE=Release \
              -DLLVM_ENABLE_PROJECTS='clang' \
              -DLLVM_ENABLE_RUNTIMES='compiler-rt;libcxx;libcxxabi;libunwind'

LD_LIBRARY_PATH=${HOME}/toolchains/lib:${HOME}/toolchains/lib64:$(realpath ../build)/lib/x86_64-unknown-linux-gnu make -j8
```

