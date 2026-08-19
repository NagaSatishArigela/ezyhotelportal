import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const PALETTES = [
  ['#F05A00', '#C74800', '#FFC107'],
  ['#0F172A', '#475569', '#94A3B8'],
  ['#14B8A6', '#0F766E', '#5EEAD4'],
  ['#7C3AED', '#4C1D95', '#C4B5FD'],
  ['#DC2626', '#991B1B', '#FCA5A5'],
  ['#0891B2', '#155E75', '#A5F3FC'],
  ['#65A30D', '#365314', '#BEF264'],
  ['#D97706', '#92400E', '#FCD34D'],
]

type Scene = 'suite' | 'lobby' | 'pool' | 'rooftop' | 'bath' | 'window'
const SCENES: Scene[] = ['suite', 'lobby', 'pool', 'rooftop', 'bath', 'window']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function SceneSVG({ scene, palette }: { scene: Scene; palette: string[] }) {
  const [, b, c] = palette
  switch (scene) {
    case 'suite':
      return (
        <>
          <rect width="100%" height="100%" fill={`url(#g)`} />
          <rect x="10%" y="50%" width="80%" height="35%" rx="4" fill={b} opacity=".7" />
          <rect x="20%" y="35%" width="25%" height="20%" rx="3" fill={c} opacity=".5" />
          <rect x="55%" y="35%" width="25%" height="20%" rx="3" fill={c} opacity=".5" />
          <circle cx="50%" cy="30%" r="6%" fill={c} opacity=".4" />
        </>
      )
    case 'lobby':
      return (
        <>
          <rect width="100%" height="100%" fill={`url(#g)`} />
          <rect x="15%" y="20%" width="8%" height="70%" fill={b} opacity=".6" />
          <rect x="77%" y="20%" width="8%" height="70%" fill={b} opacity=".6" />
          <rect x="30%" y="55%" width="40%" height="30%" rx="3" fill={c} opacity=".5" />
          <circle cx="50%" cy="45%" r="8%" fill={c} opacity=".3" />
        </>
      )
    case 'pool':
      return (
        <>
          <rect width="100%" height="100%" fill={`url(#g)`} />
          {[0,1,2,3].map(i => {
            const y = 82 + i * 12
            return (
            <path key={i} d={`M0,${y} Q50,${y - 8} 100,${y} T200,${y}`}
              fill="none" stroke={c} strokeWidth="2" opacity=".5" />
            )
          })}
          <ellipse cx="50%" cy="40%" rx="15%" ry="8%" fill={c} opacity=".4" />
        </>
      )
    case 'rooftop':
      return (
        <>
          <rect width="100%" height="100%" fill={`url(#g)`} />
          <rect x="5%" y="60%" width="20%" height="35%" fill={b} opacity=".6" />
          <rect x="30%" y="50%" width="15%" height="45%" fill={b} opacity=".5" />
          <rect x="55%" y="65%" width="18%" height="30%" fill={b} opacity=".6" />
          <rect x="78%" y="55%" width="17%" height="40%" fill={b} opacity=".5" />
          <circle cx="80%" cy="20%" r="10%" fill={c} opacity=".5" />
        </>
      )
    case 'bath':
      return (
        <>
          <rect width="100%" height="100%" fill={`url(#g)`} />
          <rect x="20%" y="55%" width="60%" height="25%" rx="30" fill={c} opacity=".6" />
          <rect x="38%" y="25%" width="24%" height="30%" rx="3" fill={b} opacity=".4" />
          <circle cx="70%" cy="35%" r="10%" fill={c} opacity=".3" />
        </>
      )
    case 'window':
      return (
        <>
          <rect width="100%" height="100%" fill={`url(#g)`} />
          <rect x="20%" y="15%" width="60%" height="65%" rx="4" fill={b} opacity=".25" stroke={c} strokeWidth="2" />
          <line x1="50%" y1="15%" x2="50%" y2="80%" stroke={c} strokeWidth="1.5" opacity=".5" />
          <line x1="20%" y1="47%" x2="80%" y2="47%" stroke={c} strokeWidth="1.5" opacity=".5" />
        </>
      )
  }
}

interface PhotoTileProps {
  seed?: string
  className?: string
  alt?: string
  src?: string
}

export function PhotoTile({ seed = 'default', className, alt = '', src }: PhotoTileProps) {
  const { palette, scene, primaryColor } = useMemo(() => {
    const h = hashStr(seed)
    const pal = PALETTES[h % PALETTES.length]
    return {
      palette: pal,
      scene: SCENES[(h >> 3) % SCENES.length],
      primaryColor: pal[0],
    }
  }, [seed])

  if (src) {
    return <img src={src} alt={alt} className={cn('object-cover', className)} loading="lazy" />
  }

  return (
    <svg
      className={cn('w-full h-full', className)}
      viewBox="0 0 200 150"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={!alt}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={palette[1]} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <SceneSVG scene={scene} palette={palette} />
      {/* Soft overlay for depth */}
      <rect width="100%" height="100%" fill="rgba(15,23,42,0.12)" />
    </svg>
  )
}
