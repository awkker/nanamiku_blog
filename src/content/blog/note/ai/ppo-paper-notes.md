---
title: "PPO 论文学习记录：从 Policy Gradient、TRPO 到 Clipping"
link: note/ai/ppo-paper-notes
date: 2026-09-20
categories: ['笔记', 'AI']
math: true
description: "逐节拆解 PPO 论文：从 Policy Gradient 到 TRPO 的信赖域，再到 PPO 的 clipped surrogate objective，讲清 ratio、clip 与 min 到底在解决什么问题。"
---

最近读了 OpenAI 2017 年的论文 **《Proximal Policy Optimization Algorithms》**。这篇论文提出了后来非常经典的 PPO（Proximal Policy Optimization，近端策略优化）算法。

刚开始看 PPO 的时候，我觉得公式本身倒不算特别复杂，真正容易卡住的是：为什么前面突然讲 Policy Gradient，为什么又引出 TRPO，为什么 PPO 里又出现和 TRPO 一样的 probability ratio，最后那个 `clip` 和 `min` 又到底在解决什么问题。

把这些东西串起来之后，我感觉 PPO 的思路其实非常自然：

> **我们希望策略不断变好，但又不希望它因为一批不够可靠的数据，一次更新得太猛。**

PPO 做的核心事情，就是想办法让策略“稳一点地变好”。

---

## 1. 先从 Policy Gradient 开始

强化学习里，我们有一个策略：

$$
\pi_\theta(a|s)
$$

其中 $s$ 是当前状态（state），$a$ 是动作（action），$\theta$ 是神经网络参数。

$$
\pi_\theta(a|s)
$$

可以理解为：

> 在状态 $s$ 下，当前策略选择动作 $a$ 的概率。

Policy Gradient（策略梯度）的目标，就是直接调整 $\theta$，让好的动作以后更容易被选中，坏的动作以后更不容易被选中。

论文给出的标准策略梯度估计是：

$$
\hat g
=
\hat E_t
\left[
\nabla_\theta
\log \pi_\theta(a_t|s_t)
\hat A_t
\right]
$$

这里最重要的是两个东西。

首先：

$$
\nabla_\theta\log\pi_\theta(a_t|s_t)
$$

可以粗略理解成：

> 参数应该往哪个方向调整，才能改变当前动作 $a_t$ 的概率。

而：

$$
\hat A_t
$$

是 Advantage（优势）的估计值，它回答的是：

> 这个动作相比正常水平到底好多少？

如果：

$$
A_t>0
$$

说明这个动作比预期好，那么策略就应该提高这个动作的概率。

如果：

$$
A_t<0
$$

说明这个动作比预期差，那么策略就应该降低这个动作的概率。

所以整个 Policy Gradient 最直观的理解就是：

$$
\boxed{
\text{更新方向}
=
\text{“怎么改变动作概率”}
\times
\text{“这个动作到底好不好”}
}
$$

论文第 2 节就是从这个标准 Policy Gradient estimator 出发。

---

## 2. Policy Gradient 的一个麻烦：策略可能一下改得太狠

假设机器人来到一个岔路。

旧策略是：

$$
P(\text{左})=0.5,\qquad
P(\text{右})=0.5
$$

这一次机器人碰巧走了左边，而且得到了很高的奖励。

于是：

$$
A_t>0
$$

Policy Gradient 就会提高“向左”的概率。

本来：

$$
0.5
$$

可能变成：

$$
0.6
$$

这没什么问题。

但是如果我们拿同一批数据连续训练很多次，它可能继续变成：

$$
0.7\rightarrow0.8\rightarrow0.9\rightarrow0.99
$$

问题在于，这一次“向左很好”可能只是有限采样得到的结果，甚至可能有运气成分。

如果我们因为这一批数据，就把整个策略从：

$$
50\%:50\%
$$

直接改成：

$$
99\%:1\%
$$

风险就很大。

论文也明确提到，直接在普通 Policy Gradient objective 上，对同一批 trajectory（轨迹）做多次优化，经常会产生 **destructively large policy updates**，也就是破坏性过大的策略更新。

这里就产生了一个很现实的矛盾：

