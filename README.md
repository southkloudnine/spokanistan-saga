# The Spokanistan Saga — starter site

A deliberately simple static site: plain HTML, CSS and JavaScript. No framework, no database, no build step.

## Open it locally

Double-click `index.html` or drag it into Safari/Chrome.

## Add your photos

Put JPG files inside `images/` using these names:

- `hero.jpg`
- `next-ride.jpg`
- `2026-ride-1.jpg`
- `2026-ride-2.jpg`

The site automatically uses them if they exist. If they do not, the dark placeholders remain visible.

For any AI-generated motorcycle imagery, the intended visual direction is **supersports plus street naked / hyper naked motorcycles**, not cruisers or ADV bikes.

## Change the next ride countdown

Open `index.html` and find:

```html
<div class="countdown" data-date="2027-06-15T08:00:00-07:00">
```

Replace the date/time once the next ride is booked.

## Add another ride

1. Copy one of the files in `rides/`.
2. Rename it, e.g. `2027-ride-1.html`.
3. Edit its text.
4. Add a new card on the homepage under `PREVIOUS BAD DECISIONS`.

## Publish

Upload all of these files to the root of your GitHub repository. Then enable GitHub Pages from the repository settings. After that, connect `spokanistansaga.com` as the custom domain.

Update 4 adds the photographed signed Covenant and the Spokane reunion shirt photo while retaining an empty future-photo slot on the Spokane ride page.
