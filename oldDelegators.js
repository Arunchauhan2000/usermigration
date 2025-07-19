const { MongoClient, ObjectId } = require("mongodb");

const oldUri = "mongodb+srv://mrmintchain:5zBbCIynNttgKUR9@cluster0.icak9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const newUri = "mongodb+srv://anannta:Y9BYsXOV1QWFx7W3@anannta.ypyj0d.mongodb.net/?retryWrites=true&w=majority&appName=anannta";

const oldDbName = "mrmintchain20250716";
const newDbName = "anantachain";

async function migrateValidators() {
  const oldClient = new MongoClient(oldUri);
  const newClient = new MongoClient(newUri);

  try {
    await oldClient.connect();
    await newClient.connect();

    const oldDb = oldClient.db(oldDbName);
    const newDb = newClient.db(newDbName);

    const oldUsers = oldDb.collection("users");
    const newUsers = newDb.collection("users");
    const oldValidators = oldDb.collection("delegators");
    const newValidators = newDb.collection("delegators");

    console.log(" Step 1: Fetching user mappings...");

    // Step 1: Create   -> newUserId mapping
    const newUserCursor = newUsers.find();
    const userIdMap = new Map();

    while (await newUserCursor.hasNext()) {
      const user = await newUserCursor.next();
      if (user.oldUserId) {
        userIdMap.set(user.oldUserId.toString(), user._id);
      }
    }

    console.log(` Found ${userIdMap.size} user mappings`);

    // Step 2: Migrate Validators
    const validatorsCursor = oldValidators.find();
    let migratedCount = 0;

    while (await validatorsCursor.hasNext()) {
      const validator = await validatorsCursor.next();

      const oldUserId = validator.user_id?.toString();
      const newUserId = userIdMap.get(oldUserId);

      if (!newUserId) {
        console.log(` Skipped validator (user not found): ${oldUserId}`);
        continue;
      }

      validator.user_id = newUserId;

      // Optional: remove _id to let Mongo create new _id
      delete validator._id;

      await newValidators.insertOne(validator);
      migratedCount++;
      console.log(` Migrated validator for user_id: ${newUserId.toString()}`);
    }

    console.log(` Done! Total Validators Migrated: ${migratedCount}`);
  } catch (err) {
    console.error(" Error:", err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrateValidators();
