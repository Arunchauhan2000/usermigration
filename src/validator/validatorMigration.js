const { MongoClient, ObjectId } = require("mongodb");

const oldUri = "mongodb+srv://mrmintchain:5zBbCIynNttgKUR9@cluster1.icak9.mongodb.net/mrmintexplorer?retryWrites=true&w=majority&appName=Cluster1";
const newUri = "mongodb+srv://anannta:Y9BYsXOV1QWFx7W3@anannta.ypyj0d.mongodb.net/anantachain?retryWrites=true&w=majority&appName=anannta";

const oldDbName = "mrmintexplorer";
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
    const oldValidators = oldDb.collection("validators");
    const newValidators = newDb.collection("validators");
    const oldDalegators = oldDb.collection("delegators");

    console.log("✅ Step 1: Fetching user mappings...");

    // Step 1: Create   -> newUserId mapping
    const newUserCursor = newUsers.find();
    const userIdMap = new Map();

    while (await newUserCursor.hasNext()) {
      const user = await newUserCursor.next();
      if (user.oldUserId) {
        userIdMap.set(user.oldUserId.toString(), user._id);
      }
    }

    console.log(`✅ Found ${userIdMap.size} user mappings`);

    // Step 2: Migrate Validators
    const validatorsCursor = oldValidators.find();
    let migratedCount = 0;
    let skippedCount = 0;

    while (await validatorsCursor.hasNext()) {
      const validator = await validatorsCursor.next();

      const oldUserId = validator.user_id?.toString();
      const newUserId = userIdMap.get(oldUserId);

      if (!newUserId) {
        console.log(`⚠️ Skipped validator (user not found): ${oldUserId}`);
        skippedCount++;
        continue;
      }

      validator.user_id = newUserId;

      // Optional: remove _id to let Mongo create new _id
      delete validator._id;

      const findUser = await newUsers.findOne({ _id: newUserId });

      let myDelegators = [];
      let loop = validator.delegators.length;
      let i = 0;
      while (i < loop) {
        const delegator = await validator.delegators[i];

        const delegatorId = delegator.delegator_id?.toString();
        let getDelegator = await oldDalegators.findOne({ _id: new ObjectId(delegatorId) });
        
        let newUserIdForDelegator = userIdMap.get(getDelegator.user_id.toString() || "");

        if (newUserIdForDelegator) {
          myDelegators.push({
            ...delegator,
            delegator_id: newUserIdForDelegator
          });
        } else {
          console.log(`⚠️ Skipped delegator (user not found): ${delegatorId}`);
        }
        i++
      }
 
      await newValidators.insertOne({
        isNodeSetup: false,
        isOld: true,
        userId: newUserId,
        email: findUser.email || "",
        isWithdrawAddressSetValidator: false,
        status: "0",
        validator_address_old: validator.validator_address || "",
        oldDelegators: myDelegators || [],
      });
      migratedCount++;
      console.log(`✅ Migrated validator for olduser_id: ${oldUserId} new: ${newUserId.toString()}`);
    }

    console.log(`🎉 Done! Total Validators Migrated: `, { migratedCount, skippedCount });
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrateValidators();
