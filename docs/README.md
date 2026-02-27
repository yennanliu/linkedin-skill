# LinkedIn Auto-Apply GitHub Pages

This directory contains the GitHub Pages website for the LinkedIn Auto-Apply skill.

## Files

- `index.html` - Main page with LinkedIn-inspired design
- `styles.css` - LinkedIn design system styles
- `script.js` - Interactive features and animations
- `.nojekyll` - Disables Jekyll processing

## Design

The site uses LinkedIn's official design language:
- **Primary Blue**: #0A66C2
- **Hover Blue**: #004182
- **Background**: #F3F2EF
- **Typography**: Inter font family

## Deployment

The site is automatically deployed via GitHub Actions when changes are pushed to the `main` branch.

Workflow: `.github/workflows/deploy.yml`

## Local Development

To preview locally:

```bash
# Simple HTTP server
python3 -m http.server 8000

# Or with Node.js
npx serve .
```

Then open: http://localhost:8000

## Live Site

View the live site at: https://yennanliu.github.io/linkedin-skill/
