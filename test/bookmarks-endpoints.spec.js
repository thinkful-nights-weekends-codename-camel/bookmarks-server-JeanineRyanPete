const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe('Bookmarks Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db)
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('bookmarks_links').truncate());

  afterEach('cleanup', () => db('bookmarks_links').truncate());

  describe('GET /api/bookmarks', () => {
    context('Given no bookmarks', () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_links')
          .insert(testBookmarks)
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  });

  describe('GET /bookmarks/:bookmarks_id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark does not exist` } })
      })
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_links')
          .insert(testBookmarks)
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      });
    });

    context(`Given an XSS attack bookmark`, () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Silly rabbit <script>alert("xss");</script>',
        url: 'http://www.googlyeyes.com',
        rating: 5,
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      }

      beforeEach('insert malicious bookmark', () => {
        return db 
          .into('bookmarks_links')
          .insert([ maliciousBookmark])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql('Silly rabbit &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  });
  describe(`POST /api/bookmarks`, () => {
    it(`creates a bookmark, responds with 201 and new bookmark`, () => {
      const newBookmark = {
        title: 'test title',
        url: 'https://google.com',
        rating: 1,
        description: '',
      }
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.rating).to.eql(newBookmark.rating)
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/bookmarks/${postRes.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(postRes.body)
        )
    });
  });

  describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404,{ error: { message: `Bookmark does not exist`}})
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_links')
          .insert(testBookmarks)
      })

      it('responds with 204 and removes the bookmarks', () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/bookmarks`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })
  })
});