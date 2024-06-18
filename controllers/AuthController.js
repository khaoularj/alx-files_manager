import request from 'supertest';
import { expect } from 'chai';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis'; // Assuming redisClient is correctly implemented

describe('authController', () => {
  const mockUser = {
    email: 'kaido@beast.com',
    password: 'hyakuju_no_kaido_wano',
  };
  let token = '';

  before(function (done) {
    this.timeout(10000);
    dbClient.usersCollection()
      .then((usersCollection) => {
        usersCollection.deleteMany({ email: mockUser.email })
          .then(() => {
            request.post('/users')
              .send({
                email: mockUser.email,
                password: mockUser.password,
              })
              .expect(201)
              .end((requestErr, res) => {
                if (requestErr) {
                  return done(requestErr);
                }
                expect(res.body.email).to.eql(mockUser.email);
                expect(res.body.id.length).to.be.greaterThan(0);
                done();
              });
          })
          .catch((deleteErr) => done(deleteErr));
      })
      .catch((connectErr) => done(connectErr));
  });

  describe('gET /connect', () => {
    it('should fail with no "Authorization" header field', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/connect')
          .expect(401)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.eql({ error: 'Unauthorized' });
            done();
          });
      });
    });

    it('should fail for a non-existent user', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/connect')
          .auth('foo@bar.com', 'raboof', { type: 'basic' })
          .expect(401)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.eql({ error: 'Unauthorized' });
            done();
          });
      });
    });

    it('should fail with a valid email and wrong password', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/connect')
          .auth(mockUser.email, 'raboof', { type: 'basic' })
          .expect(401)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.eql({ error: 'Unauthorized' });
            done();
          });
      });
    });

    it('should fail with an invalid email and valid password', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/connect')
          .auth('zoro@strawhat.com', mockUser.password, { type: 'basic' })
          .expect(401)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.eql({ error: 'Unauthorized' });
            done();
          });
      });
    });

    it('should succeed for an existing user', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/connect')
          .auth(mockUser.email, mockUser.password, { type: 'basic' })
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body.token).to.exist;
            expect(res.body.token.length).to.be.greaterThan(0);
            token = res.body.token;
            done();
          });
      });
    });
  });

  describe('gET /disconnect', () => {
    it('should fail with no "X-Token" header field', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/disconnect')
          .expect(401)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.eql({ error: 'Unauthorized' });
            done();
          });
      });
    });

    it('should fail for a non-existent user', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request.get('/disconnect')
          .set('X-Token', 'raboof')
          .expect(401)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.eql({ error: 'Unauthorized' });
            done();
          });
      });
    });

    it('should succeed with a valid "X-Token" field', () => new Promise((done) => {
      request.get('/disconnect')
        .set('X-Token', token)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({});
          expect(res.text).to.eql('');
          expect(res.headers['content-type']).to.not.exist;
          expect(res.headers['content-length']).to.not.exist;
          done();
        });
    }));
  });

  describe('redis Tests', () => {
    it('should set and get an expired value', function () {
      return new Promise((done) => {
        this.timeout(5000);
        redisClient.set('test_key', 356, 1)
          .then(() => {
            setTimeout(async () => {
              const value = await redisClient.get('test_key');
              expect(value).to.be.null;
              done();
            }, 2000);
          })
          .catch((err) => done(err));
      });
    });

    it('should set and get a deleted value', function () {
      return new Promise((done) => {
        this.timeout(5000);
        redisClient.set('test_key', 345, 10)
          .then(() => redisClient.del('test_key'))
          .then(() => {
            setTimeout(async () => {
              const value = await redisClient.get('test_key');
              expect(value).to.be.null;
              done();
            }, 2000);
          })
          .catch((err) => done(err));
      });
    });
  });
});
