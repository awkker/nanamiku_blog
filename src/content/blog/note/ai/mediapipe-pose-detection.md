---
link: note/ai/mediapipe-pose-detection
title: "不到 100 行代码实现人体动作识别：Python + MediaPipe 实时骨骼动画"
date: 2026-08-30
categories: ['笔记', 'AI']
---
曾经想过让电脑像镜子一样实时模仿你的动作吗？或者创建一个 AI 健身教练来纠正你的姿势？今天，我们将一起动手实现这个酷炫的想法！本文将带你从零开始，使用 Python 和 Google 的 MediaPipe 框架，构建一个能够实时识别人体动作并绘制出骨骼动画的程序。

最棒的是？整个过程非常简单，代码不到 100 行，对初学者也极其友好！

![在这里插入图片描述](/img/posts/note/ai/mediapipe-pose-detection/9c4c6404a8cf9f6f9736ce61a73670f1.webp)


> 演示图片来自[【电工版】ラヴィット ◯ Loveit 兮白版编舞翻跳，擦边不存在的！！](https://www.bilibili.com/video/BV13x4y1G7xe?buvid=XU1204A183FF9E3162FF9331389097176F711&from_spmid=main.my-history.0.0&is_story_h5=false&mid=BMlrQLPXyp0dXnwSBBFjcA%3D%3D&plat_id=116&share_from=ugc&share_medium=android&share_plat=android&share_session_id=6f8669a8-7881-4ec2-b018-404b3c9833ee&share_source=WEIXIN&share_tag=s_i&spmid=united.player-video-detail.0.0&timestamp=1760633959&unique_k=y2o5Ol2&up_id=1813797500&vd_source=669d3673e44303b48f278f22b39659db)


---

## 🧐 这是什么技术？

我们即将实现的功能，在计算机视觉领域被称为“**人体姿态估计 (Human Pose Estimation)**”。

它的核心任务是：从一张图片或一帧视频中，识别出人体的关键节点（如肩膀、手肘、膝盖、手腕等），并把它们连接起来，形成一个“骨骼”框架。

**MediaPipe 是由 Google Research 开发并开源的一个功能强大的、跨平台的机器学习解决方案框架。**

它的设计目标是让开发者能够轻松地构建和部署包含多种模式（如视频、音频、时序数据）的复杂机器学习应用管道（Pipelines）。

你可以把它想象成一个“**AI 积木盒**”。Google 已经帮你把许多复杂的 AI 功能（比如人脸检测、手势识别、我们这次用的姿态估计）封装成了一个个即插即用的“积木块”（官方称为 **Solutions**）。我们开发者所要做的，就是像搭积木一样，简单地调用这些功能，快速搭建出自己的应用，而无需从头训练复杂的深度学习模型。

**为什么选择 MediaPipe？**

除了我们在前面提到的几点，MediaPipe 的核心优势可以归纳为以下几点：

- **🚀 现成的解决方案 (Ready-to-use Solutions)** MediaPipe 不仅仅能做姿态估计。它提供了一整套丰富的预构建解决方案，涵盖了**人脸检测、面部网格（Face Mesh）、手势追踪、物体检测、图像分割、头发分割**等众多领域。这些方案都经过了高度优化，开箱即用，让你的创意可以快速落地。
- **⚡️ 极致的性能 (Extreme Performance)** 性能是 MediaPipe 的核心优势之一。它的处理管道专为低延迟和高吞吐量设计，即使在资源有限的设备（如中端智能手机）或普通个人电脑的 CPU 上也能实现令人惊叹的实时处理效果。这也是为什么我们的骨骼追踪程序如此流畅的原因。
- **🌍 一次编写，随处部署 (Write Once, Deploy Anywhere)** MediaPipe 的架构设计使其具有极高的可移植性。你用 Python 开发的应用原型，其核心逻辑可以非常轻松地迁移到 **Android (Java/C++)**, **iOS (Objective-C/C++)**, **C++ 桌面应用**，甚至是 **Web (JavaScript/Wasm)**。这为应用的跨平台部署节省了大量的时间和精力。
- **🛠️ 可定制与可扩展 (Customizable and Extensible)** 虽然 MediaPipe 提供了现成的解决方案，但它本质上是一个非常灵活的框架。对于高级用户，你可以深入其内部，自定义处理流程图（Graph），替换或组合不同的计算模块（Calculator），或者将自己的 TensorFlow Lite 模型集成进去，构建独一无二的 AI 应用。

想要深入探索 MediaPipe 的所有功能,请访问它的官方网站：

- **[MediaPipe 官方网站](https://ai.google.dev/edge/mediapipe/solutions/guide?hl=zh-cn)**
- **[GitHub 官方仓库](https://github.com/google/mediapipe)**

---

## 🚀 第一步：准备你的开发环境

在敲代码之前，我们需要安装两个核心的 Python 库：`opencv-python` 和 `mediapipe`。

* **OpenCV**: 一个强大的计算机视觉库，我们用它来捕获摄像头画面、处理图像和显示结果。
* **MediaPipe**: 我们项目的“大脑”，负责所有姿态估计的 AI 计算。

打开你的终端（Terminal、CMD 或 PowerShell），然后运行以下命令：

```bash
pip install opencv-python mediapipe
```

确保你的电脑连接了一个摄像头，然后我们就可以开始编写代码了！

---

## 👨‍💻 第二步：编写核心代码（逐行详解）

创建一个名为 `dance_tracker.py` 的 Python 文件，然后跟着下面的步骤，把代码一块一块地放进去。

#### 1. 导入工具并初始化

首先，我们需要导入 `cv2` (OpenCV) 和 `mediapipe`，并初始化姿态估计模型和绘图工具。

```python
import cv2
import mediapipe as mp

# 初始化 MediaPipe Pose 模型
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    min_detection_confidence=0.5,  # 检测置信度阈值
    min_tracking_confidence=0.5    # 追踪置信度阈值
)

# 初始化 MediaPipe 的绘图工具
mp_drawing = mp.solutions.drawing_utils
```

* `mp.solutions.pose`: 这是 MediaPipe 提供的姿态估计解决方案。
* `mp_pose.Pose()`: 我们在这里创建了一个姿态估计器的实例。两个`confidence`参数决定了模型的敏感度，0.5 是一个很好的默认值。
* `mp.solutions.drawing_utils`: 这是一套方便的工具，可以帮我们轻松地将识别出的骨骼绘制到图像上。

#### 2. 打开摄像头并开始主循环

接下来，我们需要访问电脑的摄像头，并创建一个循环来不断地读取画面。

```python
# 打开默认摄像头
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("错误：无法打开摄像头。")
    exit()

# 实时处理摄像头的每一帧
while cap.isOpened():
    success, image = cap.read()
    if not success:
        print("忽略了一个空帧。")
        continue

    # ... 后续处理代码将放在这里 ...

# 循环结束后，释放资源
cap.release()
cv2.destroyAllWindows()
```

* `cv2.VideoCapture(0)`: `0` 通常代表你电脑的默认摄像头。如果你有多个摄像头，可以尝试 `1`, `2` 等。如果你想识别视频，就输入'视频路径'，例如`cap = cv2.VideoCapture('miku.mov')`
* `while cap.isOpened()`: 这是一个经典的循环结构，只要摄像头开着，就一直执行循环内的代码。
* `cap.read()`: 这个函数会返回两个值：`success` (一个布尔值，表示是否成功读取) 和 `image` (读取到的那一帧画面)。

#### 3. 图像处理与姿态估计

这是最核心的部分。在循环内部，我们将对每一帧图像进行处理。

```python
    # 为了提高性能，将图像标记为不可写
    image.flags.writeable = False
    
    # MediaPipe 需要 RGB 格式，但 OpenCV 是 BGR，所以需要转换
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 使用 MediaPipe 模型处理图像，得到姿态结果
    results = pose.process(image_rgb)
    
    # 处理完后，再把图像标记为可写，以便绘制
    image.flags.writeable = True
```

* **颜色转换**: 这是一个非常重要的细节！OpenCV 默认使用 BGR 色彩空间，而几乎所有其他的库（包括 MediaPipe）都使用 RGB。如果不转换，模型将无法正确识别颜色，导致性能下降。
* **`pose.process(image_rgb)`**: ✨ **魔法发生的地方！** 就是这一行代码，调用了复杂的 AI 模型，对输入的 RGB 图像进行分析，然后返回一个包含所有姿态信息的 `results` 对象。
* `image.flags.writeable`: 这是 MediaPipe 官方推荐的一个性能优化技巧。通过临时将图像设为“只读”，可以避免不必要的数据拷贝，提高处理速度。

#### 4. 绘制骨骼并显示结果

模型已经给了我们结果，现在需要把它可视化地画出来。

```python
    # 在图像上绘制骨骼
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            image,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            # 自定义关节点和连接线的样式
            landmark_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=4),
            connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
        )
        
    # 将图像水平翻转，产生镜像效果
    flipped_image = cv2.flip(image, 1)

    # 创建窗口并显示图像
    cv2.imshow('Real-time Dance Skeleton by MediaPipe', flipped_image)

    # 如果按下 'q' 键或 ESC 键，则退出循环
    if cv2.waitKey(5) & 0xFF in [ord('q'), 27]:
        break
```

* `results.pose_landmarks`: 如果模型在画面中检测到了人，这个属性就会包含所有 33 个身体关节点的位置信息。
* `mp_drawing.draw_landmarks()`: 这个函数帮我们完成了所有繁琐的绘图工作。我们只需要把原始图像、关节点信息和预设的连接方式 (`mp_pose.POSE_CONNECTIONS`) 传给它就行了。
* `cv2.flip(image, 1)`: 水平翻转图像，这样屏幕里的动作就会像照镜子一样，与你的左右方向一致，体验更好。
* `cv2.imshow()` 和 `cv2.waitKey()`: 这两行代码负责显示窗口，并检测键盘输入，以便我们可以通过按 `q` 键来优雅地关闭程序。

---

## ✅ 第三步：整合代码并运行！

将上面所有的代码片段整合到你的 `dance_tracker.py` 文件中。完整的代码如下：

```python
# dance_tracker.py
# 一个使用 MediaPipe 和 OpenCV 的实时人体姿态估计程序

import cv2
import mediapipe as mp

# 初始化 MediaPipe Pose 模型
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# 初始化 MediaPipe 的绘图工具
mp_drawing = mp.solutions.drawing_utils

# 打开默认摄像头
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("错误：无法打开摄像头。")
    exit()

# 实时处理摄像头的每一帧
while cap.isOpened():
    success, image = cap.read()
    if not success:
        print("忽略了一个空帧。")
        continue

    # 提高性能：将图像标记为不可写
    image.flags.writeable = False
    # 转换色彩空间 BGR -> RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 运行姿态估计
    results = pose.process(image_rgb)
    
    # 将图像标记为可写，以便绘制
    image.flags.writeable = True

    # 在图像上绘制骨骼
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            image,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=4),
            connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
        )
        
    # 产生镜像效果
    flipped_image = cv2.flip(image, 1)

    # 显示结果
    cv2.imshow('Real-time Dance Skeleton by MediaPipe', flipped_image)

    # 按 'q' 或 ESC 退出
    if cv2.waitKey(5) & 0xFF in [ord('q'), 27]:
        break

# 释放资源
cap.release()
cv2.destroyAllWindows()
```

现在，打开终端，进入文件所在的目录，然后运行它！

```bash
python dance_tracker.py
```

一个窗口应该会弹出，显示你的摄像头画面。当你出现在镜头前时，一个由绿色节点和蓝色线条组成的骨骼动画就会神奇地叠加在你的身上，并实时跟随你的每一个动作！

---

## 💡 常见问题与展望

#### 1: 程序报错“无法打开摄像头”怎么办？

这通常是权限问题，特别是在 macOS 或 Windows 上。

* **macOS**: 请进入 `系统设置 > 隐私与安全 > 摄像头`，确保你用来运行脚本的程序（如“终端”或你的代码编辑器 VS Code）的权限开关是打开的。
* **Windows**: 请进入 `设置 > 隐私和安全性 > 相机`，确保“允许应用访问你的相机”是开启的。

### 2:进阶玩法和优化

当你成功运行了基础版本后，还可以尝试做一些更有趣的事情：

1. **处理视频文件**： 将 `cap = cv2.VideoCapture(0)` 改为 `cap = cv2.VideoCapture('你的视频文件.mp4')`，就可以处理本地的舞蹈视频了。
2. **获取特定关节点坐标**： `results.pose_landmarks` 对象中包含了所有 33 个关节点的坐标（x, y, z, visibility）。你可以访问它们并进行计算，例如：
   - 计算手臂弯曲的角度。
   - 判断你是否做出了某个特定的姿势（比如“大”字形）。
   - 将骨骼数据发送到 Unity 或 Unreal Engine，驱动一个 3D 模型。
3. **美化视觉效果**： 你可以完全自定义绘制的骨骼样式，比如改变颜色、粗细，或者用更酷炫的图形元素替换简单的线条和圆点。
4. **性能**： MediaPipe 已经非常快了。如果你的电脑配置较高（有不错的独立显卡），它的表现会更好。如果你觉得卡顿，可以尝试降低摄像头的分辨率。

## 总结

恭喜你！你已经成功构建了一个属于自己的 AI 实时动作捕捉应用。通过这个项目，我们不仅学会了如何使用 OpenCV 和 MediaPipe，更打开了通往计算机视觉世界的大门。希望这篇文章能激发你的创造力，去探索更多 AI 与现实世界交互的可能性。

**Happy coding!**
