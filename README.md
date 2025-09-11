This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Teleprompter

- Route: open `http://localhost:3000/`.
- Allow microphone access in your browser when prompted.
- The teleprompter scroll speed adapts to your speaking rate (estimated via Web Audio). If you pause, scrolling holds; if you speed up, it scrolls faster. You can also load a `.txt/.md/.rtf/.srt` file.
- `http://localhost:3000/teleprompter` redirects to the root for convenience.

Optional speech-follow (ASR)
- Toggle the “ASR” button to let the app listen and align the text to recognized words in real time. This uses the browser’s Web Speech API (best supported on Chrome-based browsers). If unsupported, the button is disabled.

Notes:
- Most browsers require HTTPS or `localhost` for microphone access. Use Chrome, Edge, or Safari on recent versions.
- Microphone tracks are stopped when you hit Stop or leave the page.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
