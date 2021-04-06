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

module.exports = { Response, HTMLRewriter }
