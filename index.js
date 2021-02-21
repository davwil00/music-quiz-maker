const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('path')
const SpotifyWebApi = require('spotify-web-api-node')
const { auth, completeAuth, refreshAccessToken } = require('./Spotify')
const { createQuiz } = require('./QuizGenerator')
require('dotenv').config()

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  console.error('Please set env vars correctly')
  process.exit()
}

spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
})

const app = express()
const port = process.env.PORT || 4000

app.use(cookieParser())

app.use(express.urlencoded({
  extended: true
}))

app.get('/', async (req, res) => {
  reAuthIfNeeded(req, res)
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/spotify-callback', async (req, res) => {
  // https://example.com/callback?code=NApCCg..BkWtQ&state=profile%2Factivity
  const code = req.query.code
  const {token, refreshToken, expires} = await completeAuth(spotifyApi, code)
  spotifyApi.setAccessToken(token)
  spotifyApi.setRefreshToken(refreshToken)
  setCookie({token, refreshToken, expires: new Date().getTime() + expires})
  res.redirect('/')
})

app.post('/generate', async(req, res) => {
  reAuthIfNeeded(req, res)
  let playlistId = req.body.playlistId
  try {
    const {zipName, playlistName} = await createQuiz(playlistId)
    res.download(path.join(__dirname, zipName), `${playlistName.toLowerCase()}.zip`)
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})  

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

//spotify:playlist:5TC8ZjgZqhD38P9CumHuSg
//4CXZik2xo5oVyhp69ebBym


async function reAuthIfNeeded(req, res) {
  const tokenData = getTokenData(req.cookies)

  if (tokenData) {
    if (isTokenValid(tokenData)) {
      spotifyApi.setAccessToken(tokenData.token)
    } else {
      const {token, expires} = await refreshAccessToken(spotifyApi, tokenData.refreshToken)
      tokenData.token = token
      tokenData.expires = expires
      setCookie(tokenData)
    }
  } else {
    auth(spotifyApi, res)
  }
}

function getTokenData(cookies) {
  return JSON.parse(cookies.spotifyAccessToken)
}

function isTokenValid(tokenData) {
  return tokenData.expires > new Date().getTime()
}

function setCookie(res, tokenData) {
  res.cookie('spotifyAccessToken', JSON.stringify(tokenData))
}