import React from "react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const DEFAULT_MILITARY_CLIP = "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)";

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  className = "w-10 h-10", 
  style, 
  onClick 
}) => {
  const hasMilitaryClip = style?.clipPath || className.includes("military-clip");
  
  const combinedStyle: React.CSSProperties = { 
    clipPath: hasMilitaryClip ? undefined : DEFAULT_MILITARY_CLIP,
    ...style 
  };

  if (src && src.trim() !== "" && !src.includes("dicebear.com")) {
    const extension = src.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    return (
      <picture 
        className={`${className} overflow-hidden block`}
        style={combinedStyle}
        onClick={onClick}
      >
        <source srcSet={src} type={mimeType} />
        <img
          src={src}
          alt={alt || "avatar"}
          className="w-full h-full object-cover bg-black/40 border border-white/10"
          loading="lazy"
          decoding="async"
        />
      </picture>
    );
  }

  return (
    <div 
      className={`${className} flex items-center justify-center bg-zinc-900 border border-white/10 text-zinc-700 relative overflow-hidden transition-colors`}
      style={combinedStyle}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-[85%] h-[85%] opacity-40 translate-y-2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
};