> 数据很贵，我希望一批环境交互数据多训练几次；
> 但是训练太多，又怕新策略离产生这些数据的旧策略越来越远。

---

## 3. TRPO：允许变好，但别离旧策略太远

在 PPO 之前，TRPO（Trust Region Policy Optimization，信赖域策略优化）已经在解决这个问题。

TRPO 的目标写成：

$$
\max_\theta
\hat E_t
\left[
\frac{
\pi_\theta(a_t|s_t)
}{
\pi_{\theta_{old}}(a_t|s_t)
}
\hat A_t
\right]
$$

同时要求：

$$
\hat E_t
\left[
KL
\left(
\pi_{\theta_{old}}(\cdot|s_t)
\|
\pi_\theta(\cdot|s_t)
\right)
\right]
\leq\delta
$$

这里出现了一个非常重要的 ratio（概率比）：

$$
\frac{
\pi_\theta(a_t|s_t)
}{
\pi_{\theta_{old}}(a_t|s_t)
}
$$

它表示：

> 新策略相比旧策略，对当前这个动作的态度变了多少。

如果旧策略选择某动作的概率是：

$$
0.5
$$

新策略变成：

$$
0.6
$$

那么：

$$
\frac{0.6}{0.5}=1.2
$$

说明这个动作的概率相对提高了 20%。

如果 ratio 大于 1，说明新策略更喜欢这个动作；如果小于 1，说明新策略没以前那么喜欢这个动作。

而 KL divergence（KL 散度）可以简单理解为：

> 两个概率分布整体差了多少。

所以 TRPO 的思想实际上很好理解：

$$
\boxed{
\text{尽量让策略变好}
\quad
\text{但新策略不能离旧策略太远}
}
$$

所谓 Trust Region（信赖域），就是以旧策略为中心规定一个允许变化的范围，然后在这个范围里寻找更好的策略。

---

## 4. 为什么 TRPO 里还有一个减 KL 的写法？

论文还给出了另一个形式：

$$
\max_\theta
\hat E_t
\left[
\frac{
\pi_\theta(a_t|s_t)
}{
\pi_{\theta_{old}}(a_t|s_t)
}
\hat A_t
-
\beta
KL[
\pi_{\theta_{old}},
\pi_\theta
]
\right]
$$

这里的：

$$
-\beta KL
$$

就是 penalty（惩罚项）。

因为我们的目标是最大化整个 objective，所以新旧策略差得越大，KL 越大，减掉的东西也越多。

也就是说：

> 策略变好当然加分，但如果为了变好而一下改得太远，就扣分。

其中：

$$
\beta
$$

是 penalty coefficient（惩罚系数）。

$\beta$ 大，说明对策略变化限制比较严格；$\beta$ 小，说明允许策略变化得更激进。

不过论文指出，一个固定的 $\beta$ 很难在不同任务、甚至同一任务的不同训练阶段一直合适，所以 TRPO 实际采用的是 KL hard constraint（硬约束），而不是简单固定一个 KL penalty。

---

## 5. PPO 的出发点：TRPO 思想很好，但实现有点复杂

TRPO 的问题不是思路不好，而是实现相对复杂。

它需要处理 constrained optimization（约束优化），还会涉及共轭梯度、二阶近似等。

PPO 想做的是：

> 能不能保留 TRPO “策略一次别改太多”这个核心思想，但只用普通的一阶优化，例如 SGD 或 Adam？

于是 PPO 沿用了 TRPO 里的 probability ratio，并给它起了一个名字：

$$
r_t(\theta)
=
\frac{
\pi_\theta(a_t|s_t)
}{
\pi_{\theta_{old}}(a_t|s_t)
}
$$

也就是说，PPO 的这个 $r_t$ 其实就是 TRPO 里已经出现的那个概率比。

TRPO 的 surrogate objective（代理目标）因此可以写成：

$$
L^{CPI}(\theta)
=
\hat E_t
[
r_t(\theta)\hat A_t
]
$$

PPO 真正的新东西，是接下来怎么处理这个 $r_t$。

---

## 6. Clip 到底是什么？

PPO 最经典的公式是：

