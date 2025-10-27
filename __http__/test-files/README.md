# Test Files for HTTP Requests

This directory contains sample files for testing file upload functionality with the LEGO Projects API.

## File Descriptions

- `avatar.jpg` - Small user avatar image (max 10MB)
- `gallery-image.jpg` - Gallery image for testing image uploads
- `instructions.pdf` - Sample MOC building instructions file
- `parts-list.csv` - Sample parts list in CSV format
- `wishlist-item.jpg` - Image for wishlist item testing

## Creating Test Files

If these files don't exist, create them with the following commands:

### Create Sample Images

```bash
# Create a simple colored square for avatar (requires ImageMagick)
convert -size 200x200 xc:blue __http__/test-files/avatar.jpg

# Create a larger image for gallery testing
convert -size 800x600 xc:green __http__/test-files/gallery-image.jpg

# Create wishlist item image
convert -size 400x400 xc:red __http__/test-files/wishlist-item.jpg
```

### Create Sample PDF (requires pandoc or similar)

```bash
echo "# MOC Building Instructions

This is a sample MOC instruction document.

## Step 1
Build the base structure.

## Step 2
Add the main components.

## Step 3
Complete the finishing touches." > instructions.md

# Convert to PDF (if pandoc is installed)
pandoc instructions.md -o __http__/test-files/instructions.pdf
```

### Create Sample CSV

```bash
cat > __http__/test-files/parts-list.csv << 'EOF'
Part Number,Description,Color,Quantity,Category
3001,Brick 2x4,Red,10,Basic Bricks
3003,Brick 2x2,Blue,15,Basic Bricks
3004,Brick 1x2,Yellow,20,Basic Bricks
3005,Brick 1x1,White,25,Basic Bricks
3022,Plate 2x2,Green,12,Plates
3023,Plate 1x2,Black,18,Plates
3024,Plate 1x1,Gray,30,Plates
EOF
```

## Alternative: Use Your Own Files

You can replace these sample files with your own:

- **Images**: Use any JPEG, PNG, HEIC, or WebP files
- **Instructions**: Use any PDF file with MOC instructions
- **Parts List**: Use any CSV file with parts data

## File Size Limits

- Avatar images: 10MB maximum
- Gallery images: 20MB maximum
- MOC files (instructions, parts lists): Based on server configuration

## Usage with HTTP Client

When using VS Code REST Client or similar tools, the `< ./test-files/filename` syntax will reference these files in your HTTP requests.
