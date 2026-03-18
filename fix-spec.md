# Wedda Fix Specification

## Fix 1: Video Hero Seamless Loop (home.tsx)
The current VideoHero component has a flash/still-frame between video transitions because it only renders one video at a time with opacity transitions. The fix: use a dual-layer approach where BOTH the current and next video are always mounted and playing, with crossfade between them.

### New approach:
- Keep two `<video>` elements always mounted (current + next)
- Preload and start playing the next video before crossfade begins
- Use absolute positioning with z-index to layer them
- The "next" video starts playing silently underneath
- When transition triggers, fade current out while next is already showing
- After transition, swap roles

### Key code pattern:
```tsx
function VideoHero({ children }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentRef = useRef<HTMLVideoElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);

  // Preload next video
  useEffect(() => {
    if (nextRef.current) {
      nextRef.current.src = HERO_VIDEOS[nextIdx];
      nextRef.current.load();
      nextRef.current.play().catch(() => {});
    }
  }, [nextIdx]);

  // When current video nears end, start crossfade
  useEffect(() => {
    const video = currentRef.current;
    if (!video) return;
    
    video.src = HERO_VIDEOS[currentIdx];
    video.load();
    video.play().catch(() => {});

    const onTimeUpdate = () => {
      if (video.duration && video.currentTime > video.duration - 1.5 && !isTransitioning) {
        startTransition();
      }
    };
    
    // Also fallback timer
    const timer = setTimeout(() => {
      if (!isTransitioning) startTransition();
    }, 8000);

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      clearTimeout(timer);
    };
  }, [currentIdx]);

  const startTransition = () => {
    setIsTransitioning(true);
    // After fade duration, swap
    setTimeout(() => {
      setCurrentIdx(nextIdx);
      setNextIdx((nextIdx + 1) % HERO_VIDEOS.length);
      setIsTransitioning(false);
    }, 1200);
  };

  return (
    <section className="relative h-screen ...">
      {/* Next video (underneath, always playing) */}
      <video ref={nextRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 1 }} />
      
      {/* Current video (on top, fades out during transition) */}
      <video ref={currentRef} muted playsInline 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
        style={{ zIndex: 2 }} 
      />
      
      {/* Overlay & content at z-3+ */}
    </section>
  );
}
```

## Fix 2: Remove "Visa alla produkter" from Step 3 (builder.tsx)
Delete lines 990-1000 (the "View all products" link) from the categories step.

## Fix 3: Package Logic - Budget-Based with "Utöka din budget" Section (builder.tsx)

### New `generatePackages` function:
The function should return TWO arrays: `withinBudget` and `overBudget`.

1. Generate many candidate packages (at least 8-10 variations)
2. Split into: packages where totalPrice <= budget (within) and totalPrice > budget (over)
3. `withinBudget`: pick the best 5 that are <= budget. Vary price spread.
4. `overBudget`: pick up to 5 that are slightly over budget (closest to budget first, max 50% over)

### Rendering in Step 4:
```
"Inom din budget" section header
  - 5 packages all <= budget

"Om du kan utöka din budget rekommenderar vi" section header  
  - Additional packages that are slightly over budget
```

Always show exactly 5 in "within budget". The "over budget" section only shows if there are packages that exceed budget.
