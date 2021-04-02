const { beforeEach, expect, it, describe } = require('@jest/globals')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const { handleRequest } = require('../src/index')
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
  const config = { domain: 'example.com' }
  const getOutput = url => {
    return handleRequest({ url }, config).then(r => r.text())
  }

  it('Should ignore non HTML documents', async () => {
    const input = `<html amp><body><a href="">link</a></body></html>`
    const incomingResponse = getResponse(input, { contentType: 'other' })
    global.fetch.mockReturnValue(incomingResponse)

    const output = await getOutput('http://text.com')
    expect(output).toBe(input)
  })

  it('Should ignore non-AMP HTML documents', async () => {
    const input = `<html><body><a href="">link</a></body></html>`
    global.fetch.mockReturnValue(getResponse(input))

    const output = await getOutput('http://test.com')
    expect(output).toBe(input)
  })

  it('Should transform AMP HTML documents', async () => {
    const input = `<html amp><body><a href="">link</a></body></html>`
    global.fetch.mockReturnValue(getResponse(input))

    const output = await getOutput('http://test.com')
    expect(output).toBe(`transformed-${input}`)
  })

  it.todo('Should modify request url for reverse-proxy')
  it.todo('Should rewrite all links for reverse-proxy')
})

describe('validateConfig', () => {
  it.todo('Should throw unless {to,from} or {domain} are present')
  it.todo('Should throw if both {to,from} and {domain} are present')
  it.todo('Should throw if unknown keys are present')
  it.todo('Should accept valid configurations')
})

describe('getAmpOptimizer', () => {
  it.todo('Should pass through options from configuration.')
})

function getResponse(html, { contentType } = { contentType: 'text/html' }) {
  return new Response(html, {
    headers: { get: () => contentType },
    status: 200,
    statusText: '200',
  })
}
