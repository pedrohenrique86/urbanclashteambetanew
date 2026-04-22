import React, { memo } from "react";
import { DrawerFolder } from "../../hooks/useDrawerOrder";
import { DrawerPage, PAGE_MAP, FOLDER_COLORS } from "./MobileDrawerConstants";

export interface DrawerItemProps {
  page: DrawerPage;
  isActive: boolean;
  isEditMode: boolean;
  isDragging: boolean;
  onPress: () => void;
  isBlocked?: boolean;
}

import { LockClosedIcon as LockIcon } from "@heroicons/react/20/solid";

export const DrawerItem = memo(function DrawerItem({ page, isActive, isEditMode, isDragging, onPress, isBlocked }: DrawerItemProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={isBlocked && !isEditMode}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 transition-all duration-300 select-none w-full outline-none ${
        isBlocked ? "opacity-30 cursor-not-allowed" : isActive ? "bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]" : "text-slate-300 hover:text-white hover:bg-white/5"
      } ${isEditMode && !isDragging ? "animate-[drawer-wiggle_0.45s_ease-in-out_infinite]" : ""}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 pointer-events-none relative ${
        isBlocked ? "border-zinc-800 bg-black/40 grayscale" : isActive ? "border-purple-500/60 bg-purple-600/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "border-white/10 bg-white/5"
      }`}>
        {isBlocked ? <LockIcon className="w-8 h-8 text-zinc-700/50" /> : React.cloneElement(page.icon as React.ReactElement, { className: "w-7 h-7" })}
        {isActive && !isBlocked && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />}
      </div>
      <span className={`text-[11px] font-bold leading-tight text-center max-w-[72px] line-clamp-2 transition-colors ${
        isBlocked ? "text-zinc-600 line-through decoration-zinc-700" : isActive ? "text-purple-300" : "text-slate-300"
      }`}>{page.name}</span>
    </button>
  );
});

export const DrawerFolderItem = memo(function DrawerFolderItem({
  folder, isActive, isEditMode, isDragging, onPress,
}: {
  folder: DrawerFolder; isActive: boolean; isEditMode: boolean; isDragging: boolean; onPress: () => void;
}) {
  const previewPages = folder.items.slice(0, 4).map(id => PAGE_MAP.get(id)).filter(Boolean) as DrawerPage[];
  const colors = FOLDER_COLORS[folder.color || 'emerald'] || FOLDER_COLORS.emerald;

  return (
    <button
      type="button"
      onClick={onPress}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 transition-all duration-300 select-none w-full outline-none ${isActive ? "bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]" : "text-slate-300 hover:text-white hover:bg-white/5"} ${isEditMode && !isDragging ? "animate-[drawer-wiggle_0.45s_ease-in-out_infinite]" : ""}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border p-[4px] gap-[3px] pointer-events-none transition-colors duration-500 ${colors.border} ${colors.bg}`}>
        <div className="grid grid-cols-2 gap-[3px] w-full h-full place-items-center">
          {previewPages.slice(0, 4).map((p, i) => (
            <div key={i} className="flex items-center justify-center w-full h-full bg-white/10 rounded-lg scale-90 overflow-hidden">
              {React.cloneElement(p.icon as React.ReactElement, { className: `w-4 h-4 ${colors.icon}` })}
            </div>
          ))}
        </div>
      </div>
      <span className={`text-[11px] font-bold leading-tight text-center max-w-[72px] line-clamp-1 pointer-events-none w-[112%] transition-colors duration-500 ${colors.text}`}>
        {folder.name}
      </span>
    </button>
  );
});
