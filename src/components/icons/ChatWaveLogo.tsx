import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function ChatWaveLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 50"
      aria-label="BLAH BLAH logo"
      className={cn("transition-transform duration-300 ease-out group-hover/sidebar:scale-105", props.className)}
      {...props}
    >
      <defs>
        <linearGradient id="logoColorfulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path 
        d="M10 15 C10 5, 15 5, 25 5 L65 5 C75 5, 75 15, 75 25 L75 30 C75 40, 65 40, 55 40 L30 40 L15 50 L20 40 L10 40 C10 40, 10 35, 10 25Z" 
        fill="url(#logoColorfulGradient)" 
        transform="rotate(-12 42.5 22.5)"
      />
       <path 
        d="M30 12 C30 2, 35 2, 45 2 L85 2 C95 2, 95 12, 95 22 L95 27 C95 37, 85 37, 75 37 L50 37 L35 47 L40 37 L30 37 C30 37, 30 32, 30 22Z" 
        stroke="#60a5fa"
        strokeWidth="1.5"
        fill="#eff6ff"
        opacity="0.8"
        transform="translate(15 2) rotate(8 62.5 20.5)"
      />
      <text
        x="105"
        y="35"
        dominantBaseline="middle"
        fontSize="26"
        fill="#1e293b"
        className="font-funky"
      >
        BLAH BLAH
      </text>
    </svg>
  );
}