$$
L^{CLIP}(\theta)
=
\hat E_t
\left[
\min
\left(
r_t(\theta)\hat A_t,
\operatorname{clip}
(r_t(\theta),1-\epsilon,1+\epsilon)
\hat A_t
\right)
\right]
$$

先看：

$$
\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)
$$

`clip` 就是截断。

假设论文里常见的：

$$
\epsilon=0.2
$$

那么允许范围就是：

$$
[0.8,1.2]
$$

于是：

$$
r=0.6
$$

clip 后变成：

$$
0.8
$$

$$
r=1.1
$$

仍然是：

$$
1.1
$$

$$
r=1.5
$$

clip 后变成：

$$
1.2
$$

所以 clip 本身非常简单。

真正值得想的是：

> 为什么 PPO 不是直接写 $clip(r_t)A_t$，还非要再和原来的 $r_tA_t$ 取一个 `min`？

---

## 7. 为什么一定要有 `min`？

这其实是我觉得 PPO 公式里最巧的一部分。

假设：

$$
A_t>0
$$

说明当前动作是好动作，我们希望提高它的概率，也就是让：

$$
r_t>1
$$

如果：

$$
r_t=1.1
$$

那么说明概率只是适当提高，正常。

如果：

$$
r_t=1.5
$$

说明概率已经提高很多了。

PPO 不希望继续奖励这种过度更新，所以会用：

$$
clip(1.5,0.8,1.2)=1.2
$$

把收益截住。

因此，对于 $A_t>0$，当：

$$
r_t>1+\epsilon
$$

之后，继续增大 $r_t$ 已经不会带来更多目标函数收益。

这就是：

> 好动作可以提高概率，但别提高得太狠。

然而如果 $A_t>0$，模型却把这个好动作的概率降得很厉害，比如：

$$
r_t=0.5
$$

这明显是错误方向。

假设：

$$
A_t=10
$$

原始项是：

$$
r_tA_t
=
0.5\times10
=
5
$$

而如果只用 clip：

$$
clip(0.5,0.8,1.2)\times10
=
8
$$

反而等于替这个错误更新“减轻了惩罚”。

所以 PPO 再取：

$$
\min(5,8)=5
$$

也就是说：

> **如果你是在往错误方向走，我不会帮你 clip 掉惩罚。**

对于：

$$
A_t<0
$$

情况正好反过来。

这是一个坏动作，所以降低它的概率是正确方向。如果：

$$
r_t<1-\epsilon
$$

说明你已经把坏动作概率降得很多了，PPO 就不再继续奖励。

但如果：

$$
r_t>1+\epsilon
$$

说明你反而在大幅提高坏动作概率，那么 PPO 不会替你截断惩罚。

因此可以把 PPO 的 `min` 记成一句话：

> **做对了但做过头，就停止额外奖励；做错了，不管错多远，都继续惩罚。**

论文把这种设计称为一个比较 pessimistic（悲观、保守）的目标。Figure 1 正好分别画出了 $A>0$ 和 $A<0$ 两种情况下的效果。

---

## 8. PPO 并不是强制把 $r_t$ 限制在 0.8 到 1.2

这一点也很容易误解。

PPO 并不是硬性规定：

$$
0.8\le r_t\le1.2
$$

训练之后，某些样本的 $r_t$ 完全有可能超过这个范围。

PPO 真正做的是：

> 当 ratio 朝着“有利方向”变化得太多以后，不再继续增加目标函数收益。

所以它不是 hard constraint（硬约束），而是一种通过修改 objective 达到的软限制。

这正是它比 TRPO 更容易优化的地方。

---

## 9. PPO 为什么能把同一批数据多训练几轮？

这就回到了最开始的问题。

普通 Policy Gradient 如果对同一批数据连续更新很多次，新策略可能迅速偏离产生这批数据的旧策略。

PPO 每轮先用：

$$
\pi_{\theta_{old}}
$$

和环境交互，收集数据。

然后固定 old policy，在同一批数据上训练多个 epoch（轮次）。

每次更新都计算：

$$
r_t
=
\frac{
\pi_\theta(a_t|s_t)
}{
\pi_{\theta_{old}}(a_t|s_t)
}
$$

从而知道：

> 当前策略已经离采样数据时的旧策略多远了。

