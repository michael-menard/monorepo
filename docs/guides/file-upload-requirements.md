# File Upload Requirements

This guide documents the requirements for uploading files to the platform, including allowed file types, naming conventions, and size limits.

## Allowed File Types

### Instruction Files

| Type | MIME Type         | Max Size |
| ---- | ----------------- | -------- |
| PDF  | `application/pdf` | 50 MB    |

### Parts List Files

| Type  | MIME Type                                                                                       | Max Size |
| ----- | ----------------------------------------------------------------------------------------------- | -------- |
| CSV   | `text/csv`                                                                                      | 10 MB    |
| XML   | `text/xml`, `application/xml`                                                                   | 10 MB    |
| JSON  | `application/json`                                                                              | 10 MB    |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel` | 10 MB    |

### Image Files (Thumbnails & Gallery)

| Type | MIME Type                  | Max Size |
| ---- | -------------------------- | -------- |
| JPEG | `image/jpeg`               | 10 MB    |
| PNG  | `image/png`                | 10 MB    |
| WebP | `image/webp`               | 10 MB    |
| HEIC | `image/heic`, `image/heif` | 10 MB    |

## File Count Limits

| File Type                    | Maximum Count |
| ---------------------------- | ------------- |
| Instruction files            | 10            |
| Parts list files             | 5             |
| Images (thumbnail + gallery) | 20            |

## Filename Requirements

### Allowed Characters

Filenames are sanitized before storage. The following characters are preserved:

- Letters: `a-z`, `A-Z`
- Numbers: `0-9`
- Special: `.` (period), `-` (hyphen), `_` (underscore)

All other characters are replaced with underscores.

### Automatic Transformations

1. **Lowercase**: Filenames are converted to lowercase for consistency
2. **Path stripping**: Any path components are removed (e.g., `/path/to/file.pdf` becomes `file.pdf`)
3. **Unicode normalization**: Unicode characters are normalized to NFC form
4. **Control character removal**: Control characters (tabs, newlines, null bytes) are stripped

### Reserved Names

Windows reserved names are automatically prefixed with an underscore:

- `CON`, `PRN`, `AUX`, `NUL`
- `COM1` through `COM9`
- `LPT1` through `LPT9`

Example: `CON.txt` becomes `_con.txt`

### Length Limits

- Maximum filename length: 255 characters
- Extensions are preserved when truncating long filenames

### Examples

| Original Filename     | Sanitized Filename    |
| --------------------- | --------------------- |
| `My Instructions.pdf` | `my_instructions.pdf` |
| `LEGO Set #12345.pdf` | `lego_set_12345.pdf`  |
| `../../../etc/passwd` | `passwd`              |
| `CON.txt`             | `_con.txt`            |
| `file<script>.html`   | `file_script_.html`   |
| `文件.pdf`            | `unnamed.pdf`         |

## Content Validation

All uploaded files undergo content validation:

1. **Magic bytes verification**: File signatures are checked to ensure the file content matches the declared MIME type
2. **Size verification**: Files exceeding size limits are rejected during finalization

## Error Messages

| Error                              | Description                                                                |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `File exceeds size limit`          | File is larger than allowed for its type                                   |
| `Invalid MIME type`                | File type not in the allowlist                                             |
| `File signature validation failed` | File content doesn't match declared type (possible corruption or spoofing) |

## Best Practices

1. Use descriptive, simple filenames
2. Avoid special characters in filenames
3. Keep filenames under 100 characters for best compatibility
4. Ensure file extensions match the actual content type
5. Verify file integrity before uploading
