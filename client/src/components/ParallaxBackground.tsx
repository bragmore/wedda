export function ParallaxBackground() {
  return (
    <div className="parallax-bg" aria-hidden="true">
      {/* Wedding cakes */}
      <div className="parallax-cake" style={{ top: '8%', left: '4%', animationDelay: '0s' }} />
      <div className="parallax-cake" style={{ top: '65%', right: '5%', animationDelay: '8s' }} />

      {/* Diamonds */}
      <div className="parallax-diamond" style={{ top: '22%', right: '7%', animationDelay: '3s' }} />
      <div className="parallax-diamond" style={{ top: '80%', left: '8%', animationDelay: '12s' }} />

      {/* Rings (wedding rings) */}
      <div className="parallax-ring" style={{ top: '15%', right: '20%', animationDelay: '5s' }} />
      <div className="parallax-ring" style={{ top: '55%', left: '12%', animationDelay: '14s' }} />

      {/* Hearts */}
      <div className="parallax-heart" style={{ top: '35%', left: '6%', animationDelay: '2s' }} />
      <div className="parallax-heart" style={{ top: '75%', right: '10%', animationDelay: '10s' }} />

      {/* Flowers */}
      <div className="parallax-flower" style={{ top: '12%', left: '30%', animationDelay: '1s' }} />
      <div className="parallax-flower" style={{ top: '45%', right: '15%', animationDelay: '7s' }} />
      <div className="parallax-flower" style={{ top: '70%', left: '25%', animationDelay: '4s' }} />
      <div className="parallax-flower" style={{ bottom: '20%', right: '25%', animationDelay: '9s' }} />

      {/* Bouquets */}
      <div className="parallax-bouquet" style={{ top: '40%', left: '2%', animationDelay: '6s' }} />
      <div className="parallax-bouquet" style={{ bottom: '10%', right: '3%', animationDelay: '2s' }} />
    </div>
  );
}
