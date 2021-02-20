const axios = require('axios')
const querystring = require('querystring')
const { v4: uuidv4 } = require('uuid')
const _ = require('underscore')

/** Spotify **/
const client_id = 'b68fdb8547e549a2971c6bfb5a31f32d' // Your client id
const client_secret = '6bb7c2c35d394fcd8d1ee24085689d30' // Your secret
const redirect_uri = 'http://localhost:4000/spotify-callback' // Your redirect uri
const scope = 'playlist-read-private'
const stateKey = 'spotify_auth_state'

module.exports = class Spotify {
    login(req, res) {
        if (req.cookies.spotifyAccessTokenKey) {
            console.log('hey, I know you!')
            // already known user - refresh token
        } else {
            const state = {playlistId: req.body.playlistId}
            res.redirect('https://accounts.spotify.com/authorize?' +
                querystring.stringify({
                    response_type: 'code',
                    client_id: client_id,
                    scope: scope,
                    redirect_uri: redirect_uri,
                    state: state
                }))
        }
    }

    loginCallback(req, res) {
        // your application requests refresh and access tokens
        // after checking the state parameter

        const code = req.query.code || null
        const state = req.query.state || null
        const storedState = req.cookies ? req.cookies[stateKey] : null

        if (state === null || state !== storedState) {
            res.redirect('/#' +
                querystring.stringify({
                    error: 'state_mismatch'
                }))
        } else {
            res.clearCookie(stateKey)
            const data = querystring.stringify({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            })
            const config = {
                auth: {
                    username: client_id,
                    password: client_secret
                }
            }
            return axios.post('https://accounts.spotify.com/api/token', data, config).then(response => {
                if (response.status === 200) {
                    const accessToken = response.data.access_token
                    console.log({accessToken})
                    const refreshToken = response.data.refresh_token
                    res.cookie('spotifyAccessToken', accessToken)

                    return {refreshToken, accessToken}
                } else {
                    console.error(`Failed to auth, probably an invalid token, status ${response.status}`)
                }
            }).catch(err => console.log(err))
        }
    }

    refreshToken(username) {
        return this.db.getUser(username).then(user => {
            const refreshToken = user.refreshToken
            const url = 'https://accounts.spotify.com/api/token'
            const data = querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
            const config = {
                auth: {
                    username: client_id,
                    password: client_secret
                }
            }

            return axios.post(url, data, config).then(response => {
                if (response.status === 200) {
                    return response.data.access_token
                } else {
                    console.error('Unable to get refresh token')
                }
            }).catch(err => console.log(err))
        })

    }

    getPlaylist(playlistId, accessToken) {
        console.log('fetching tracks')
        const fields = 'name,tracks(items(track(id,preview_url,name,artists(name))))'
        const url = `https://api.spotify.com/v1/playlists/${playlistId}?market=GB&fields=${fields}`

        return axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }).then(response => {
            if (response.status === 200) {
                const playlistName = response.data.name
                const tracks = response.data.tracks.items.map(item => {
                    return {
                        id: item.track.id,
                        artist: item.track.artists[0].name,
                        title: item.track.name,
                        previewUrl: item.track.preview_url
                    }
                })
                return {id: playlistId, name: playlistName, tracks: tracks}
            } else {
                console.error('failed to get tracks')
            }
        }).catch(err => console.log(err))
    }
}
