require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const app = express();
const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';
const bookmarksRouter = require('./bookmarks-router');
const logger = require('./logger')

app.use(morgan(morganOption, {
  skip: () => NODE_ENV === 'test'
}));
app.use(cors());
app.use(helmet());


app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN
  const authToken = req.get('Authorization')

  if (!authToken || authToken.split(' ')[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(403).json({ error: 'Unauthorized request' })
  }
  // move to the next middleware
  next()
})

app.use(bookmarksRouter);

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = {error: { message: 'server error' } }
  } else {
    console.error(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response);
});

module.exports = app;
