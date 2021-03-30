# AMP Cloudflare Optimizer

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ampproject/cloudflare-optimizer)

See it in action at https://optimizer.ampdev.workers.dev/

## Usage

1. Create your own Cloudflare Worker Repo using this as a template.

```bash
wrangler generate my-worker  https://github.com/ampproject/cloudflare-optimizer
```

2. Customize the configuration at `config.json` to point to your domain name.

```json
{ "domain": "YOUR_DOMAIN_NAME" }
```

3. Publish!

```bash
wrangler publish
```

### Usage as a reverse proxy

If your origin is not CF backed, then you can only use the cloudflare optimizer in reverse proxy mode. Instead of specifying `domain`, you must specify both `from` and `to` URLs.

```js
module.export = {
  from: 'YOUR_WORKER_DOMAIN', // Provide the domain name that your cloudflare worker is deployed.
  to: 'YOUR_SERVER_IP', // Provide the URL of the origin to proxy to.
}
```
