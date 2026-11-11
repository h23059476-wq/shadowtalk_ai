import React from 'react';

interface ChatbotLogoProps {
  size?: number;
  className?: string;
}

const ChatbotLogo = ({ size = 24, className = "" }: ChatbotLogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan 500 */}
          <stop offset="50%" stopColor="#a855f7" /> {/* Purple 500 */}
          <stop offset="100%" stopColor="#3b82f6" /> {/* Blue 500 */}
        </linearGradient>
        <linearGradient id="obsidianGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" /> {/* Slate 800 */}
          <stop offset="50%" stopColor="#0f172a" /> {/* Slate 900 */}
          <stop offset="100%" stopColor="#020617" /> {/* Slate 950 */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path
        d="M50 5 L58 42 L95 50 L58 58 L50 95 L42 58 L5 50 L42 42 Z"
        fill="url(#obsidianGradient)"
        stroke="url(#coreGradient)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M50 15 L55 45 L85 50 L55 55 L50 85 L45 55 L15 50 L45 45 Z"
        fill="url(#coreGradient)"
        filter="url(#glow)"
        opacity="0.8"
      />
      <path
        d="M50 35 L52 48 L65 50 L52 52 L50 65 L48 52 L35 50 L48 48 Z"
        fill="#ffffff"
        opacity="0.9"
        filter="url(#glow)"
      />
    </svg>
  );
};

export default ChatbotLogo;
