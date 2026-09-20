# Knowledge Distillation 论文学习记录：Teacher、Soft Target 与 Temperature 到底在传什么知识

最近读了 Hinton、Vinyals 和 Jeff Dean 2015 年的论文 **《Distilling the Knowledge in a Neural Network》**。这篇论文后来基本成了 Knowledge Distillation（知识蒸馏）最经典的工作之一。

刚开始看时，我觉得“让大模型教小模型”这件事听起来很直观，但真正值得理解的是：**大模型到底把什么“知识”传给了小模型？为什么不能直接用真实标签训练？为什么还要额外引入 Temperature？**

把论文的逻辑串起来以后，我觉得它最核心的一句话是：

> **Teacher 不只是告诉 Student“正确答案是什么”，还告诉它“其他答案分别有多像”。**

而这部分类别之间的关系，正是 soft target 和 temperature 想保留下来的东西。

---

## 1. 为什么需要 Knowledge Distillation？

机器学习里有一个很常见的现象：

> 多个模型做 ensemble（集成），通常比单个模型表现更好。

例如训练 10 个分类器：

$$
f_1,f_2,\dots,f_{10}
$$

预测时把它们输出的概率求平均。

这样通常会比只用其中一个模型更加稳定。

问题是，ensemble 在实际部署时非常麻烦。

假如一个模型本身就很大，现在一次预测还要跑 10 个模型：

$$
\text{输入}
\rightarrow
10\text{个神经网络}
\rightarrow
\text{平均预测}
$$

那么推理时间、内存占用和算力开销都会很大。

论文把这种很强但是很笨重的模型叫做：

**cumbersome model（笨重模型）**。

它可能是：

* 一个很大的神经网络；
* 多个模型组成的 ensemble；
* 一个经过很强正则化的大模型。

作者的想法是：

> 训练阶段可以使用非常昂贵的模型，但部署阶段没有必要继续带着这么大的模型。

所以可以先训练一个很强的模型，然后把它学到的知识转移到一个更小的模型。

这个过程就叫：

$$
\boxed{\text{Knowledge Distillation（知识蒸馏）}}
$$

---

## 2. Teacher 和 Student

后来大家通常把两个模型称为：

**Teacher Model（教师模型）**

和

**Student Model（学生模型）**。

Teacher 通常更大、更强，或者本身就是多个模型组成的 ensemble。

Student 则更小，更适合部署。

整个过程可以简单画成：

```text
大量数据
   ↓
训练 Teacher
   ↓
Teacher 学到比较好的泛化规律
   ↓
生成 soft targets
   ↓
训练 Student 模仿 Teacher
   ↓
部署 Student
```

真正的问题于是变成：

> Teacher 到底应该拿什么东西教 Student？

---

## 3. 模型里的“知识”不一定等于模型参数

这是论文开头一个我觉得很重要的观点。

很自然地，我们可能会认为：

> 模型的知识就是它训练出来的权重参数。

也就是：

$$
W,b
$$

但这样一来，如果 Teacher 和 Student 的网络结构不同，就很难直接把参数复制过去。

论文换了一个角度：

> 模型的知识可以看作它学到的 input-output mapping，也就是从输入到输出之间的映射关系。

比如：

$$
x
\rightarrow
P(y|x)
$$

只要 Student 能学会 Teacher 对不同输入会输出怎样的概率分布，那么它就可能继承 Teacher 的知识，而不需要和 Teacher 使用同样的网络结构。

---

## 4. Hard Target 有什么问题？

普通监督学习中，一张图片如果真实类别是“猫”，标签一般写成 one-hot：

$$
[1,0,0,0]
$$

也就是：

```text
猫：1
狗：0
老虎：0
汽车：0
```

这种标签叫：

**hard target（硬标签）**。

它只告诉模型：

> 正确答案是猫。

但是它完全没有告诉模型：

> 猫和老虎比较像，猫和狗也有一定相似性，但是猫和汽车明显不像。

也就是说，hard target 给的信息非常有限。

---

## 5. Teacher 的输出包含更多东西

假设 Teacher 看一张猫的图片，可能输出：

$$
[0.80,0.10,0.08,0.02]
$$

对应：

```text
猫     0.80
老虎   0.10
狗     0.08
汽车   0.02
```

这就叫：

