import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number | string;
  className?: string;
}

/** 数值平滑过渡动画 */
export default function AnimatedNumber({ value, className = '' }: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === '--' || value === prev.current) return;
    const from = typeof prev.current === 'number' ? prev.current : Number(prev.current);
    const to = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const steps = 12;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const v = Math.round(from + ((to - from) * step) / steps);
      setDisplay(v);
      if (step >= steps) {
        clearInterval(timer);
        prev.current = value;
      }
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{display}</span>;
}