如果变化开始太激进，clipping 就会让继续往这个方向更新失去额外收益。

这样，PPO 就能够比较安全地在同一批数据上进行多轮 minibatch（小批量）更新。

---

## 10. 完整 PPO 其实不只有 Policy Loss

论文真正训练时使用的目标是：

$$
L_t^{CLIP+VF+S}(\theta)
=
\hat E_t
\left[
L_t^{CLIP}
-
c_1L_t^{VF}
+
c_2S[\pi_\theta](s_t)
\right]
$$

这里实际上包含三个部分。

第一部分：

$$
L^{CLIP}
$$

就是前面讲的 policy objective，用来更新策略。

第二部分：

$$
L_t^{VF}
=
(V_\theta(s_t)-V_t^{targ})^2
$$

是 Value Function（价值函数）的误差。

这里的：

$$
V(s)
$$

表示：

> 从当前状态出发，未来大概能获得多少累计奖励。

这就是 Actor-Critic（演员—评论家）结构中的 Critic。

Actor 负责：

$$
\pi(a|s)
$$

决定做什么动作。

Critic 负责：

$$
V(s)
$$

评价当前状态大概有多好。

第三部分：

$$
S[\pi_\theta](s_t)
$$

是 entropy bonus（熵奖励），主要用于鼓励 exploration（探索），防止策略太早变得极端。

---

## 11. Advantage 怎么算？GAE

PPO 需要：

$$
\hat A_t
$$

论文使用了 truncated GAE，也就是 Generalized Advantage Estimation（广义优势估计）。

形式为：

$$
\hat A_t
=
\delta_t
+
(\gamma\lambda)\delta_{t+1}
+
(\gamma\lambda)^2\delta_{t+2}
+\cdots
$$

其中：

$$
\delta_t
=
r_t
+
\gamma V(s_{t+1})
-
V(s_t)
$$

这里的 $\delta_t$ 是 TD error（时序差分误差）。

直观上：

$$
r_t+\gamma V(s_{t+1})
$$

是在说：

> 我执行完这个动作以后，实际拿到的即时奖励，加上下一个状态的未来价值，大概是多少。

而：

$$
V(s_t)
$$

是 Critic 原本对当前状态的预期。

两者相减：

$$
\delta_t
$$

就表示：

> 事情实际发展得比我原先预期好还是差。

论文中常用：

$$
\gamma=0.99
$$

以及：

$$
\lambda=0.95
$$

其中 $\gamma$ 是 discount factor（折扣因子），控制未来奖励的重要程度；$\lambda$ 是 GAE 参数，用来在 bias（偏差）和 variance（方差）之间做折中。

---

## 12. 整个 PPO 训练流程

论文里的 Algorithm 1 用的是 Actor-Critic 风格。

每一轮先让多个 actor 使用旧策略：

$$
\pi_{\theta_{old}}
$$

与环境交互 $T$ 个 timestep（时间步），得到状态、动作和奖励。

然后根据这些轨迹计算：

$$
\hat A_t
$$

接着固定：

$$
\theta_{old}
$$

对这批数据进行多个 epoch 的 minibatch 优化。

训练过程中不断计算：

$$
r_t
=
\frac{\pi_\theta}{\pi_{\theta_{old}}}
$$

并使用 clipped surrogate objective 来限制过于激进的策略更新。

这一轮优化结束后，再把：

$$
\theta_{old}\leftarrow\theta
$$

然后用新的策略重新与环境交互、采集下一批数据。

所以 PPO 整体实际上是一个不断重复：

$$
\text{采数据}
\rightarrow
\text{优化几轮}
\rightarrow
\text{更新 old policy}
\rightarrow
\text{重新采数据}
$$

的过程。

---

## 13. 论文还比较了 KL penalty 和 clipping

作者其实并不是只试了 clipping。

论文还设计了 adaptive KL penalty（自适应 KL 惩罚）：

$$
L^{KLPEN}
=
E[
r_tA_t
-
\beta KL
]
$$

如果实际 KL 太小，就减小 $\beta$；如果 KL 太大，就增大 $\beta$。

直观上就是：

> 策略改得太少，就放宽限制；
> 策略改得太多，就加强惩罚。

