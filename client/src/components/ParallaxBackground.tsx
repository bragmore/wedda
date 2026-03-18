export function ParallaxBackground() {
  return (
    <div className="parallax-bg" aria-hidden="true">
      {/* Diamond shapes */}
      <div className="parallax-diamond" style={{ top: '15%', right: '8%', animationDelay: '0s' }} />
      <div className="parallax-diamond" style={{ top: '70%', left: '6%', animationDelay: '10s' }} />

      {/* Wedding rings */}
      <div className="parallax-ring" style={{ top: '25%', left: '10%', animationDelay: '4s' }} />
      <div className="parallax-ring" style={{ top: '60%', right: '12%', animationDelay: '16s' }} />

      {/* Soft hearts */}
      <div className="parallax-heart" style={{ top: '40%', left: '5%', animationDelay: '2s' }} />
      <div className="parallax-heart" style={{ top: '80%', right: '8%', animationDelay: '12s' }} />

      {/* Stars (replacing flowers) */}
      <div className="parallax-star" style={{ top: '10%', left: '25%', animationDelay: '6s' }} />
      <div className="parallax-star" style={{ top: '50%', right: '18%', animationDelay: '14s' }} />
    </div>
  );
}
