const { MongoClient } = require("mongodb");

const oldUri = "mongodb+srv://mrmintchain:5zBbCIynNttgKUR9@cluster0.icak9.mongodb.net/mrMintBlockchainDev?retryWrites=true&w=majority&appName=Cluster0";
const newUri = "mongodb+srv://anannta:Y9BYsXOV1QWFx7W3@anannta.ypyj0d.mongodb.net/?retryWrites=true&w=majority&appName=anannta";

const oldDbName = "mrmintchain20250716";
const newDbName = "anantachain";

const oldCollectionName = "delegators";
const newCollectionName = "existingDelegators";

async function migrateDelegators() {
  const oldClient = new MongoClient(oldUri);
  const newClient = new MongoClient(newUri);

  try {
    await oldClient.connect();
    await newClient.connect();

    const oldDb = oldClient.db(oldDbName);
    const newDb = newClient.db(newDbName);

    const oldDelegators = oldDb.collection(oldCollectionName);
    const newDelegators = newDb.collection(newCollectionName);

    const cursor = oldDelegators.find();

    let migratedCount = 0;
    let skippedCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      const exists = await newDelegators.findOne({ _id: doc._id });
      if (exists) {
        console.log(`⏩ Skipped (already exists): ${doc._id}`);
        skippedCount++;
        continue;
      }

      await newDelegators.insertOne({ ...doc, isOld: true });
      console.log(`✅ Migrated delegator: ${doc._id}`);
      migratedCount++;
    }

    console.log(`🎉 Migration done! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  } catch (err) {
    console.error("❌ Error during migration:", err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrateDelegators();
