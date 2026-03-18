export function ParallaxBackground() {
  return (
    <div className="parallax-bg" aria-hidden="true">
      {/* Wedding cakes */}
      <div className="parallax-cake" style={{ top: '8%', left: '4%', animationDelay: '0s' }} />
      <div className="parallax-cake" style={{ top: '65%', right: '5%', animationDelay: '12s' }} />

      {/* Diamonds */}
      <div className="parallax-diamond" style={{ top: '22%', right: '7%', animationDelay: '4s' }} />
      <div className="parallax-diamond" style={{ top: '80%', left: '8%', animationDelay: '16s' }} />

      {/* Rings */}
      <div className="parallax-ring" style={{ top: '15%', right: '20%', animationDelay: '8s' }} />
      <div className="parallax-ring" style={{ top: '55%', left: '12%', animationDelay: '20s' }} />

      {/* Bouquets */}
      <div className="parallax-bouquet" style={{ top: '40%', left: '2%', animationDelay: '6s' }} />
      <div className="parallax-bouquet" style={{ bottom: '15%', right: '3%', animationDelay: '14s' }} />
    </div>
  );
}
