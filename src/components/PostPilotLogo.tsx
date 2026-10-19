'use client';

import React from 'react';
import Link from 'next/link';

interface PostPilotLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  variant?: 'vector' | 'image' | 'badge';
  href?: string;
  className?: string;
}

export default function PostPilotLogo({
  size = 38,
  showText = true,
  subtitle = 'AI SOCIAL PUBLISHER',
  variant = 'vector',
  href,
  className = '',
}: PostPilotLogoProps) {
  const content = (
    <div
      className={`postpilot-brand-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size > 40 ? '14px' : '10px',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* Logo Emblem Icon */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.28)}px`,
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {variant === 'image' ? (
          // 3D Glassmorphic Rendered Asset
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand-logo.png"
            alt="PostPilot Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: `${Math.round(size * 0.28)}px`,
            }}
          />
        ) : (
          // Crisp Scalable Vector SVG
          <svg
            viewBox="0 0 100 100"
            width={`${Math.round(size * 0.76)}px`}
            height={`${Math.round(size * 0.76)}px`}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2))' }}
          >
            <defs>
              <linearGradient id="ppWingL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="60%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <linearGradient id="ppWingR" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="60%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="ppSpine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#c7d2fe" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="ppArc" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Social Signal Broadcast Waves */}
            <path
              d="M 38 28 A 28 28 0 0 1 76 66"
              fill="none"
              stroke="url(#ppArc)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M 44 36 A 18 18 0 0 1 68 60"
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Jet Thrust Trail */}
            <line x1="22" y1="72" x2="12" y2="82" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <line x1="32" y1="76" x2="20" y2="88" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

            {/* Supersonic Origami Plane */}
            <polygon points="82,20 22,54 44,64" fill="url(#ppWingL)" />
            <polygon points="44,64 49,76 55,66" fill="#1e1b4b" />
            <polygon points="82,20 44,64 70,78" fill="url(#ppWingR)" />
            <polygon points="82,20 52,60 44,64" fill="url(#ppSpine)" />

            {/* Crisp Ridge Lines */}
            <line x1="82" y1="20" x2="44" y2="64" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <polyline points="22,54 82,20 70,78" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.9" />

            {/* Beacon Star */}
            <circle cx="82" cy="20" r="2.5" fill="#38bdf8" />
          </svg>
        )}
      </div>

      {/* Brand Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: size > 40 ? '1.45rem' : '1.22rem',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #4338ca 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            PostPilot
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: size > 40 ? '0.72rem' : '0.65rem',
                color: '#64748b',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: '1px',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}
