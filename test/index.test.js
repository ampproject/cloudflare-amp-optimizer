const { beforeEach, expect } = require('@jest/globals')
const AmpOptimizer = require('@ampproject/toolbox-optimizer')

// const transformHtmlSpy = jest.fn(input => `transformed-${input}`);
// const createAmpOptimizerSpy = jest.fn(() => ({
//     transformHtml: transformHtmlSpy,
// }));
// return { create: createAmpOptimizerSpy}
jest.mock('@ampproject/toolbox-optimizer', () => {
  const transformHtmlSpy = jest.fn(input => `transformed-${input}`)
  return {
    create: jest.fn(() => ({ transformHtml: transformHtmlSpy })),
    transformHtmlSpy,
  }
})

const { handleRequest } = require('../src/index')

const REVERSE_PROXY_CONFIG = {
  from: 'example-origin.com',
  to: 'example-proxy.com',
}

beforeEach(() => {
  global.fetch = jest.fn()
  AmpOptimizer.create.mockClear()

  global.Response = Response
  global.HTMLRewriter = HTMLRewriter
})

it('Should ignore non HTML documents', async () => {
  const input = `<html amp><body><a href="">link</a></body></html>`
  const incomingResponse = getResponse({ html: input, isHtml: false })
  global.fetch.mockReturnValue(incomingResponse)

  const outgoingResponse = handleRequest(
    { url: 'http://test.com' },
    REVERSE_PROXY_CONFIG,
  )
  const output = await (await outgoingResponse).text()
  expect(output).toBe(input)
})

it('Should ignore non AMP HTML documents', () => {
  const html = `<html><body><a href="">link</a></body></html>`
  const response = getResponse({ html, isHtml: true })
  global.fetch.mockReturnValue(response)
  handleRequest({ url: 'http://test.com' }, REVERSE_PROXY_CONFIG)
})

it('Should transform AMP HTML documents', async () => {
  const input = `<html amp><body><a href="">link</a></body></html>`
  const incomingResponse = getResponse({ html: input, isHtml: true })
  global.fetch.mockReturnValue(incomingResponse)

  const outgoingResponse = handleRequest(
    { url: 'http://test.com' },
    REVERSE_PROXY_CONFIG,
  )
  const output = await (await outgoingResponse).text()
  expect(output).toBe(`transformed-${input}`)
})


class Response {
  constructor(text, { headers, status, statusText }) {
    this.syncText = text
    this.text = () => Promise.resolve(text)
    this.headers = headers
    this.status = status
    this.statusText = statusText
  }
  clone() {
    return new Response(this.syncText, {
      headers: this.headers,
      status: this.status,
      statusText: this.statusText,
    })
  }
}

class HTMLRewriter {
  constructor() {}
  on() {
    return this
  }
  transform(r) {
    return r
  }
}

function getResponse({ html, isHtml }) {
  return new Response(html, {
    headers: {
      get() {
        return isHtml ? 'text/html' : 'other'
      },
    },
    status: 200,
    statusText: '200',
  })
}
