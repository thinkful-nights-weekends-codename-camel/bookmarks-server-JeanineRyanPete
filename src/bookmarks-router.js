const express = require('express');
const bookmarksJson = express.json();
const bookmarksRouter = express.Router();
const uuid = require('uuid/v4');
const store = [
  {
    id: 0,
    title: 'Google',
    url: 'http://www.google.com',
    rating: '3',
    desc: 'Internet-related services and products.'
  },
  {
    id: 1,
    title: 'Thinkful',
    url: 'http://www.thinkful.com',
    rating: '5',
    desc: '1-on-1 learning to accelerate your way to a new high-growth tech career!'
  },
  {
    id: 2,
    title: 'Github',
    url: 'http://www.github.com',
    rating: '4',
    desc: 'brings together the world\'s largest community of developers.'
  }
];

bookmarksRouter
  .route('/bookmarks')
  .get((req,res) => {
    res.json(store);
  })
  .post(bookmarksJson, (req, res) => {
    for(let entry of ["title","url","rating"]) {
      if (!req.body[entry]){
        return res.status(400).send('Invalid data');
      }
    }
    const { title, url, rating } = req.body;
    if (!Number(rating) || rating < 0 || rating > 5) {
      return res.status(400).send('Rating should be a number greater than 0 and less than 5');
    }
    const regexURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%\+.~#?&//=]*)/;

    if (!url.match(regexURL)) {
      return res
        .status(400)
        .send('Must be a valid URL');
    }
    const id = uuid();
    const newBookmark = 
    {
      id,
      title,
      url,
      rating
    };
    store.push(newBookmark);
    
    res.status(201).json(newBookmark).send();
  })

bookmarksRouter
  .route('/bookmarks/:id')
  .get((req,res) => {
    const id = req.params;
    const bookmarks = store.find(bookmark => bookmark.id == id);
    if (!bookmarks) {
      return res.status(404).send('No bookmarks found. Try again.')
    }
    res.json(bookmarks)
  })
  .delete((req,res) => {
    const { id } = req.params;
    const bookmarks = store.findIndex(bookmark => bookmark.id == id);
    store.splice(bookmarks, 1);
    res.status(201).send('Bookmark deleted.')
  })

module.exports = bookmarksRouter;