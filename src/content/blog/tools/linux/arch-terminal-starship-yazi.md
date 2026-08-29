---
link: tools/linux/arch-terminal-starship-yazi
title: "Arch Linux 终端美化：Starship 与 Yazi 安装配置全指南"
date: 2026-08-30
categories: ['工具', 'Linux']
---
## 前言

本指南将整合两个强大的终端工具——Starship 和 Yazi——的安装与配置流程，帮助你将 Arch Linux 的终端体验提升到一个新的水平。Starship 能够为你提供一个美观、信息丰富的命令提示符，而 Yazi 则是一个高效、带预览功能的终端文件管理器。

-----
## 第一部分：Starship - 高度可定制的终端提示符

Starship 是一个用 Rust 编写的、速度极快、高度可定制的终端提示符。它能够在你的命令行中，根据当前目录和环境，智能地显示 Git 分支、项目版本号等关键信息。
![在这里插入图片描述](/img/posts/tools/linux/arch-terminal-starship-yazi/96597c116c7ef41da36a7ccb9d048265.webp)


### 1.1 安装字体 (获取图标支持)

Starship 使用了许多 Nerd Font 字体库中的特殊图标。为了能正常显示这些图标，而不是乱码方块，我们必须先安装并配置一款 Nerd Font 字体。

#### 1.1.1 安装字体包

`FiraCode Nerd Font` 是一款优秀且常用的选择。

```bash
sudo pacman -S ttf-firacode-nerd
```

#### 1.1.2 刷新系统字体缓存

为了让系统能立刻识别到新安装的字体，需要手动刷新字体缓存。

```bash
fc-cache -fv
```

#### 1.1.3 在终端模拟器中配置字体

这是最关键的一步。你需要**打开你所使用的终端软件（如 Konsole）的设置**，并将字体更改为 `FiraCode Nerd Font`。

![在这里插入图片描述](/img/posts/tools/linux/arch-terminal-starship-yazi/00d588710911b3dba787025911ae379e.webp)


以 **Konsole** 为例：

1.  打开 Konsole。
2.  点击菜单栏 `设置` -\> `编辑当前方案...`。
3.  选择 `外观` 标签页，点击 `选择字体...`。
4.  在字体列表中搜索并选中 `FiraCode Nerd Font`。
5.  点击 `确定` 和 `应用` 保存设置。

### 1.2 安装 Starship

Starship 主程序可以直接从 Arch 官方仓库安装。

```bash
sudo pacman -S starship
```

### 1.3 在 Shell 中启用 Starship

为了让 Starship 能够接管默认的终端提示符，需要在你的 Shell 配置文件中添加一行启动命令。**这一步是让配置永久生效的关键**。

#### 1.3.1 确认你的 Shell

首先，确认你当前使用的 Shell 类型。

```bash
echo $SHELL
```

本教程以最常见的 `/bin/bash` 为例。

#### 1.3.2 添加配置到 `.bashrc`

运行以下命令，将 Starship 的启动脚本自动追加到 Bash 的配置文件末尾。

```bash
echo 'eval "$(starship init bash)"' >> ~/.bashrc
```

添加完成后，**完全关闭并重新打开你的终端窗口**，Starship 提示符就会自动生效了。

### 1.4 (可选) 个性化你的 Starship

你可以通过创建一个 TOML 格式的配置文件来进行高度定制。

1.  **创建配置文件**：

    ```bash
    mkdir -p ~/.config && touch ~/.config/starship.toml
    ```

2.  **编辑配置文件**：

    ```bash
    nano ~/.config/starship.toml
    ```

