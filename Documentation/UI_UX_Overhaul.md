# UI/UX Overhaul Documentation

## Overview
The recent UI/UX overhaul introduces a **consistent modal experience**, **daylight‑zen / dark‑mode aware styling**, and a **clean visual hierarchy** across the application. The changes focus on removing redundant dark‑card wrappers, adding intuitive dismissal mechanisms (Escape key and backdrop click), and ensuring theme‑responsive design for all major components.

---

## Benefits
- **Improved usability** – Users can now close any modal with the `Esc` key or by clicking outside the modal, matching common web‑app expectations.
- **Reduced visual clutter** – Duplicate dark‑card wrappers were removed, giving each modal a single, clean card.
- **Theme consistency** – All components automatically adapt to the current theme (`light` or `dark`) using Tailwind utilities, providing a harmonious look in both daylight‑zen and dark‑mode.
- **Maintainable codebase** – Centralised theme handling and modal dismissal logic simplify future extensions and make the UI easier to reason about.

---

## Component Breakdown
### 1. `src/app/page.tsx`
- **Modal container** now includes:
  - A `useEffect` that listens for the `Escape` key and closes the modal by setting `modalOpen` to `null`.
  - A backdrop `onClick` handler that closes the modal when the user clicks outside the modal content (`e.target === e.currentTarget`).
  - `stopPropagation` on the inner modal to prevent accidental closure.

```tsx
// Escape‑key listener
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") setModalOpen(null);
  };
  window.addEventListener("keydown", handleEsc);
  return () => window.removeEventListener("keydown", handleEsc);
}, []);

// Backdrop click handling
<div
  className="fixed inset-0 bg-black/40 flex items-center justify-center"
  onClick={(e) => {
    if (e.target === e.currentTarget) setModalOpen(null);
  }}
>
  {/* Modal content */}
</div>
```

### 2. `src/components/cbt/CbtTriangleModal.tsx`
- Re‑implemented with **theme‑aware classes** (`bg-slate-900/80` for dark, `bg-white` for light).
- Removed the previous outer dark‑card wrapper; the component now relies on the modal container’s background.
- Added a header with an icon, cleaned‑up form layout, and a result card that respects the current theme.
- History preview section also adapts its background based on `isDark`.

### 3. `src/components/audit/YearMatrix52.tsx`
- Similar theme‑aware refactor: background and border colors adjust to the active theme.
- Introduced an **auto‑calculation banner** that appears when the matrix is in auto‑calc mode.
- Refined the legend and matrix layout for better spacing and readability.
- Eliminated the duplicated dark‑card wrapper to keep a single visual card per modal.

---

## How It Works
1. **Opening a modal** – The `modalOpen` state in `page.tsx` determines which component to render inside the universal modal container.
2. **Theme propagation** – `themeMode` is stored in the global Zustand `useAppStore`. Each component reads this value, calculates `isDark = themeMode === "dark"`, and applies Tailwind utility classes accordingly.
3. **Dismissal** –
   - Pressing `Esc` triggers the `handleEsc` effect, resetting `modalOpen`.
   - Clicking the semi‑transparent backdrop outside the modal content also resets `modalOpen`.
4. **Data flow** – UI components interact with `useAppStore` for actions like `addCbtLog`, `submitWeeklyAudit`, etc., ensuring a single source of truth for application state.

---

## Future Extensions
- **Additional modal components** – Follow the same pattern (theme‑aware styling, no extra dark‑card wrappers) and rely on the existing backdrop and Escape‑key handling.
- **Custom animations** – Add CSS transition classes to the modal container for fade‑in/out effects without altering the dismissal logic.
- **Accessibility** – Implement focus‑trapping inside the modal and ARIA attributes for screen‑reader support.
- **Theme enhancements** – Introduce a “high‑contrast” mode by extending the `themeMode` store and adding corresponding Tailwind classes.

---

*Prepared for hand‑off to Cloud reviewers.*
