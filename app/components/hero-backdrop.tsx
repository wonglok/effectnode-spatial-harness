/**
 * Layered aurora gradient background. Pure CSS — four slow-drifting radial
 * blobs (tiffany, aqua, lavender, peach) over a pale mint base. Respects
 * `prefers-reduced-motion` (see `index.css`).
 */
export function HeroBackdrop() {
  return (
    <div className="aurora pointer-events-none" aria-hidden>
      <div className="aurora__blob aurora__blob--tiffany" />
      <div className="aurora__blob aurora__blob--aqua" />
      <div className="aurora__blob aurora__blob--lavender" />
      <div className="aurora__blob aurora__blob--peach" />
    </div>
  )
}
