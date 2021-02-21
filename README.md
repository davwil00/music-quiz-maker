# Music Quiz Maker

Simple enter a spotify playlist ID and this nifty app will download the 30 second preview of the tracks from spotify and produce a zip file for you to download containing the tracks and a webpage to run the quiz from.

# Setup
```bash
npm install
```
Set up a spotify dev account and create a new app.

Rename `.env.sample` to `.env` and set the variables

# Running
```bash 
node index.js
```

Open http://localhost:4000

# Running with Heroku
This can includes a procfile for deploying to heroku
```bash
heroku local
```