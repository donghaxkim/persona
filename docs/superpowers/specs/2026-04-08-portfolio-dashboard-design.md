# Portfolio Dashboard — Design Spec

## Overview

An aggregate analytics dashboard that appears in the right panel when no influencer is selected. It serves as a morning check-in view — answering "how's my roster doing?" at a glance — with a clean, editorial layout inspired by cosmos.so and wealthsimple.

## User Flow

1. User logs in or deselects all influencers
2. Right panel shows the portfolio dashboard (replaces current "Select an influencer" empty state)
3. User scans hero metric + secondary stats for portfolio health
4. User reviews per-creator table, sorts by different metrics
5. User clicks a creator row → selects that influencer and navigates to their per-creator analytics view

## Layout (top to bottom)

### 1. Header Row

- Left: "Overview" title (text-lg font-medium, matching existing heading style)
- Right: Period selector pills — 7d / 30d / 90d
  - Uses `glass-card` styling for each pill
  - Active pill gets `bg-foreground text-background` treatment (matches existing day-circle pattern in analytics-view)
  - Default selection: 30d

### 2. Hero Block

- **Primary metric:** Total views across all creators, large typography (text-4xl font-semibold), centered
- **Period label:** "Total views" subtitle below the number (text-xs text-muted-foreground)
- **Secondary metrics row:** Three stats below, evenly spaced, centered
  - Total Reach — sum across all creators
  - Avg Engagement — weighted average (total interactions / total reach * 100)
  - Total Interactions — sum across all creators
  - Each: value (text-xl font-semibold) + label (text-2xs uppercase tracking-widest text-muted-foreground)
- Container: `glass` card with rounded-xl, generous padding (px-6 py-8)

### 3. Creator Table

**Table header row:**
- Left: "Creators" label (text-sm font-medium)
- Right: Sort dropdown/segmented control

**Sort options:** Views (default), Interactions, Engagement, Name (A-Z), Newest

**Each row contains:**
- Avatar circle (w-8 h-8, gradient background, initial letter) + Name (text-sm) + Niche (text-xs text-muted-foreground) — left-aligned
- Views — right-aligned column
- Interactions — right-aligned column  
- Engagement % — right-aligned column
- Row styling: `hover:bg-accent/40 transition-colors duration-150 cursor-pointer rounded-lg px-4 py-3`
- Clicking a row: calls `setActiveInfluencer(id)` then `setActiveView("analytics")`

**Empty state (0 creators):**
- Hero metrics display "0"
- Table area shows: "Add your first creator to see analytics" (text-sm text-muted-foreground, centered)

## Data

All data is mock, using the existing `seededRandom(influencerId)` function. For each influencer, the same calculations from `analytics-view.tsx` are reused to generate reach, impressions, engagement, interactions, and views.

**Period multiplier:**
- 7d: base values * 0.25
- 30d: base values * 1.0 (matches existing analytics-view)
- 90d: base values * 3.0

**Aggregation:**
- Total views: sum of per-influencer total views
- Total reach: sum of per-influencer reach
- Total interactions: sum of per-influencer interactions
- Avg engagement: (total interactions / total reach) * 100, displayed as percentage

## Visual Design

- Max width: `max-w-[600px] mx-auto` (matches all existing content)
- Uses existing glass system — `glass` for the hero card, no new CSS
- Warm neutral palette — no new colors introduced
- Generous whitespace between sections (mb-6 / mb-8 spacing)
- `animate-fade-in` on mount for the whole dashboard
- Numbers formatted with K/M suffixes (e.g., "124.8K", "1.2M")

## Component Structure

```
src/components/workspace/portfolio-dashboard.tsx
```

Single file containing:
- `PortfolioDashboard` — main component
- `PeriodSelector` — pill toggle (7d/30d/90d)
- `CreatorTable` — sortable list
- `computeInfluencerMetrics()` — helper reusing seededRandom logic

## Integration

- `workspace-router.tsx`: When `!activeInfluencerId`, render `<PortfolioDashboard />` instead of `<EmptyState />`
- `empty-state.tsx`: No changes needed (still exists as fallback, but won't be rendered when dashboard is active)
- Store: No changes needed — uses existing `influencers` array and `setActiveInfluencer` / `setActiveView` actions

## Scope Exclusions

- No real API data — mock only via seededRandom
- No charts or sparklines — just numbers and the table
- No "needs attention" intelligence or alerts
- No export or sharing features
- Dashboard is not a new `WorkspaceView` — it renders in place of the empty state