3.  **添加自定义配置**：
    以下是一个简单的示例，它修改了提示符的结束符号，并设置主机名仅在 SSH 连接时显示。

    ```toml
    # ~/.config/starship.toml
    
    # 修改命令成功或失败时显示的符号
    [character]
    success_symbol = "[➜](bold green)"
    error_symbol = "[✗](bold red)"
    
    # 默认隐藏主机名，仅在 SSH 远程连接时显示
    [hostname]
    ssh_only = true
    disabled = false
    ```

    保存文件后，新配置会立即在新的终端提示符上生效。更多可用的配置项可以查阅 [Starship 官方文档](https://starship.rs/config/)。

-----

## 第二部分：Yazi - 高效的终端文件管理器

本部分旨在记录在 Arch Linux 上安装和配置 `Yazi` 的完整过程。特别针对通过 `pacman` 安装后可能遇到的**旧版本 Yazi** 的情况，该版本**没有自动生成配置文件的命令**，且部分**配置项与新版本不同**。本指南将提供一套确保可以成功配置的“手动挡”方案。

![在这里插入图片描述](/img/posts/tools/linux/arch-terminal-starship-yazi/e208224d78f3d93ab4fe5dfa8acaadb8.webp)


### 2.1 安装

#### 2.1.1 安装 Yazi 主程序

Yazi 位于 Arch Linux 的官方软件仓库中，可以直接通过 `pacman` 安装。

```bash
sudo pacman -S yazi
```

#### 2.1.2 安装预览功能依赖

为了让 Yazi 能够预览图片、视频、PDF、压缩包等文件，我们需要安装一系列的依赖工具。

**从官方仓库安装：**

```bash
sudo pacman -S p7zip ffmpegthumbnailer poppler bat ueberzugpp
```

  * `p7zip`: 用于预览压缩文件（.7z, .zip, .rar 等）。
  * `ffmpegthumbnailer`: 用于生成视频文件的缩略图。
  * `poppler`: 用于预览 PDF 文件。
  * `bat`: 用于代码文件语法高亮。
  * `ueberzugpp`: 用于在终端中显示图片。

**从 AUR 仓库安装：**

字体预览工具 `fontpreview-ueberzug` 需要从 AUR 安装。

```bash
yay -S fontpreview-ueberzug
```

### 2.2 核心配置 (手动创建)

由于我们面对的 Yazi 版本可能没有 `yazi init` 命令，我们需要手动创建配置文件来启用和优化预览功能。

#### 2.2.1 创建配置目录

```bash
mkdir -p ~/.config/yazi/
```

#### 2.2.2 创建并编辑主配置文件

使用文本编辑器创建一个新的 `yazi.toml` 文件。

```bash
nano ~/.config/yazi/yazi.toml
```

#### 2.2.3 写入核心配置

将以下内容**完整复制**并粘贴到你打开的 `yazi.toml` 文件中。

```toml
# --- 插件配置 ---
# 告诉 Yazi 使用 ueberzugpp 作为图片预览工具
[plugin]
image_previewer = "ueberzugpp"

# --- 预览质量配置 ---
[preview]
# 提高 PDF 预览的清晰度 (DPI)，默认是 150
pdf_poppler_dpi = 300

# 提高图片预览的质量
# 注意：此旧版本的范围是 50-90，而不是新版的 1-10
image_quality = 85
```

完成后，保存并退出编辑器 (`Ctrl + O`, `Enter`, `Ctrl + X`)。

### 2.3 强烈推荐：更新系统

我们遇到的所有配置问题（没有 `init` 命令、配置项范围不同）都源于软件版本过旧。在 Arch Linux 这样的滚动发行版上，保持系统更新是最佳实践。

运行以下命令可以更新你系统上所有的软件包，包括 Yazi：

```bash
sudo pacman -Syu
```

更新后，你可能会获得一个拥有 `yazi init` 命令的新版本 Yazi，未来的配置会更加方便。

### 2.4 (可选) Shell 集成

为了在退出 Yazi 后，终端能自动跳转到最后浏览的目录，可以将以下函数添加到你的 Shell 配置文件中 (如 `~/.bashrc` 或 `~/.zshrc`)。

```bash
# Yazi: cd on quit
function y {
    local tmp="$(mktemp -t "yazi-cwd.XXXXX")"
    yazi --cwd-file="$tmp"
    if [ -f "$tmp" ]; then
        cd "$(cat "$tmp")"
        rm -f "$tmp"
    fi
}
```

添加后，使用 `source ~/.bashrc` (或 `~/.zshrc`)使其生效，之后便可以用 `y` 命令来启动 Yazi。

-----

## 总结

通过以上步骤，你已经成功地为你的 Arch Linux 终端配置了 Starship 提示符和 Yazi 文件管理器。这两个工具的结合，不仅能让你的终端界面更加现代化和美观，也能极大地提升你在命令行下的工作效率。建议查阅它们的官方文档，探索更多高级定制选项。
