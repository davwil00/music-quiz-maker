const express = require('express')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const path = require('path')
const {downloadTracks} = require('./Audio')
const SpotifyWebApi = require('spotify-web-api-node')
const zipper = require('./Zipper')
spotifyApi = new SpotifyWebApi({
  clientId: 'b68fdb8547e549a2971c6bfb5a31f32d',
  clientSecret: '6bb7c2c35d394fcd8d1ee24085689d30',
  redirectUri: 'http://localhost:4000/spotify-callback'
})
const app = express()
const port = 4000

app.use(cookieParser())

app.use(express.urlencoded({
  extended: true
}))


app.get('/', async (req, res) => {
  const tokenData = req.cookies.spotifyAccessToken
  let token

  if (tokenData) {
    if (tokenData.expires < new Date().getTime()) {
      token = refreshAccessToken(tokenData.refreshToken)
    } else {
      token = tokenData.token
      console.log('using existing token')
      spotifyApi.setAccessToken(token)
      res.sendFile(path.join(__dirname, 'public', 'index.html'))
    }
  } else {
    token = auth2(res)
  }
})

async function auth(res) {
  console.log('setting access token')
  const {body} = await spotifyApi.clientCredentialsGrant()
  token = body['access_token']
  const expires = new Date().getTime() + body['expires_in'] * 1000
  res.cookie('spotifyAccessToken', {token, expires})
  spotifyApi.setAccessToken(token);
}

async function auth2(res) {
  var scopes = ['playlist-read-private'],
  state = 'spotify_auth_state';

  // Create the authorization URL
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Authorising...')
  res.redirect(authorizeURL)
}

app.get('/spotify-callback', (req, res) => {
  // https://example.com/callback?code=NApCCg..BkWtQ&state=profile%2Factivity
  const code = req.query.code
  console.log(`Fetching auth token with token ${code}`)
  spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      const expires = data.body['expires_in']
      const token = data.body['access_token']
      const refreshToken = data.body['refresh_token']
  
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(token)
      spotifyApi.setRefreshToken(refreshToken)
      // res.cookie('spotifyAccessToken', {token, refreshToken, expires})
      res.sendFile(path.join(__dirname, 'public', 'index.html'))
    },
    function(err) {
      console.log('Something went wrong!', err);
      // res.sendStatus(500)
    }
  );
})

function refreshAccessToken(refreshToken) {
  console.log('refreshing access token')
  spotifyApi.setRefreshToken(refreshToken)
  spotifyApi.refreshAccessToken().then(
    function(data) {
      console.log('The access token has been refreshed!');
  
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    function(err) {
      console.log('Could not refresh access token', err);
    }
  );
}

app.post('/generate', async(req, res) => {
  let playlistId = req.body.playlistId
//spotify:playlist:5TC8ZjgZqhD38P9CumHuSg
//4CXZik2xo5oVyhp69ebBym
  if (playlistId.startsWith('spotify:playlist:')) {
    playlistId = playlistId.substring(17)
  }
  const {body} = await spotifyApi.getPlaylist(playlistId, {
    fields: 'name,description,tracks(items(track(id,preview_url,name,artists(name))))',
    market: 'GB'
  })
  const playlist = {
    name: body.name,
    description: body.description,
    tracks: body.tracks.items.map(item => ({
      id: item.track.id,
      artist: item.track.artists[0].name,
      title: item.track.name,
      previewUrl: item.track['preview_url']
    }))
  }
  try {
    const zipName = await createQuizFromPlaylist(playlist)
    res.download(path.join(__dirname, zipName), `${playlist.name}.zip`)
  } catch (error) {
    console.error('Error generating quiz', error)
    res.sendStatus(500)
  }
})  

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

async function createQuizFromPlaylist(playlist) {
  const targetFolder = `./rounds/${playlist.name}`
  if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, {recursive: true})
  }
  await downloadTracks(playlist.tracks, targetFolder)
  createHtmlFromTemplate(playlist, targetFolder)
  const zipName = await zipper.zipFolder(playlist.name, targetFolder)
  return zipName
}

function createHtmlFromTemplate(playlist, targetFolder) {
  let template = fs.readFileSync('quiz-template.html', {encoding: 'utf8'})
  template = template.replace('%TITLE%', playlist.name)
  template = template.replace('%DESCRIPTION%', playlist.description)
  playlist.tracks.forEach((track, i) => {
    template = template.replace(`%ARTIST-${i+1}%`, track.artist)
    template = template.replace(`%TITLE-${i+1}%`, track.title)
  })
  fs.writeFileSync(`${fs.realpathSync(targetFolder)}/${playlist.name}.html`, template)
}