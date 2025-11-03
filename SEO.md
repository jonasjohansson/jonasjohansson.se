# SEO Guide for jonasjohansson.se

This document provides SEO tips, validation tools, and information about the current SEO implementation.

## Current SEO Implementation

### Meta Tags

- ✅ Basic meta tags (title, description, keywords)
- ✅ Open Graph tags for Facebook/social sharing
- ✅ Twitter Card tags
- ✅ Robots meta tags
- ✅ Author and copyright information

### Structured Data (JSON-LD)

- ✅ Person schema with contact, location, affiliations
- ✅ WebSite schema for sitelinks
- ✅ CreativeWork schema for project pages
- ✅ Social profiles and organizations linked

### Images

- ✅ Preload for LCP (Largest Contentful Paint) optimization
- ✅ Responsive images with WebP format
- ✅ Proper alt tags
- ✅ Open Graph images for social sharing

### Performance

- ✅ Font preloading
- ✅ Image lazy loading
- ✅ Optimized image quality (90% for better quality)

## Preview Your SEO Settings

### Google Search Preview

- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Google Search Console**: https://search.google.com/search-console (requires setup)
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly

### Social Media Previews

#### Facebook / Open Graph

- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
  - Enter your URL to see how it appears when shared on Facebook
  - Shows Open Graph tags and allows you to refresh the cache

#### Twitter / X

- **Twitter Card Validator**: https://cards-dev.twitter.com/validator (deprecated, use X's tools)
- **X Card Validator**: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
  - Check how your site appears when shared on Twitter/X

#### LinkedIn

- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
  - See how your page appears when shared on LinkedIn

#### Slack

- **Slack Link Preview**: Share your URL in Slack to see the preview
- Slack uses Open Graph tags similar to Facebook

### General SEO Validators

1. **Open Graph Validator**

   - https://www.opengraph.xyz/
   - Preview how your site appears across all social platforms

2. **Meta Tags Validator**

   - https://metatags.io/
   - Comprehensive meta tag checker and preview

3. **SEO Site Checkup**

   - https://seositecheckup.com/
   - Free SEO audit tool

4. **PageSpeed Insights**

   - https://pagespeed.web.dev/
   - Google's official tool for performance and SEO

5. **Lighthouse** (Chrome DevTools)

   - Built into Chrome DevTools (F12 → Lighthouse tab)
   - Provides SEO score and recommendations

6. **Structured Data Testing**
   - https://validator.schema.org/
   - Test structured data (JSON-LD, Microdata, RDFa)

### Image Optimization Validation

- **Google PageSpeed Insights**: https://pagespeed.web.dev/
- **WebPageTest**: https://www.webpagetest.org/
- Check LCP (Largest Contentful Paint) in Lighthouse

## SEO Best Practices

### Title Tags

- ✅ Keep titles under 60 characters
- ✅ Include primary keyword
- ✅ Make it unique per page
- ✅ Current format: "Jonas Johansson" or "{{ project.title }}"

### Meta Descriptions

- ✅ Keep under 160 characters
- ✅ Include call-to-action when appropriate
- ✅ Make it unique per page
- ✅ Current: Uses site description or project description

### Open Graph Tags

- ✅ `og:title` - Same as or derived from page title
- ✅ `og:description` - Compelling description for sharing
- ✅ `og:image` - High-quality image (minimum 1200x630px recommended)
- ✅ `og:url` - Canonical URL
- ✅ `og:type` - "website" for homepage, "article" for project pages
- ✅ `og:locale` - Language/locale (currently "en_US")

### Twitter Cards

- ✅ `twitter:card` - Use "summary_large_image" for better visual impact
- ✅ `twitter:title` - Same as og:title
- ✅ `twitter:description` - Same as og:description
- ✅ `twitter:image` - Same as og:image (minimum 1200x630px)

### Image Best Practices

- ✅ Use high-quality images for social sharing (1200x630px minimum)
- ✅ Optimize file size (use WebP format)
- ✅ Include descriptive alt text
- ✅ Use absolute URLs for images
- ✅ Preload critical images (LCP images)

### URL Structure

- ✅ Clean, descriptive URLs
- ✅ Current structure: `/work/{project-slug}/`
- ✅ Use hyphens, not underscores
- ✅ Keep URLs short and relevant

### Performance (affects SEO)

- ✅ Fast page load times
- ✅ Optimized images (currently quality 90)
- ✅ Lazy loading for below-fold images
- ✅ Font preloading for faster rendering
- ✅ Minimized JavaScript and CSS

### Mobile Optimization

- ✅ Responsive design
- ✅ Mobile viewport meta tag
- ✅ Touch-friendly interface
- ✅ Fast mobile load times

## Structured Data (✅ Implemented)

