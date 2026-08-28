import { useEffect, useState } from 'react';

interface Props {
  text: string;
  speed?: number;
}

/**
 * 副标题打字机效果：逐字显示 + 光标闪烁。
 */
export default function TypewriterSubtitle({ text, speed = 110 }: Props) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    if (!text.length) {
      setVisibleText('');
      return;
    }

    let cursor = 0;
    setVisibleText('');
    const timer = window.setInterval(() => {
      cursor += 1;
      setVisibleText(text.slice(0, cursor));
      if (cursor >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return (
    <div className="subtitle-shell">
      <p className="subtitle-text">
        {visibleText}
        <span className="subtitle-cursor animate-blink">|</span>
      </p>
    </div>
  );
}
