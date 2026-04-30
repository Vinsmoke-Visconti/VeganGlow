# VeganGlow Design System (DESIGN.md)

Botanical. Premium. Pure. Modern.

## 1. Visual Identity
- **Aesthetic**: Botanical glassmorphism with a "clean-first" approach.
- **Tone**: Professional, trustworthy, yet organic and warm.
- **Inspiration**: A blend of Apple's premium whitespace and high-end botanical spa aesthetics.

## 2. Color Palette (Botanical Theme)
- **Primary (Deep Botanical)**: `hsl(158, 45%, 32%)` - Used for deep accents and main branding.
- **Primary Light (Sage)**: `hsl(158, 40%, 45%)` - Used for secondary highlights.
- **Background (Beige Linen)**: `hsl(51, 87%, 94%)` - A warm, off-white foundation.
- **Secondary (Terracotta)**: `hsl(30, 67%, 44%)` - Used for warm highlights (sunset vibes).

## 3. Typography
- **Headings**: Lora (Serif) - Elegant, classical, and trustworthy.
- **Body**: Lora / SF Pro - Clean and highly readable.
- **Hierarchy**: Use massive, bold headings for heroes, balanced with generous leading.

## 4. Design Patterns
- **Glassmorphism**: High blur (`20px`), subtle borders (`rgba(255,255,255,0.4)`), and multi-layered shadows.
- **Buttons**:
  - **Primary**: Pill-shaped, deep botanical green, with spring-based hover animations.
  - **Secondary**: Ghost/Bordered pill with subtle lifts.
- **Gradients**: Use "same-tone" botanical gradients (e.g., Deep Green to Sage) for a lush, organic feel.
- **Micro-animations**: Use `framer-motion` for spring-based entrance animations and interactive states.

## 5. Component Guidelines
- **Navbar**: Floating pill layout or transparent-to-glass transition on scroll.
- **Cards**: Soft shadows, rounded corners (`radius-3xl`), and image-zoom on hover.
- **Sections**: Use botanical gradients and generous vertical spacing (`var(--space-20)`).
- **Icons**: Lucide React with thin/medium stroke weights for a refined look.
