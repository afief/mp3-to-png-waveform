require('dotenv').config()
const path = require('path')
const express = require('express')
const port = 3001
const puppeteer = require('puppeteer')

const app = express()

app.listen(port, async () => {
  console.log(`listening on port ${port}!`)
})

app.get('/', async (req, res) => {
  let timeout = false
  let isOpen = true
  const { url, token } = req.query
  if (!url) {
    return res.status(400).json({ err: 1, message: 'url parameter is mandatory' })
  }
  if (!token || token !== process.env.TOKEN) {
    return res.status(400).json({ err: 1, message: 'invalid token' })
  }

  const browser = await puppeteer.launch({
    args: [ '--disable-web-security' ]
  })
  const page = await browser.newPage()
  page.setViewport({
    width: 800,
    height: 200
  })
  page.exposeFunction('FinishRender', async () => {
    const screenshot = await page.screenshot({ omitBackground: true })
    if (timeout) return

    await page.close()
    isOpen = false

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': screenshot.length
    })

    res.end(screenshot, 'binary')
  })
  page.exposeFunction('FailedRender', async (e) => {
    if (timeout) return

    await page.close()
    isOpen = false
    return res.status(500).json({ err: 1, message: `failed to render: ${e.error}` })
  })

  const pageUrl = `file://${path.join(__dirname, `render.html?url=${url}`)}`
  await page.goto(pageUrl)

  setTimeout(async () => {
    timeout = true
    if (!isOpen) return

    await page.close()
    return res.status(500).json({ err: 1, message: `service timeout` })
  }, parseInt(process.env.TIMEOUT) || 60000)
})
