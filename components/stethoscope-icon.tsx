'use client'

export function StethoscopeIcon() {
  return (
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Medical Plus/Cross Sign */}
        {/* Vertical bar */}
        <rect x="16" y="8" width="8" height="24" rx="4" fill="#555" />
        
        {/* Horizontal bar */}
        <rect x="8" y="16" width="24" height="8" rx="4" fill="#555" />
      </svg>
    </div>
  )
}
