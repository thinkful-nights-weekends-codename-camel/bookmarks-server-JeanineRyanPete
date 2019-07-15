const path = require('path');
const express = require('express');
const xss = require('xss');
const bookmarksJson = express.json();
const bookmarksRouter = express.Router();
const logger = require('./logger');
const BookmarksService = require('./bookmarks-service');

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  rating: Number(bookmark.rating),
  description: xss(bookmark.description),
})

bookmarksRouter
  .route('/api/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks);
      })
      .catch(next)
  })
  .post(bookmarksJson, (req, res, next) => {
    for (let entry of ["title", "url", "rating"]) {
      if (!req.body[entry]) {
        logger.error(`Title, URL, and Rating are required.`)
        return res.status(400).send('Invalid data');
      }
    }
    const { title, url, rating, description } = req.body;
    if (!Number(rating) || rating < 0 || rating > 5) {
      logger.error(`The rating must be a number, greater than 0, and less than 6.`)
      return res.status(400).send('Rating should be a number greater than 0 and less than 6');
    }
    const regexURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%\+.~#?&//=]*)/;

    if (!url.match(regexURL)) {
      logger.error(`The URL entered is not a valid URL.`)
      return res
        .status(400)
        .send('Must be a valid URL');
    }

    const newBookmark =
    {
      title,
      url,
      rating,
      description
    };
    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then(bookmark => {
        res
        .status(201)
        .location(path.posix.joing(req.originalUrl, `/${articled.id}`))
        .json(bookmark)
      })
      .catch(next)
  })

bookmarksRouter
  .route('/api/bookmarks/:bookmark_id')
  .all((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.getById(
      req.app.get('db'),
      bookmark_id
    )
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark does not exist`}
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res) => {
    res.json(serializeBookmark(res.bookmark))
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      bookmark_id
    )
      .then(() => {
        logger.info(`Bookmark with id ${bookmark_id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarksRouter;