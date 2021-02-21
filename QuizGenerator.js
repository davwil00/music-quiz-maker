const fs = require('fs')
const { downloadTracks } = require('./Audio')
const zipper = require('./Zipper')
const { getPlaylist } = require('./Spotify')

exports.createQuiz = async(playlistId) => {
  if (playlistId.startsWith('spotify:playlist:')) {
    playlistId = playlistId.substring(17)
  }

  const playlist = await getPlaylist(spotifyApi, playlistId)
  const zipName = await createQuizFromPlaylist(playlist)
  return {zipName, playlistName: playlist.name}
}

createQuizFromPlaylist = async (playlist) => {
  const targetFolder = `/tmp/${playlist.name}`
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