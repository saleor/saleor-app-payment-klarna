<div align="center">
  <img width="150" alt="" src="https://user-images.githubusercontent.com/1338731/222410999-3ec838de-d49a-4d48-8f8a-4788beeef80d.png">
</div>

<div align="center">
  <h1>Saleor App Payment Template</h1>
</div>

<div align="center">
  <a href="https://saleor.io/">Website</a>
  <span> | </span>
  <a href="https://docs.saleor.io/docs/3.x/">Docs</a>

</div>

## 🚀 Quick start

### Requirements

- `pnpm` – at least 8.8.0
- `node` – at least 18.0.0

### Installation

```bash
pnpm install
```

### Development

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

When developing, use the `dev` command to start the app:

```bash
pnpm dev
```

The app should be available on `http://localhost:3000`.

To install the app in Saleor, you might find it useful to use some sort of TCP tunneling tool, like [ngrok](https://ngrok.com/). Once you have your public tunnel URL, change the value of `APP_API_BASE_URL` and `APP_IFRAME_BASE_URL` in `.env` to your tunnel URL.

### APL

Saleor apps use Auth Persistence Layer (APL) to store authentication tokens. By default, `FileAPL` is used that stores tokens in a file.

You can read more about it here: https://docs.saleor.io/docs/3.x/developer/extending/apps/developing-apps/app-sdk/apl