不过实验中，作者发现 clipped surrogate objective 的表现更好，因此后面通常说 PPO，主要指的就是 PPO-Clip。

---

## 14. 实验结果

论文首先在 7 个 MuJoCo 连续控制任务上比较不同 objective。

没有 clipping 或 penalty 的版本平均归一化成绩是：

$$
-0.39
$$

而：

$$
\epsilon=0.2
$$

的 clipping 版本达到：

$$
0.82
$$

高于论文测试的几种固定 KL penalty 和 adaptive KL penalty 设置。

这也说明了一个很直观的问题：

> 如果对 policy update 完全不做限制，训练确实可能非常不稳定。

之后作者又把 PPO 和 TRPO、A2C、CEM 等方法放在连续控制环境里比较，论文报告 PPO 在几乎所有这些连续控制任务中取得了更好的表现。

论文还在更复杂的 Humanoid 控制任务上测试，包括跑步、目标位置改变后转向，以及受到方块撞击后重新站起来等任务。

在 Atari 游戏上，作者比较了 A2C、ACER 和 PPO。

这里的 Atari 是一类经典电子游戏 benchmark。

A2C 是 Advantage Actor-Critic（优势演员—评论家）。

ACER 是 Actor-Critic with Experience Replay，其目标之一是通过 Experience Replay（经验回放）提高样本利用效率。

论文的结论是：PPO 在 sample complexity（样本复杂度，也可以理解成样本效率）方面明显优于 A2C，并且和 ACER 接近，但算法更加简单。

---

## 15. PPO 的几个经典 hyperparameter

Hyperparameter（超参数）指的是：

> 不是模型通过训练自己学出来的参数，而是人为设置的训练规则。

比如网络权重：

$$
\theta
$$

属于 parameter（参数）。

而：

$$
\epsilon,\gamma,\lambda,\text{learning rate}
$$

这些属于 hyperparameter。

论文在 MuJoCo 实验中的一组设置包括：

$$
T=2048
$$

$$
\text{Adam learning rate}=3\times10^{-4}
$$

$$
\text{epochs}=10
$$

$$
\text{minibatch size}=64
$$

$$
\gamma=0.99
$$

$$
\lambda=0.95
$$

而 clipping 的实验中：

$$
\epsilon=0.2
$$

表现最好。

---

## 16. 我目前对 PPO 的理解

读完整篇论文以后，我觉得 PPO 最核心的东西并不是那个看起来很复杂的公式，而是它背后的逻辑。

Policy Gradient 告诉我们：

> 好动作提高概率，坏动作降低概率。

但是 Policy Gradient 本身没有很好地解决：

> 一次应该改多少？

TRPO 的回答是：

> 用 KL divergence 规定一个 Trust Region，新策略不能离旧策略太远。

这个思路很好，但优化起来比较复杂。

PPO 则进一步简化成：

> 不再直接解一个 KL 约束问题，而是在 objective 里对新旧策略的 probability ratio 做 clipping。

于是整个发展过程可以概括成：

$$
\boxed{
\text{Policy Gradient}
\rightarrow
\text{TRPO}
\rightarrow
\text{PPO}
}
$$

其中核心问题始终没变：

$$
\boxed{
\text{怎样让策略变好，同时避免一次更新得太猛？}
}
$$

而 PPO 最有意思的地方就在于，它用一个非常简单的：

$$
\min
\left(
r_tA_t,\,
clip(r_t,1-\epsilon,1+\epsilon)A_t
\right)
$$

实现了一个很直观的原则：

> **做对了可以奖励，但做对得太过头以后不再额外奖励；做错了则继续承担惩罚。**

从这个角度看，“Proximal”这个名字也非常贴切。

它不是要求模型完全不变，而是希望：

$$
\pi_{\theta_{new}}
$$

始终不要一下离：

$$
\pi_{\theta_{old}}
$$

太远。

---

## 17. 一句话总结

如果只让我记住 PPO 的一句话，我现在会记成：

$$
\boxed{
\text{PPO = 允许策略变好，但限制一次更新不要太激进。}
}
$$

TRPO 用 KL constraint 做这件事，而 PPO 用 clipped probability ratio 以更简单的一阶优化方式实现类似的思想。
