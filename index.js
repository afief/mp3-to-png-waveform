const path = require('path')
const express = require('express')
const port = 3001
const puppeteer = require('puppeteer')

const app = express()
let browser = null

app.listen(port, async () => {
  browser = await puppeteer.launch({
    args: [
      '--disable-web-security'
    ]
  })
  console.log(`listening on port ${port}!`)
})

app.get('/', async (req, res) => {
  let timeout = false
  const { url } = req.query
  if (!url) {
    return res.status(201).end()
  }

  const page = await browser.newPage()
  page.setViewport({
    width: 800,
    height: 200
  })
  page.exposeFunction('FinishRender', async () => {
    const screenshot = await page.screenshot({ omitBackground: true })
    await page.close()

    if (timeout) return

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename=download-${+new Date()}.png`,
      'Content-Length': screenshot.length
    })

    res.end(screenshot, 'binary')
  })
  page.exposeFunction('FailedRender', async (e) => {
    if (timeout) return

    await page.close()
    res.status(400).end()
  })

  const pageUrl = `file://${path.join(__dirname, `render.html?url=${url}`)}`
  await page.goto(pageUrl)

  setTimeout(async () => {
    timeout = true
    await page.close()
    res.status(400).end()
  }, 5000)
})