**soft target（软标签 / 软目标）**。

它除了告诉 Student：

> 猫的概率最大。

还告诉它：

> Teacher 认为老虎和狗也有一点像，但汽车基本不像。

论文中举了一个很直观的例子：

一张 BMW 的图片即使几乎不可能被认错，Teacher 认为它被误认为垃圾车的概率，仍然可能远远高于被误认为胡萝卜的概率。

这些错误类别之间的相对概率，其实反映了 Teacher 学到的类别关系。

---

## 6. Soft Target 真正传递的是什么？

假设有一张手写数字 2。

真实标签只能告诉 Student：

$$
\text{这是 2}
$$

但 Teacher 可能输出：

$$
P(2)=0.98
$$

$$
P(3)=0.015
$$

$$
P(7)=0.00001
$$

这说明：

> Teacher 觉得这张 2 稍微像 3，但基本不像 7。

另一张 2 可能刚好相反：

$$
P(3)=0.00001
$$

$$
P(7)=0.015
$$

那么说明这一张 2 更像 7。

因此 soft target 学到的不只是：

$$
\text{2}
$$

而是：

$$
\boxed{
\text{这个样本和其他类别之间是什么关系}
}
$$

论文认为这些错误类别之间的相对概率包含了丰富的 **similarity structure（相似性结构）**。

后来这类信息也经常被称为一种“dark knowledge”。

---

## 7. 问题：Teacher 的概率往往太尖了

但是这里又出现一个问题。

一个训练得很好的分类器通常会非常 confident（自信）。

比如面对数字 2，可能输出：

$$
[0.000001,\,
0.000005,\,
0.99998,\,
0.00001,\dots]
$$

这时候虽然错误类别之间仍然有差异，但它们全部接近 0。

比如：

$$
10^{-6}
$$

和

$$
10^{-9}
$$

从相对关系来说，两者其实差了：

$$
1000
$$

倍。

但是由于绝对值都太小，训练 Student 时这些信息对 cross entropy（交叉熵）的影响非常弱。

结果就是：

> Teacher 明明知道哪些错误类别更像，但 Student 很难真正看到这些关系。

于是论文引入了非常经典的：

$$
\boxed{\text{Temperature}}
$$

---

## 8. Temperature 是什么？

普通 softmax：

$$
q_i
=
\frac{
e^{z_i}
}{
\sum_j e^{z_j}
}
$$

其中：

$$
z_i
$$

叫做 **logit**。

logit 就是网络最后经过 softmax 之前输出的原始分数。

例如：

$$
z=[10,5,1]
$$

softmax 再把这些分数变成概率。

论文把 softmax 改成：

$$
q_i
=
\frac{
\exp(z_i/T)
}{
\sum_j\exp(z_j/T)
}
$$

这里：

$$
T
$$

就是：

**Temperature（温度）**。

普通 softmax 相当于：

$$
T=1
$$

而知识蒸馏时通常使用：

$$
T>1
$$

---

## 9. 为什么 $T$ 变大以后概率会变软？

假设 logits：

$$
[10,5,1]
$$

如果：

$$
T=1
$$

还是：

$$
[10,5,1]
$$

由于指数函数：

$$
e^{10},e^5,e^1
$$

差距会被进一步放大。

所以最后概率可能非常集中：

```text
类别1：几乎全部
类别2：很小
类别3：更小
```

现在假设：

$$
T=5
$$

那么 softmax 实际看到的是：

$$
[10/5,5/5,1/5]
=
[2,1,0.2]
$$

原来的差距：

$$
10-5=5
$$

现在变成：

$$
2-1=1
$$

也就是说：

> **logits 之间的差值被缩小了。**

于是 softmax 输出就会平滑很多。

可能变成：

$$
[0.65,0.25,0.10]
$$

这时候 Student 就能明显看到：

> 第二类比第三类更接近第一类。

所以 Temperature 真正做的事情是：

$$
\boxed{
\text{缩小 logits 的差距，让隐藏在极小概率中的类别关系更容易显现}
}
$$

注意，被除以 $T$ 的是 **logits**，不是网络参数。

---

## 10. 为什么不能一直把 $T$ 调得特别大？

因为：

$$
T
$$

也不是越大越好。

当：

$$
T\rightarrow\infty
$$

时：