The site now includes comprehensive JSON-LD structured data:

### Person Schema

- Name, job title, description
- Contact information (email)
- Location (address, country, region, city)
- Social profiles (Twitter, Instagram)
- Affiliations (worksFor: Visualia, memberOf: NAVA, Svartljus)
- Educational background (alumniOf: Beckmans, Hyper Island)
- Skills/interests (knowsAbout tags)

### WebSite Schema

- Site name and description
- Author information
- SearchAction for Google sitelinks search box

### CreativeWork Schema (Project Pages)

- Project title and description
- Creator information
- Publication date
- Keywords/tags

### Testing Your Structured Data

1. **Google Rich Results Test**: https://search.google.com/test/rich-results

   - Paste your URL to see how Google interprets your structured data
   - Shows Person, WebSite, and CreativeWork schemas

2. **Schema.org Validator**: https://validator.schema.org/

   - Validates JSON-LD syntax and structure
   - Shows warnings/errors

3. **Google Search Console**: https://search.google.com/search-console
   - Monitor how Google indexes your structured data
   - See search appearance features

### Adding Opening Hours / Maps Location

To add opening hours or map location for a studio/workspace, you can add a `LocalBusiness` or `Organization` schema. Edit `_includes/components/metadata.njk` and add this after the existing schemas:

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Jonas Johansson Studio",
  "description": "Artist studio and workspace",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Your street address",
    "addressLocality": "Stockholm",
    "addressRegion": "Stockholm",
    "postalCode": "12345",
    "addressCountry": "SE"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "59.3293",
    "longitude": "18.0686"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "telephone": "+46-XXX-XXX-XXXX",
  "url": "https://jonasjohansson.se"
}
```

**To find coordinates for a location:**

- Use Google Maps: Right-click on location → "What's here?" → Coordinates appear
- Or use: https://www.google.com/maps and search for your address

**Note:** Opening hours are typically for businesses with physical locations. For an artist/educator, the Person schema with address information is usually sufficient for Google Knowledge Panel.

### Google Knowledge Panel

The Person schema helps Google create a Knowledge Panel when people search for your name. This panel can show:

- **Profile image** (from `og:image`)
- **Job title and description**
- **Contact information** (email)
- **Location** (from address field)
- **Social profiles** (from `sameAs`)
- **Top links** (from WebSite schema + sitelinks)
- **Affiliations** (organizations you work with or are member of)
- **Education** (from `alumniOf`)

**To improve Knowledge Panel:**

1. Create/claim your Google Knowledge Panel: https://support.google.com/knowledgepanel/answer/9163198
2. Ensure consistent name across all platforms
3. Keep social profiles updated
4. Use the same profile image across platforms
5. Add Wikipedia/Wikidata entry (if notable enough)

### Sitemap

- Ensure `sitemap.xml` is up to date
- Submit to Google Search Console

### Robots.txt

- Ensure `robots.txt` is properly configured
- Current location: `/robots.txt`

## Testing Checklist

Before launching or after changes:

- [ ] Test Open Graph tags with Facebook Debugger
- [ ] Test Twitter Cards with Twitter/X validator
- [ ] Check mobile-friendliness with Google's tool
- [ ] Run Lighthouse audit (aim for 90+ SEO score)
- [ ] Validate all meta tags with metatags.io
- [ ] **Test structured data with Google Rich Results Test**
- [ ] **Validate JSON-LD with Schema.org Validator**
- [ ] Check page load speed (aim for under 3 seconds)
- [ ] Verify images load correctly on all devices
- [ ] Test social sharing on actual platforms
- [ ] Check for broken links
- [ ] Validate HTML (W3C validator)
- [ ] **Check Google Search Console for structured data indexing**

## Quick Links for Testing

### Your Site URLs to Test

- Homepage: `https://jonasjohansson.se/`
- Project example: `https://jonasjohansson.se/work/{project-slug}/`

### Tools

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Meta Tags Preview**: https://metatags.io/
3. **Open Graph Validator**: https://www.opengraph.xyz/
4. **PageSpeed Insights**: https://pagespeed.web.dev/
5. **Google Rich Results Test**: https://search.google.com/test/rich-results
6. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

## Additional Resources

- **Google Search Central**: https://developers.google.com/search/docs
- **Open Graph Protocol**: https://ogp.me/
- **Twitter Cards Documentation**: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
- **Schema.org**: https://schema.org/ (for structured data)
- **MDN Web Docs - Meta Tags**: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta

## Notes

- Images are processed with quality 90 to balance file size and visual quality
- Strip images use the same source as project hero images for consistency
- All images use absolute URLs starting with `/` to work correctly on all pages
- Preload tags are used for critical LCP images to improve page speed scores
