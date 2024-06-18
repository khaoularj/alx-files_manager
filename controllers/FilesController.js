import { tmpdir } from 'os';
import { join as joinPath } from 'path';
import {
  existsSync, readdirSync, unlinkSync, statSync,
} from 'fs';
import request from 'supertest'; // Assuming Supertest is used for HTTP testing
import { expect } from 'chai'; // Assuming Chai is used for assertions
import db from '../../utils/db'; // Assuming dbClient is imported as db

describe('filesController', () => {
  const rootFolder = `${process.env.ROOT_FOLDER || ''}`.trim().length > 0
    ? process.env.ROOT_FOLDER.trim()
    : joinPath(tmpdir(), 'default_root');

  const user = {
    email: 'katakuri@bigmom.com',
    password: 'mochi_mochi_whole_cake',
  };

  /**
   * Mock files:
   * - file1: regular file
   * - folder1: folder
   * - file2: file under folder1
   */
  const mockFiles = [
    {
      name: 'manga_titles.txt',
      type: 'file',
      data: [
        '+ Darwin\'s Game',
        '+ One Piece',
        '+ My Hero Academia',
        '',
      ].join('\n'),
      base64Data() { return Buffer.from(this.data, 'utf-8').toString('base64'); },
    },
    {
      name: 'One_Piece',
      type: 'folder',
      data: '',
      base64Data() { return ''; },
    },
    {
      name: 'chapter_titles.md',
      type: 'file',
      data: [
        '+ Chapter 47: The skies above the capital',
        '+ Chapter 48: 20 years',
        '+ Chapter 49: The world you wish for',
        '+ Chapter 50: Honor',
        '+ Chapter 51: The shogun of Wano - Kozuki Momonosuke',
        '+ Chapter 52: New morning',
        '',
      ].join('\n'),
      base64Data() { return Buffer.from(this.data, 'utf-8').toString('base64'); },
    },
  ];

  let authToken = '';

  const clearFolder = (folderPath) => {
    if (!existsSync(folderPath)) {
      return;
    }
    readdirSync(folderPath).forEach((file) => {
      const filePath = joinPath(folderPath, file);
      if (statSync(filePath).isFile()) {
        unlinkSync(filePath);
      } else {
        clearFolder(filePath);
      }
    });
  };

  const clearDatabaseCollections = async () => {
    const [usersCollection, filesCollection] = await Promise.all([
      db.users().deleteMany({}),
      db.files().deleteMany({}),
    ]);
    return { usersCollection, filesCollection };
  };

  const signUpUser = async (userData) => {
    const res = await request.post('/users')
      .send({ email: userData.email, password: userData.password })
      .expect(201);
    expect(res.body.email).to.eql(userData.email);
    expect(res.body.id.length).to.be.greaterThan(0);
  };

  const signInUser = async (userData) => {
    const res = await request.get('/connect')
      .auth(userData.email, userData.password)
      .expect(200);
    expect(res.body.token).to.exist;
    expect(res.body.token.length).to.be.greaterThan(0);
    authToken = res.body.token;
  };

  before(async () => {
    // Clean up collections and set up authenticated user before tests
    this.timeout(10000);
    await clearDatabaseCollections();
    await signUpUser(user);
    await signInUser(user);
    clearFolder(rootFolder);
  });

  after(async () => {
    // Clean up collections and folder after all tests
    this.timeout(10000);
    setTimeout(async () => {
      await clearDatabaseCollections();
      clearFolder(rootFolder);
    });
  });

  describe('pOST /files', () => {
    it('should fail without "X-Token" header field', () => new Promise((done) => {
      request.post('/files')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.deep.equal({ error: 'Unauthorized' });
          done();
        });
    }));

    it('should fail for a non-existent user', () => new Promise((done) => {
      request.post('/files')
        .set('X-Token', 'invalid_token')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.deep.equal({ error: 'Unauthorized' });
          done();
        });
    }));

    it('should fail if name is missing', () => new Promise((done) => {
      request.post('/files')
        .set('X-Token', authToken)
        .send({})
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.deep.equal({ error: 'Missing name' });
          done();
        });
    }));

    it('should succeed for valid values of a file', () => new Promise((done) => {
      request.post('/files')
        .set('X-Token', authToken)
        .send({
          name: mockFiles[0].name,
          type: mockFiles[0].type,
          data: mockFiles[0].base64Data(),
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.id).to.exist;
          expect(res.body.userId).to.exist;
          expect(res.body.name).to.equal(mockFiles[0].name);
          expect(res.body.type).to.equal(mockFiles[0].type);
          expect(res.body.isPublic).to.equal(false);
          done();
        });
    }));
  });
});
