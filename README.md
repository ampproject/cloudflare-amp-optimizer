# AMP Cloudflare Optimizer

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ampproject/cloudflare-optimizer)

See it in action at https://optimizer.ampdev.workers.dev/

## Usage

1. Create your own Cloudflare Worker Repo using this as a template.

```bash
npx wrangler generate my-worker  https://github.com/ampproject/cloudflare-optimizer
```

2. Customize the configuration at `config.json` to point to your domain name.

```json
{ "domain": "YOUR_DOMAIN_NAME" }
```

3. Publish!

```bash
npx wrangler publish
```

### Usage as a reverse proxy

If your origin is not CF backed, then you can only use the cloudflare optimizer in reverse proxy mode. Instead of specifying `domain`, you must specify both `from` and `to` URLs.

```js
module.export = {
  from: 'YOUR_WORKER_DOMAIN', // Provide the domain name that your cloudflare worker is deployed at.
  to: 'YOUR_ORIGIN_DOMAIN', // Provide the URL of the origin to proxy to.
}
```

### Enabling image optimization

If you are a Business or Enterprise customer of Cloudflare, you may enable [Cloudflare Image Optimizations](https://developers.cloudflare.com/images/url-format). Just add `enableCloudflareImageOptimization: true` to the `config.json` file and images will be automatically optimized for multiple screen sizes.

### Passing configuration options to AMP Optimizer

Under the hood, `amp-cloudflare-worker` utilizes the [AMP Optimizer](https://github.com/ampproject/amp-toolbox/tree/main/packages/optimizer#options) library. If you'd like to pass through configuration options to the underlying library, you may do so by adding it to the `optimizer` key within `config.json`. For example, to increase the hero image count from 2 to 5:

```json
{
  "optimizer": {
    "maxHeroImageCount": 5
  }
}
```
