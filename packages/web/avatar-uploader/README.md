# @monorepo/avatar-uploader

Reusable Avatar Uploader React component for profile images.

## Installation

```sh
pnpm add @monorepo/avatar-uploader
# or
yarn add @monorepo/avatar-uploader
# or
npm install @monorepo/avatar-uploader
```

## Usage

```tsx
import AvatarUploader from '@monorepo/avatar-uploader';

function MyProfilePage({ userId }) {
  const handleUpload = async (file, userId) => {
    // Call your backend API to upload the file
  };

  return (
    <AvatarUploader
      userId={userId}
      onUpload={handleUpload}
      onSuccess={() => alert('Upload successful!')}
      onError={err => alert('Upload failed: ' + err.message)}
    />
  );
}
```

## Props

| Prop       | Type                                   | Required | Description                                 |
|------------|----------------------------------------|----------|---------------------------------------------|
| userId     | `string`                               | Yes      | The user ID for the upload                  |
| onUpload   | `(file: File, userId: string) => Promise<void>` | Yes      | Function to handle the upload logic         |
| onSuccess  | `() => void`                           | No       | Called when upload succeeds                 |
| onError    | `(error: Error) => void`               | No       | Called when upload fails                    |

## Contributing

Contributions welcome! Please open issues or PRs.

## License

MIT 