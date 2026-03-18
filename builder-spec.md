# Builder.tsx Specification

## File Location
Write to: `/home/user/workspace/wedda/client/src/pages/builder.tsx`

## Overview
Complete rewrite of the wedding package wizard. Must be a single file React component.

## Technology Stack
- React with TypeScript (no explicit React import needed - Vite JSX transform)
- wouter for routing (`useLocation` from "wouter")
- `@tanstack/react-query` for data fetching
- `@/lib/queryClient` for `apiRequest`
- `@/lib/i18n` for `useI18n`
- `@/lib/package-context` for `usePackage`
- `@/lib/user-context` for `useUser`
- shadcn/ui components from `@/components/ui/*`
- Lucide icons from `lucide-react`
- Type imports from `@shared/schema` (Category, Vendor, Product)
- Tailwind CSS v3 classes

## CRITICAL Rules
- Use `apiRequest` from `@/lib/queryClient` for ALL HTTP requests (never raw fetch)
- Use hash-based routing links: `<Link href="/dashboard">`
- NO localStorage/sessionStorage/cookies (sandboxed iframe)
- Add `data-testid` to all interactive elements
- Roboto font is already loaded globally (via CSS)
- All text in both Swedish/English via `lang === "sv" ? "..." : "..."`
- Use the `t()` function for translations where keys exist

## Category Type from API
The API returns categories with a `parentId` field (string | null). Parent categories have `parentId: null`. Child categories have `parentId` pointing to parent slug. Only child categories have products.

Category interface from API response:
```typescript
interface CategoryFromAPI {
  id: number;
  slug: string;
  nameSv: string;
  nameEn: string;
  icon: string;
  parentId: string | null; // null = parent, "plats" etc = child
}
```

## Parent Category Grouping
Parents and their children:
- plats (Plats & Lokal): venues
- klader (Kläder & Accessoarer): dresses, suits, rings
- mat-dryck (Mat & Dryck): catering, cake
- underhallning (Underhållning & Musik): dj, entertainment, sound-lighting
- dekor-blommor (Dekor & Blommor): flowers, decoration
- foto-video (Foto & Video): photography, video
- skonhet (Skönhet): hair-makeup
- planering-ovrigt (Planering & Övrigt): planning, officiant, transport, invitations

## Wizard Steps (7 total, only show 5 in progress indicator)

### Step 1: Contact Info (FIRST STEP)
- Fields: Full name (required), Email (required), Phone (required), Wedding date (optional)
- Clean, centered form design
- Gold accent on focus states
- Must validate before proceeding

### Step 2: Budget & Location (combined)
- Budget presets: 50k, 100k, 200k, 500k, 1M kr + custom input
- Guest count presets: Intimate (<30), Small (30-60), Medium (60-100), Large (100-200), Grand (200+)
- Region selector: All Swedish regions grid

### Step 3: Categories
- Show PARENT categories as main selectable groups
- When a parent is selected, ALL its children are selected
- Can also expand to see individual children and toggle them
- Use the iconMap with icons: Building2, Shirt, UtensilsCrossed, Music, Flower2, Camera, Scissors, ClipboardList (and sub-icons for children)
- At the bottom: link "Visa alla produkter" to see all products manually

### Step 4: Choose Package (NEW - pre-built packages)
- Generate UP TO 5 complete packages based on: budget, guest count, selected categories
- Package generation logic:
  - "Premium" package: pick the most expensive product per selected child category that fits in budget
  - "Standard" package: pick mid-range products
  - "Budget" package: pick cheapest products per category
  - "Romantiskt" / "Modernt" themed packages: curated mix
- Each package shows:
  - Package name + description
  - All included products with images (compact grid)
  - Total price
  - Number of products
  - Which items are "pris på förfrågan"
- User can select ONE package, which populates selectedProducts
- Also show "Handplocka produkter" button at bottom to go to manual selection (step 4b)

### Step 4b: Manual Product Selection (if user chose manual)
- Category tabs (only selected child categories)
- Product grid with cards
- **STICKY PRICE BAR AT TOP** - always visible:
  - Shows: total price, number of selected products, "pris på förfrågan" count
  - Background: primary/5 with border-primary/20
  - Position: sticky top-16 z-40 (below navbar)
  - "Granska paket" button on right side
- Product cards show: image, name, price or POD badge, select/deselect button
- At bottom of each category: "Visa alla produkter" link option

### Step 5: Review & Send
- Summary cards: Budget, Guests, Location
- Products grouped by parent category
- Each product: image thumb, name, price or POD badge, remove button  
- Total price card
- POD warning note
- Budget exceeded warning
- Notes textarea
- "Skicka beställning" button

### Step 6: Registration (only if user not already registered)
- Pre-filled from step 1 contact info!
- Name, email, wedding date
- Submit creates user then submits order

### Step 7: Success
- Checkmark animation
- Order summary
- "Go to portal" button

## Package Generation Algorithm
```
function generatePackages(budget, selectedCategoryIds, allProducts, categories):
  // Get only child category slugs from selected
  childCats = selectedCategoryIds.filter(id => categories.find(c => c.slug === id && c.parentId))
  
  // For each package type:
  // 1. Premium: For each childCat, pick the product with highest price_from that's within (budget / childCats.length)
  // 2. Standard: For each childCat, pick product closest to median price
  // 3. Budget-friendly: For each childCat, pick cheapest product with exact price
  // 4. If budget > 200k, add "Romantiskt" themed package
  // 5. If budget > 100k, add "Modernt" themed package
  
  Return max 5 packages, each with:
  { name, description, products: Product[], totalPrice, podCount }
```

## Animations
- Steps fade in/out with opacity and translateY transitions
- Cards have hover:scale-[1.02] and shadow transitions
- Step indicator pills animate between states
- Sticky price bar has smooth slide-in animation
- Product selection has a brief scale bounce
- Use CSS transitions and Tailwind classes only (no animation library needed)

## UI Style
- Warm gold (#C5975B) as primary accent
- Clean, minimal, lots of whitespace
- Rounded corners (rounded-xl on cards, rounded-full on pills)
- Font: Roboto (already loaded)
- Max width: 2xl for forms, 5xl for product grids
- Mobile-first responsive design
