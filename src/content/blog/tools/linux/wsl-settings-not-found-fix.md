---
link: tools/linux/wsl-settings-not-found-fix
title: "WSL 疑难杂症：设置搜索无结果问题的解决方法"
date: 2026-08-30
categories: ['工具', 'Linux']
---
#### 问题如下

![image-20251026165815387](/img/posts/tools/linux/wsl-settings-not-found-fix/1799b768d51f42e1a0e81700b31a9d5c.webp)

#### 解决方法如下

1.搜索栏搜索“WSL Settings”。

![image-20251026170229286](/img/posts/tools/linux/wsl-settings-not-found-fix/aad924cfdf6ca08361ebf1c4b0cc3828.webp)

2.更改网络设置为"Mirrored"。

![image-20251026170331852](/img/posts/tools/linux/wsl-settings-not-found-fix/fbe7220e175d0b8d902d8d10839c5e30.webp)

3.终端重启 WSL 服务。

```bash
wsl --shutdown
```
