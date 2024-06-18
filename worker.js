import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import db from './utils/db'; // Assuming dbClient is imported as db

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

async function generateThumbnail(width, localPath) {
  try {
    const thumbnail = await imageThumbnail(localPath, { width });
    return thumbnail;
  } catch (error) {
    throw new Error(`Failed to generate thumbnail for ${localPath}: ${error.message}`);
  }
}

fileQueue.process(async (job, done) => {
  console.log('Processing file job...');
  const { fileId, userId } = job.data;

  try {
    if (!fileId) {
      throw new Error('Missing fileId');
    }

    if (!userId) {
      throw new Error('Missing userId');
    }

    const filesCollection = db.db.collection('files');
    const fileIdObject = new ObjectID(fileId);
    const file = await filesCollection.findOne({ _id: fileIdObject });

    if (!file) {
      console.log('File not found');
      throw new Error('File not found');
    }

    const fileName = file.localPath;
    const thumbnail500 = await generateThumbnail(500, fileName);
    const thumbnail250 = await generateThumbnail(250, fileName);
    const thumbnail100 = await generateThumbnail(100, fileName);

    console.log('Writing thumbnails to the system');
    const image500 = `${fileName}_500`;
    const image250 = `${fileName}_250`;
    const image100 = `${fileName}_100`;

    await Promise.all([
      fs.writeFile(image500, thumbnail500),
      fs.writeFile(image250, thumbnail250),
      fs.writeFile(image100, thumbnail100),
    ]);

    done();
  } catch (error) {
    console.error(`File processing error: ${error.message}`);
    done(error);
  }
});

userQueue.process(async (job, done) => {
  console.log('Processing user job...');
  const { userId } = job.data;

  try {
    if (!userId) {
      throw new Error('Missing userId');
    }

    const usersCollection = db.db.collection('users');
    const userIdObject = new ObjectID(userId);
    const user = await usersCollection.findOne({ _id: userIdObject });

    if (!user) {
      console.log('User not found');
      throw new Error('User not found');
    }

    console.log(`Welcome ${user.email}!`);
    done();
  } catch (error) {
    console.error(`User processing error: ${error.message}`);
    done(error);
  }
});