$$
\frac{z_i}{T}\rightarrow0
$$

所有类别的 logit 都越来越接近 0。

最后 softmax 会趋向：

$$
\left[
\frac1N,\frac1N,\dots,\frac1N
\right]
$$

也就是所有类别概率几乎一样。

那 Teacher 原本学到的差异又被抹掉了。

因此：

```text
T 太低
↓
分布太尖
↓
错误类别全部接近 0


T 适中
↓
概率展开
↓
类别关系容易看出来


T 太高
↓
所有类别太平均
↓
有用差异也被冲淡
```

论文的 MNIST 实验也发现，当 Student 非常小时，中等温度反而更合适。

---

## 11. Student 到底怎么学 Teacher？

最简单的蒸馏流程是：

首先 Teacher 使用高温：

$$
T>1
$$

输出：

$$
p_i^{teacher}(T)
$$

然后 Student 使用**同样的 temperature**：

$$
T
$$

得到：

$$
q_i^{student}(T)
$$

接下来训练 Student，让：

$$
q_i^{student}(T)
$$

尽可能接近：

$$
p_i^{teacher}(T)
$$

也就是说：

> Teacher 怎么分配不同类别之间的概率，Student 就尽量学成一样。

训练完成以后，真正部署 Student 时再恢复：

$$
T=1
$$

进行正常预测。

---

## 12. 真实标签还要不要？

要。

论文发现，如果有真实标签，最好的方法并不是完全只听 Teacher，而是：

> **同时学习 Teacher 的 soft target 和真实 hard target。**

因此 Student 实际上有两个学习目标。

第一部分：

$$
L_{soft}
$$

让 Student 模仿 Teacher 的 soft targets。

第二部分：

$$
L_{hard}
$$

让 Student 学真实标签。

可以粗略写成：

$$
L
=
\alpha L_{soft}
+
(1-\alpha)L_{hard}
$$

也就是说 Student 同时听：

```text
Teacher：
“我觉得它 70% 像猫，
20% 像老虎，
8% 像狗……”

真实标签：
“答案确实是猫。”
```

这两个信息是互补的。

Teacher 提供类别结构，真实标签保证 Student 不会完全复制 Teacher 的错误。

---

## 13. 为什么 soft loss 还经常乘一个 $T^2$？

论文还指出：

soft target 对 logits 产生的梯度大小大约会随着：

$$
\frac1{T^2}
$$

下降。

也就是说，temperature 越高：

> soft loss 的梯度会越来越小。

如果还要同时训练：

$$
L_{soft}
$$

和：

$$
L_{hard}
$$

那么改变 $T$ 之后，两者权重关系就会发生很大变化。

因此论文建议把 soft target 对应的梯度乘：

$$
T^2
$$

以补偿这个尺度变化。

后来常见的 Knowledge Distillation loss 就经常写成类似：

$$
L
=
\alpha T^2L_{KD}
+
(1-\alpha)L_{CE}
$$

其中：

* $L_{KD}$：蒸馏 loss；
* $L_{CE}$：真实标签的交叉熵；
* $T$：temperature；
* $\alpha$：两种目标的权重。

---

## 14. Matching Logits 和 Distillation 什么关系？

论文还讨论了一种更直接的方法：

> 不让 Student 学 Teacher 的概率，而是直接学 Teacher 的 logits。

假设 Teacher 的 logits 是：

$$
v_i
$$

Student 的 logits 是：

$$
z_i
$$

那么可以直接最小化：

$$
(z_i-v_i)^2
$$

论文证明，当 Temperature 非常高时，distillation 的梯度近似为：

$$
\frac{\partial C}{\partial z_i}
\approx
\frac{1}{NT^2}(z_i-v_i)
$$

因此：

> **Matching logits 可以看成高温蒸馏的特殊情况。**

换句话说，Temperature 其实提供了一个比较灵活的连续控制：

```text
正常概率
   ↓
提高 T
   ↓
概率越来越软
   ↓
很高的 T
   ↓
越来越接近直接匹配 logits
```

---

## 15. MNIST 实验：Student 能接近 Teacher

论文首先在 MNIST 上做实验。

一个比较大的网络：

* 两个 hidden layer；
* 每层 1200 个 ReLU。

测试集错误数：

$$
67
$$

一个较小的网络：

