# Get MOC Uploads Over Time Lambda Function

Returns time-series data of MOC uploads (last 12 months) grouped by month and category

## API Endpoints

- `GET /api/mocs/stats/uploads-over-time` - Get monthly upload trends

## Response

```json
{
  "success": true,
  "data": [
    { "date": "2025-01", "category": "castle", "count": 5 },
    { "date": "2025-01", "category": "space", "count": 3 },
    { "date": "2025-02", "category": "castle", "count": 2 }
  ]
}
```
