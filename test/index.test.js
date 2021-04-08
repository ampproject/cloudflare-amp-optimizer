const { beforeEach, expect, it, describe } = require('@jest/globals')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const {
  getOptimizer,
  handleRequest,
  validateConfiguration,
} = require('../src/index')
const { Response, HTMLRewriter } = require('./builtins')

jest.mock('@ampproject/toolbox-optimizer', () => {
  const transformHtmlSpy = jest.fn(input => `transformed-${input}`)
  return {
    create: jest.fn(() => ({ transformHtml: transformHtmlSpy })),
    transformHtmlSpy,
  }
})

beforeEach(() => {
  global.fetch = jest.fn()
  AmpOptimizer.create.mockClear()

  global.Response = Response
  global.HTMLRewriter = HTMLRewriter
})

describe('handleRequest', () => {
  const defaultConfig = { domain: 'example.com' }

  function getOutput(url, config = defaultConfig) {
    return handleRequest({ url }, config).then(r => r.text())
  }

  it('Should ignore non HTML documents', async () => {
    const input = `<html amp><body></body></html>`
    const incomingResponse = getResponse(input, { contentType: 'other' })
    global.fetch.mockReturnValue(incomingResponse)

    const output = await getOutput('http://text.com')
    expect(output).toBe(input)
  })

  it('Should ignore non-AMP HTML documents', async () => {
    const input = `<html><body></body></html>`
    global.fetch.mockReturnValue(getResponse(input))

    const output = await getOutput('http://test.com')
    expect(output).toBe(input)
  })

  it('Should transform AMP HTML documents', async () => {
    const input = `<html amp><body></body></html>`
    global.fetch.mockReturnValue(getResponse(input))

    const output = await getOutput('http://test.com')
    expect(output).toBe(`transformed-${input}`)
  })

  it('Should passthrough request to origin in request interceptor mode', async () => {
    const input = `<html amp><body></body></html>`
    global.fetch.mockReturnValue(getResponse(input))
    await getOutput('http://test.com')
    expect(fetch).toBeCalledWith('http://test.com/')
  })

  it('Should modify request url for reverse-proxy', async () => {
    const config = { from: 'test.com', to: 'test-origin.com' }
    const input = `<html amp><body></body></html>`
    global.fetch.mockReturnValue(getResponse(input))

    await getOutput('http://test.com', config)
    expect(fetch).toBeCalledWith('http://test-origin.com/')
  })

  // TODO: how best to test HTMLRewriter functionality?
  it.todo('Should rewrite all links for reverse-proxy')
})

describe('validateConfig', () => {
  it('Should throw unless {to,from} or {domain} are present', () => {
    expect(() => validateConfiguration({})).toThrow()
  })

  it('Should throw if both {to,from} and {domain} are present', () => {
    const config = { to: '', from: '', domain: '' }
    expect(() => validateConfiguration(config)).toThrow()
  })

  it('Should throw if unknown keys are present', () => {
    const config = { domain: 'example.com', hello: 'world' }
    expect(() => validateConfiguration(config)).toThrow()
  })

  it('Should accept valid configurations', () => {
    validateConfiguration({ domain: 'example.com' })
    validateConfiguration({ from: 'example-from.com', to: 'example-to.com' })
  })
})

describe('getAmpOptimizer', () => {
  it('Should pass through options from configuration.', () => {
    getOptimizer({ optimizer: { maxHeroImageCount: 42 } })
    expect(AmpOptimizer.create).toBeCalledWith(
      expect.objectContaining({
        maxHeroImageCount: 42,
      }),
    )
  })

  it('Should override specific settings', () => {
    getOptimizer({ cache: true })
    expect(AmpOptimizer.create).toBeCalledWith(
      expect.objectContaining({ cache: false }),
    )
  })

  // See https://developers.cloudflare.com/images/url-format.
  it('Should rewrite images using cloudflare image resizing', () => {
    getOptimizer({ enableCloudflareImageOptimization: false })
    expect(AmpOptimizer.create).toBeCalledWith(
      expect.objectContaining({ imageOptimizer: undefined }),
    )
    AmpOptimizer.create.mockClear()

    getOptimizer({ enableCloudflareImageOptimization: true })
    expect(AmpOptimizer.create).toBeCalledWith(
      expect.objectContaining({ imageOptimizer: expect.any(Function) }),
    )
  })
})

function getResponse(html, { contentType } = { contentType: 'text/html' }) {
  return new Response(html, {
    headers: { get: () => contentType },
    status: 200,
    statusText: '200',
  })
}
