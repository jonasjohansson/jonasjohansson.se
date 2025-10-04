# Project Structure

## Overview

This project uses a modular architecture for both CSS and JavaScript, making it easy to maintain and update.

## CSS Modules (`assets/css/`)

### Main Entry Point

- `style.css` - Imports all CSS modules

### CSS Modules (`modules/`)

- `variables.css` - CSS variables (colors, spacing, typography, etc.)
- `base.css` - Base styles, resets, and utilities
- `header.css` - Header and island component
- `about.css` - About curtain section
- `filter.css` - Filter dropdown component
- `strips.css` - Strips layout and strip components
- `project-detail.css` - Project detail view

### Benefits

- Easy to find and update specific components
- CSS variables for consistent theming
- Clear separation of concerns
- Smaller, more manageable files

## JavaScript Modules (`assets/js/`)

### Main Entry Point

- `main.js` - Application entry point

### Module Structure

#### `/config/`

Configuration files and constants

- `constants.js` - Application constants (animation settings, thresholds, etc.)
- `projects.js` - Project data and metadata

#### `/utils/`

Reusable utility functions

- `helpers.js` - Common utilities (shuffle, clamp, debounce, throttle)

#### `/services/`

Business logic and services

- `audio.js` - Audio/sound service for interactive sounds

#### `/components/`

UI component modules

- `router.js` - SPA routing
- `strips.js` - Strips interface logic
- `curtain.js` - About curtain drag functionality

### Benefits

- Clear separation of concerns
- Easy to locate and update functionality
- Centralized configuration
- Reusable utilities
- Better code organization

## Asset Organization

```
assets/
├── css/
│   ├── modules/           # CSS component modules
│   ├── fonts.css          # Font declarations
│   └── style.css          # Main CSS entry point
├── fonts/                 # Font files (.ttf, .woff, .woff2)
├── images/                # Optimized project images
├── images-backup/         # Original images
└── js/
    ├── config/            # Configuration
    ├── utils/             # Utility functions
    ├── services/          # Business logic
    ├── components/        # UI components (strips, router, curtain)
    └── main.js            # JS entry point
```

## Key Features

### Configuration Management

All magic numbers and constants are centralized in `config/constants.js`:

- Animation settings
- Layout thresholds
- Observer margins
- Timing values

### Modular CSS

Each CSS module handles a specific concern:

- Easy to debug
- Simple to extend
- Clear dependencies
- Better performance (browser can parse in parallel)

### Modular JavaScript

Clean module structure following best practices:

- Single responsibility
- Clear imports/exports
- No circular dependencies
- Easy to test

## Making Changes

### To update colors/spacing:

Edit `assets/css/modules/variables.css`

### To update configuration:

Edit `assets/js/config/constants.js`

### To update a specific component:

Find the relevant module in `assets/css/modules/` or `assets/js/`

### To add a new feature:

1. Create new module file in appropriate directory
2. Import it in the main entry point
3. Update this documentation

## Performance Optimizations

1. **CSS**: Modular imports allow browser to parse in parallel
2. **JS**: ES6 modules with tree-shaking support
3. **Images**: Lazy loading with Intersection Observer
4. **Animation**: Idle detection to pause unnecessary calculations
5. **Configuration**: Constants prevent magic numbers and enable easy optimization

## Browser Support

- Modern ES6+ browsers
- CSS Grid and Flexbox
- Intersection Observer API
- ES6 Modules
- CSS Variables
