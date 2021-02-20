const fs = require('fs')
const axios = require('axios')
const { collect } = require('underscore')

exports.downloadTracks = async function(tracks, targetFolder) {
  tracks.forEach(async (track, i) => {
    if (track.previewUrl) {
      try {
        await downloadTrack(track.previewUrl, i+1, targetFolder)
      } catch (error) {
        console.error('Unable to download track', error)
      }
    } else {
      console.log(`Skipping ${track.title} as there is no previewUrl`)
    }
  })
}

function downloadTrack(url, trackPath, targetFolder) {
  const mp3Location = `${fs.realpathSync(targetFolder)}/${trackPath}.mp3`
  if (fs.existsSync(mp3Location)) {
    return Promise.resolve
  }
  
  console.log(`Downloading track from ${url} to ${mp3Location}`)
  return axios({
      url,
      method: 'GET',
      responseType: 'stream'
  }).then(response => {
      const writer = fs.createWriteStream(mp3Location)
      console.log(`downloading track ${mp3Location}`)
      response.data.pipe(writer)
      return new Promise((resolve, reject) => {
          writer.on('finish', resolve)
          writer.on('error', reject)
      })
  })
}