# Cloudflare AMP Optimizer

The Cloudflare AMP Optimizer is a Cloudflare Worker that will automatically optimize and cache any AMP pages & content from your origin so everyone can get the benefit of AMP optimized pages, not just users going through the AMP Cache.

See it in action at our [live demo](https://optimizer-demo.ampdev.workers.dev/the_scenic/templates/template_1_article.amp.html).

## Usage

1. Create your own Cloudflare Worker Repo using this as a template.

```bash
npx @cloudflare/wrangler generate my-worker https://github.com/ampproject/cloudflare-amp-optimizer
```

2. Configure the routes in `wrangler.toml`.
3. Make any changes to `config.json` if needed (explanations below).
4. Publish!

```bash
npm run prod # calls wrangler publish --env=prod
```

## Configuration

### Usage as a reverse proxy

If your origin is not CF backed, then you can only use the optimizer in reverse proxy mode. You may configure it via the `proxy` option:

```json
{
  "proxy": {
    "worker": "YOUR_WORKER_DOMAIN",
    "origin": "YOUR_ORIGIN_DOMAIN"
  }
}
```

An example configuration is available in [@ampproject/amp-toolbox](https://github.com/ampproject/amp-toolbox/tree/main/packages/cloudflare-optimizer-scripts/demo)

### Passing configuration options to AMP Optimizer

Under the hood, `cloudflare-amp-optimizer` utilizes the [AMP Optimizer](https://github.com/ampproject/amp-toolbox/tree/main/packages/optimizer#options) library. If you'd like to pass through configuration options to the underlying library, you may do so by adding it to the `optimizer` key within `config.json`. For example, to increase the hero image count from 2 to 5:

```json
{
  "optimizer": {
    "maxHeroImageCount": 5
  }
}
```

### Enabling KV Cache

CloudFlare Workers have access to a [fast, globally available cache](https://developers.cloudflare.com/workers/runtime-apis/kv). We highly recommend you enable this feature. In order to use it, add `enableKVCache: true` to `config.json`, as well as specify the _bindings_ within the `wrangler.toml` file. The binding must be named `KV`.

```toml
kv_namespaces = [
  { binding = "KV", id = "YOUR_ID", preview_id="YOUR_PREVIEW_ID"}
]
```

To see an example, check out the demo's [wrangler.toml](https://github.com/ampproject/amp-toolbox/blob/main/packages/cloudflare-optimizer-scripts/demo/wrangler.toml) file.

### Enabling image optimization

If you are a Business or Enterprise customer of Cloudflare, you may enable [Cloudflare Image Optimizations](https://developers.cloudflare.com/images/url-format). Just add `enableCloudflareImageOptimization: true` to the `config.json` file and images will be automatically optimized for multiple screen sizes.

Note: due to current limitations in `workers.dev`, this does not yet work in reverse proxy mode.
