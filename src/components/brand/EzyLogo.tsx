import type { CSSProperties } from 'react'

// Official EzyHotels.com pin mark (pin + clock + bed), a transparent PNG cropped
// from the brand logo, served from /public. Intrinsic ratio 428×628.
const MARK_W = 428
const MARK_H = 628

/**
 * EzyHotels.com brand mark. `size` is the rendered WIDTH; height follows the
 * mark's aspect ratio.
 */
export function EzyMark({
  size = 30,
  dark = false,
  className,
  style,
}: {
  size?: number
  dark?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <img
      src={dark ? '/ezyhotels-mark-dark.png' : '/ezyhotels-mark.png'}
      alt="EzyHotels.com"
      width={size}
      height={Math.round((size * MARK_H) / MARK_W)}
      className={className}
      style={style}
    />
  )
}

/** "EzyHotels.com" wordmark: Ezy orange, Hotels navy, .com orange. */
export function EzyWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-primary-600">Ezy</span>
      <span className="text-navy-900">Hotels</span>
      <span className="text-primary-600">.com</span>
    </span>
  )
}
