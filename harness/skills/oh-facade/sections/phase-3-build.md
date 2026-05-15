## Phase 3: Build

Input: DESIGN.md. Output: production code.

### 3a. Foundations
CSS custom properties for colors, spacing, typography, shadows, radii. Tailwind config extensions mapping tokens to utilities. Theme provider. Component directory structure.

### 3b. Component Library
Implement ALL defined components with every state: default, hover, active, focus-visible, disabled, loading (skeleton), empty (illustration + action), error (inline). Performance: transform/opacity only, systemic z-index scale.

### 3c. Pages
Full interface from components. Responsive collapse at 768px. All viewport states (loading → populated → empty → error). Nav with active states and mobile collapse.

### 3d. Requirements
- Check `package.json` before importing — never assume a library exists
- Framework-appropriate patterns (Server Components, island architecture)
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`
- A11y: focus rings, skip-to-content, alt text, aria labels
- Meta: `<title>`, description, `og:image`, viewport