* 两个 hidden layer；
* 每层 800 个 ReLU；
* 没有同样的强正则化。

正常训练时错误数：

$$
146
$$

但是让这个小网络去学习大网络产生的 soft targets，并使用：

$$
T=20
$$

以后，错误数降到：

$$
74
$$

也就是说：

$$
146\rightarrow74
$$

已经非常接近 Teacher 的：

$$
67
$$

这说明 Teacher 学到的很多东西，确实可以通过 soft target 转移给 Student。

---

## 16. 一个非常有意思的实验：Student 从来没见过数字 3

论文还做了一个很有意思的实验。

他们把蒸馏训练集里的所有数字：

$$
3
$$

全部删除。

也就是说：

> Student 训练时根本没有见过真正的 3。

但是 Teacher 在其他数字上输出 soft targets 时，仍然会给“3”这个类别一定概率。

比如 Teacher 看一张类似 3 的数字时，可能输出：

$$
P(3)>0
$$

Student 因此仍然能间接地了解“3”这个类别和其他数字之间的关系。

论文中，在调整类别 bias 后，这个 Student 对测试集数字 3 达到了：

$$
98.6\%
$$

的正确率，即使训练蒸馏数据里从来没有真正出现过 3。

这个实验很能说明问题：

> soft target 不只是传递单个样本的答案，而是在传递类别之间的整体结构。

---

## 17. Speech Recognition 实验

论文还在真实的语音识别系统上验证了这个方法。

使用的是当时一个 Android Voice Search 声学模型的版本。

单模型大约有：

$$
85M
$$

参数。

训练数据约：

$$
2000
$$

小时语音，对应大约：

$$
700M
$$

训练样本。

Baseline 单模型结果：

$$
Frame\ Accuracy=58.9\%
$$

$$
WER=10.9\%
$$

这里：

**WER = Word Error Rate（词错误率）**

越低越好。

然后作者训练 10 个模型做 ensemble：

$$
Frame\ Accuracy=61.1\%
$$

$$
WER=10.7\%
$$

接下来再把这个 10-model ensemble 蒸馏到一个 single model：

$$
Frame\ Accuracy=60.8\%
$$

$$
WER=10.7\%
$$

也就是说：

```text
10 个模型 ensemble
      ↓
   distillation
      ↓
1 个模型
```

最后一个模型几乎保留了 ensemble 的性能。

这正好验证了论文一开始的目标：

> **训练时可以复杂，部署时可以简单。**

---

## 18. Soft Target 还能防止过拟合

论文后面还发现了一个很有意思的现象：

soft target 本身可以充当非常强的：

**regularizer（正则化手段）**。

在 speech recognition 实验中，只使用：

$$
3\%
$$

的训练数据。

如果正常用 hard target 训练：

训练准确率：

$$
67.3\%
$$

但测试准确率只有：

$$
44.5\%
$$

明显严重 overfitting（过拟合）。

但是同样使用 3% 的数据，改成 Teacher 提供的 soft target：

测试准确率达到：

$$
57.0\%
$$

而使用完整 100% 数据训练的 baseline 是：

$$
58.9\%
$$

也就是说：

> 只使用 3% 的真实数据，但通过 Teacher 的 soft targets，Student 几乎恢复了使用完整数据才能学到的泛化能力。

这是因为 soft target 本身已经包含 Teacher 从完整数据里总结出来的一些规律。

---

## 19. 后半篇的 Specialist Model

论文后半部分还提出了：

**specialist model（专家模型）**。

背景是 Google 的 JFT 数据集：

$$
100\text{ million images}
$$

以及大约：

$$
15,000
$$

个类别。

对于这种超大规模分类任务，再训练很多完整网络做 ensemble 成本太高。

所以作者提出：

先训练一个：

**generalist model（通才模型）**

负责所有类别。

然后针对特别容易互相混淆的一些类别，再训练：

**specialist models（专家模型）**。

比如一个 specialist 专门区分：

```text
Bridge
Cable-stayed bridge
Suspension bridge
Viaduct
...
```

另一个专门区分不同汽车型号。

每个 specialist 只重点处理自己负责的一小组类别，因此训练成本更低。

---

## 20. Specialist 的结果

论文最终训练了：

$$
61
$$

个 specialist models。

JFT baseline 的 test accuracy：

