# LEGO.com Product Scraper

Scrapes metadata from a single LEGO.com product page. No login required.

## Usage

```bash
cd apps/scrapers/lego-com
pnpm scrape <lego.com product URL>
```

### Example

```bash
pnpm scrape https://www.lego.com/en-us/product/lamborghini-revuelto-huracan-sto-77238
```

### Output

```json
{
  "name": "Lamborghini Revuelto & Huracán STO",
  "description": "Awesome car toy building set with 2 Lamborghini models",
  "productId": "77238",
  "theme": "Speed Champions",
  "image": "https://www.lego.com/cdn/cs/set/assets/.../77238_Prod.png",
  "pieceCount": 607,
  "price": 49.99,
  "currency": "USD",
  "sourceUrl": "https://www.lego.com/en-us/product/lamborghini-revuelto-huracan-sto-77238"
}
```

## Data Extracted

| Field         | Source                        | Example                            |
| ------------- | ----------------------------- | ---------------------------------- |
| `name`        | Product JSON-LD               | Lamborghini Revuelto & Huracán STO |
| `description` | Product JSON-LD               | Awesome car toy building set...    |
| `productId`   | Product JSON-LD               | 77238                              |
| `theme`       | Breadcrumb JSON-LD (2nd item) | Speed Champions                    |
| `image`       | Product JSON-LD               | CDN URL to product image           |
| `pieceCount`  | Product JSON-LD               | 607                                |
| `price`       | Product JSON-LD offers        | 49.99                              |
| `currency`    | Product JSON-LD offers        | USD                                |
| `sourceUrl`   | Input URL                     | The URL you passed in              |

## How It Works

LEGO.com embeds structured data as [JSON-LD](https://json-ld.org/) `<script>` tags in every product page. The scraper:

1. Opens the page in a real Chrome browser (via Playwright)
2. Waits for the `<script data-test="product-schema">` element to appear
3. Parses the Product and BreadcrumbList JSON-LD blocks
4. Extracts and validates data with Zod schemas
5. Prints the result as JSON to stdout

## Notes

- **Requires system Chrome** — LEGO.com blocks headless browsers, so the scraper runs in headed mode using your installed Chrome. A browser window will open briefly and close automatically.
- **Single URL only** — this scraper is designed for one product at a time, not bulk crawling.
- **No authentication** — product pages are public.
- **URL format** — use the full product URL from lego.com (e.g., `https://www.lego.com/en-us/product/...`).
