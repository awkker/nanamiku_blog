import { useEffect, useState } from 'react';

// 提前创建格式化器，避免每秒都重新 new 一次 Intl 对象。
const formatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hour12: false,
});

/**
 * 顶栏时钟。SSR 阶段渲染空字符串，挂载后立即填充，避免 hydration mismatch。
 */
export default function SystemClock() {
  const [clockText, setClockText] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setClockText(formatter.format(new Date()));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <span className="text-[#39c5bb]/90 text-[11px] tabular-nums tracking-wide dark:text-[#c084fc]/90">{clockText}</span>;
}
