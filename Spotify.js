// async function auth(res) {
//   console.log('setting access token')
//   const {body} = await spotifyApi.clientCredentialsGrant()
//   token = body['access_token']
//   const expires = new Date().getTime() + body['expires_in'] * 1000
//   res.cookie('spotifyAccessToken', {token, expires})
//   spotifyApi.setAccessToken(token);
// }

exports.auth = async (spotifyApi, res) => {
  console.debug('Initial auth')
  var scopes = ['playlist-read-private'],
  state = 'spotify_auth_state';

  // Create the authorization URL
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Authorising...')
  res.redirect(authorizeURL)
}

exports.completeAuth = async (spotifyApi, code) => {
  console.debug('Completing auth process')
  return spotifyApi.authorizationCodeGrant(code)
    .then(data => {
      const expires = data.body['expires_in']
      const token = data.body['access_token']
      const refreshToken = data.body['refresh_token']
  
      return {token, refreshToken, expires}
    })
    .catch(err => console.error('Something went wrong!', err))
}

exports.refreshAccessToken = async(spotifyApi, refreshToken) => {
  console.debug(`Refreshing access token`)
  spotifyApi.setRefreshToken(refreshToken)
  return spotifyApi.refreshAccessToken()
    .then(data => {
      const token = data.body['access_token']
      const expires = data.body['expires']
      spotifyApi.setAccessToken(token)
      return {token, expires}
    })
}

exports.getPlaylist = async(spotifyApi, playlistId) => {
  console.debug('Fetching playlist')
  const {body} = await spotifyApi.getPlaylist(playlistId, {
    fields: 'name,description,tracks(items(track(id,preview_url,name,artists(name))))',
    market: 'GB'
  })
  return {
    name: body.name,
    description: body.description,
    tracks: body.tracks.items.map(item => ({
      id: item.track.id,
      artist: item.track.artists[0].name,
      title: item.track.name,
      previewUrl: item.track['preview_url']
    }))
  }
}

exports.getUsersPlaylists = async(spotifyApi, offset) => {
  console.debug('Fetching playlists')
  const response = await spotifyApi.getUserPlaylists({offset})
  const body = response.body
  const playlists = body.items.map(playlist => ({
    id: playlist.id,
    name: playlist.name
  }))
  return {
    playlists,
    total: body.total,
    hasNext: !!body.next,
    nextOffset: body.offset + body.limit
  }
}