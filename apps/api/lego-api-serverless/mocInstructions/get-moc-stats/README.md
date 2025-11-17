# Get MOC Statistics Lambda Function

Returns MOC statistics grouped by category (theme/tags)

## API Endpoints

- `GET /api/mocs/stats/by-category` - Get top 10 categories with MOC counts

## Response

```json
{
  "success": true,
  "data": [
    { "category": "castle", "count": 15 },
    { "category": "space", "count": 12 }
  ],
  "total": 27
}
```
