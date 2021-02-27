let currentOffset = 0

document.addEventListener("DOMContentLoaded", async function() {
  await getPageOfPlaylists(0)
});

async function getNextPageOfPlaylists() {
  getPageOfPlaylists(currentOffset + 20)
}

async function getPreviousPageOfPlaylists() {
  getPageOfPlaylists(currentOffset - 20)
}

async function getPageOfPlaylists(offset) {
  currentOffset = offset
  await fetch(`/playlists?offset=${offset}`)
  .then(response => response.json())
  .then(result => {
    const list = document.getElementById('playlistList')
    while (list.lastChild) {
        list.lastChild.remove()
    }
    result.playlists.forEach(playlist => {
      const form = document.createElement('form')
      form.action = '/generate'
      form.method = 'post'

      const idField = document.createElement('input')
      idField.type = 'hidden'
      idField.value = playlist.id
      idField.name = 'playlistId'
      form.appendChild(idField)

      const button = document.createElement('button')
      button.type = 'submit'
      button.className = 'list-group-item list-group-item-action'
      button.textContent = playlist.name
      form.appendChild(button)
      
      list.appendChild(form)
    })
    
    const previousButton = document.getElementById('previous');
    if (currentOffset > 0) {
      previousButton.parentElement.classList.remove('disabled')
      previousButton.tabIndex = undefined
      previousButton.setAttribute('aria-disabled', false)
      previousButton.disabled = false
    } else {
      previousButton.parentElement.classList.add('disabled')
      previousButton.tabIndex = -1
      previousButton.setAttribute('aria-disabled', true)
      previousButton.disabled = true
    }

    const nextButton = document.getElementById('next');
    if (!result.hasNext) {
      nextButton.parentElement.classList.add('disabled')
      nextButton.tabIndex = -1
      nextButton.setAttribute('aria-disabled', true)
      nextButton.disabled = true
    } else {
      nextButton.parentElement.classList.remove('disabled')
      nextButton.tabIndex = -1
      nextButton.setAttribute('aria-disabled', true)
      nextButton.disabled = false
    }
  })
}