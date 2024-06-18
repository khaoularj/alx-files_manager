import request from 'supertest';
import { expect } from 'chai';
import dbClient from '../../utils/db'; // Assuming dbClient is correctly implemented

describe('userController', () => {
  const mockUser = {
    email: 'beloxxi@blues.com',
    password: 'melody1982',
  };

  before(function (done) {
    this.timeout(10000);
    dbClient.usersCollection()
      .then((usersCollection) => {
        usersCollection.deleteMany({ email: mockUser.email })
          .then(() => done())
          .catch((deleteErr) => done(deleteErr));
      })
      .catch((connectErr) => done(connectErr));
  });

  describe('pOST /users', () => {
    it('should fail when there is no email and there is password', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request('/users')
          .post('')
          .send({
            password: mockUser.password,
          })
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.equal({ error: 'Missing email' });
            done();
          });
      });
    });

    it('should fail when there is email and there is no password', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request('/users')
          .post('')
          .send({
            email: mockUser.email,
          })
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.equal({ error: 'Missing password' });
            done();
          });
      });
    });

    it('should succeed when the new user has a password and email', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request('/users')
          .post('')
          .send({
            email: mockUser.email,
            password: mockUser.password,
          })
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body.email).to.equal(mockUser.email);
            expect(res.body.id).to.be.a('string').that.is.not.empty;
            done();
          });
      });
    });

    it('should fail when the user already exists', function () {
      return new Promise((done) => {
        this.timeout(5000);
        request('/users')
          .post('')
          .send({
            email: mockUser.email,
            password: mockUser.password,
          })
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.body).to.deep.equal({ error: 'Already exist' });
            done();
          });
      });
    });
  });
});