$$
25.0\%
$$

加 specialists 后：

$$
26.1\%
$$

相对提升约：

$$
4.4\%
$$

而且论文观察到，一个类别被越多 specialists 覆盖，准确率提升通常越明显。

不过需要注意：

> 论文当时并没有真正完成把所有 specialist 的知识再蒸馏回一个单模型。

作者在 Discussion 里明确说明，这部分还是未来工作。

---

## 21. 这篇论文真正应该抓住什么？

如果只是理解 Knowledge Distillation 主线，我觉得可以把后半部分 Specialist 暂时放到次要位置。

最重要的是这一条链：

$$
\boxed{
Teacher
\rightarrow
Soft\ Target
\rightarrow
Temperature
\rightarrow
Student
}
$$

Teacher 很强，但很大。

Teacher 对每个样本产生一个完整概率分布。

Temperature 把原本非常尖锐的概率分布摊开。

Student 不只学习：

> “正确答案是谁”。

还学习：

> “Teacher 认为其他类别分别有多像”。

于是 Teacher 的泛化规律和类别关系就能够被转移到 Student。

---

## 22. 和普通监督学习到底差在哪里？

普通训练：

```text
图片
 ↓
真实标签
 ↓
猫 = 1
其他 = 0
 ↓
Student
```

知识蒸馏：

```text
            Teacher
              ↓
      soft probability
       ↓      ↓      ↓
     猫0.7  虎0.2  狗0.1
              ↓
图片 ─────→ Student
              ↑
          真实标签：猫
```

也就是说：

$$
\boxed{
\text{普通监督学习：学答案}
}
$$

而：

$$
\boxed{
\text{知识蒸馏：既学答案，也学 Teacher 对答案空间的理解}
}
$$

---

## 23. 这篇论文里几个重要英文

以后再看到这些词可以这样对应：

| 英文                        | 含义             |
| ------------------------- | -------------- |
| Distillation              | 蒸馏             |
| Teacher model             | 教师模型           |
| Student / distilled model | 学生模型 / 蒸馏模型    |
| Cumbersome model          | 笨重的大模型         |
| Ensemble                  | 模型集成           |
| Hard target               | 硬标签            |
| Soft target               | 软标签            |
| Logit                     | softmax 前的原始分数 |
| Temperature               | 温度             |
| Transfer set              | 用于蒸馏的数据集       |
| Generalization            | 泛化             |
| Regularization            | 正则化            |
| Overfitting               | 过拟合            |
| Specialist                | 专家模型           |
| Generalist                | 通才模型           |
| Confusable classes        | 容易混淆的类别        |
| Deployment                | 部署             |
| Latency                   | 延迟             |

---

## 24. 我目前对 Knowledge Distillation 的理解

我觉得这篇论文最重要的不是：

> “大模型压缩成小模型。”

而是更深一层的问题：

> **为什么 Student 通过 Teacher 会比只看真实标签学得更好？**

答案是：

真实标签只提供：

$$
\text{这个样本属于哪个类别}
$$

而 Teacher 的 soft target 还提供：

$$
\text{这个样本和所有其他类别之间是什么关系}
$$

Temperature 的作用则是：

> **把这些原本藏在极小概率中的关系信息暴露出来。**

所以 Knowledge Distillation 并不只是简单复制 Teacher 最终预测的类别。

如果只复制：

$$
\arg\max P(y|x)
$$

那么 Teacher 输出：

```text
猫 99%
虎 0.7%
狗 0.2%
汽车 0.1%
```

最终只留下：

```text
猫
```

大量信息都被扔掉了。

真正的蒸馏则尽可能保留：

$$
P(y|x)
$$

整个概率结构。

---

## 25. 一句话总结

如果只让我记住这篇论文的一句话，我会记：

$$
\boxed{
\text{知识蒸馏 = 让小模型不仅学 Teacher 的答案，还学 Teacher 对不同答案之间关系的判断。}
}
$$

而最关键的三个概念就是：

$$
\boxed{
\text{Soft Target + Temperature + Teacher-Student Training}
}
$$

其中 Temperature 的核心作用就是：

$$
\boxed{
\text{缩小 logits 差距，让隐藏在小概率里的类别关系显现出来。}
}
$$

这就是这篇论文最核心的逻辑。
