const { MongoClient, ObjectId } = require("mongodb");

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

    const newUsers = newDb.collection("users");

    const oldValidators = oldDb.collection("validators");
    const newValidators = newDb.collection("validators");

    const cursor = oldDelegators.find();

    let migratedCount = 0;
    let skippedCount = 0;

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

    // Step 2: Migrate Delegators
    const delegatorsCursor = oldDelegators.find();

    while (await delegatorsCursor.hasNext()) {
      const delegator = await delegatorsCursor.next();

      const oldUserId = delegator.user_id?.toString();
      const newUserId = userIdMap.get(oldUserId);

      if (!newUserId) {
        console.log(`⚠️ Skipped delegator (user not found): ${oldUserId}`);
        skippedCount++;
        continue;
      }
      const findUser = await newUsers.findOne({ _id: newUserId });


      delegator.user_id = newUserId;

      // Optional: remove _id to let Mongo create new _id
      delete delegator._id;


      let myValidators = [];
      let loop = delegator.validators.length;
      let i = 0;
      while (i < loop) {
        const validator = await delegator.validators[i];

        const validatorId = validator.validator_id?.toString();
        let getValidator = await oldValidators.findOne({ _id: new ObjectId(validatorId) });

        let newUserIdForValidator = userIdMap.get(getValidator.user_id.toString() || "");

        if (newUserIdForValidator) {
          myValidators.push({
            ...validator,
            validator_id: newUserIdForValidator
          });
        } else {
          console.log(`⚠️ Skipped validator (user not found): ${delegatorId}`);
        }
        i++
      }

      await newDelegators.insertOne({
        userId: newUserId,
        validators: myValidators || [],
        email: findUser.email || "",
      });
      migratedCount++;
      console.log(`✅ Migrated delegator for olduser_id: ${oldUserId} new: ${newUserId.toString()}`);
    }

    console.log(`🎉 Done! Total delegators Migrated: `, { migratedCount, skippedCount });
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrateDelegators();
