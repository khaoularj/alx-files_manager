import request from 'supertest';
import { expect } from 'chai';
import dbClient from '../../utils/db';

describe('appController', () => {
  before(function (done) {
    this.timeout(10000);
    Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
      .then(([usersCollection, filesCollection]) => {
        Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})])
          .then(() => done())
          .catch((deleteErr) => done(deleteErr));
      }).catch((connectErr) => done(connectErr));
  });

  describe('gET /status', () => {
    it('should return services are online', () => new Promise((done) => {
      request('/status')
        .get('')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.equal({ redis: true, db: true });
          done();
        });
    }));
  });

  describe('gET /stats', () => {
    it('should return correct statistics about db collections', () => new Promise((done) => {
      request('/stats')
        .get('')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.equal({ users: 0, files: 0 });
          done();
        });
    }));

    it('should return correct statistics after data insertion', function () {
      return new Promise((done) => {
        this.timeout(10000);
        Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
          .then(([usersCollection, filesCollection]) => {
            Promise.all([
              usersCollection.insertMany([{ email: 'john@mail.com' }]),
              filesCollection.insertMany([
                { name: 'foo.txt', type: 'file' },
                { name: 'pic.png', type: 'image' },
              ]),
            ])
              .then(() => {
                request('/stats')
                  .get('')
                  .expect(200)
                  .end((err, res) => {
                    if (err) {
                      return done(err);
                    }
                    expect(res.body).to.deep.equal({ users: 1, files: 2 });
                    done();
                  });
              })
              .catch((insertErr) => done(insertErr));
          })
          .catch((connectErr) => done(connectErr));
      });
    });
  });
});
