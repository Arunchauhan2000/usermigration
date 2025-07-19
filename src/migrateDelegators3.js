const { MongoClient, ObjectId } = require("mongodb");
const oldUri = "mongodb+srv://mrmintchain:5zBbCIynNttgKUR9@cluster0.icak9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const newUri = "mongodb+srv://anannta:Y9BYsXOV1QWFx7W3@anannta.ypyj0d.mongodb.net/?retryWrites=true&w=majority&appName=anannta";

const oldDbName = "mrmintchain20250716";
const newDbName = "anantachain";

async function migrateDelegators() {
  const oldClient = new MongoClient(oldUri);
  const newClient = new MongoClient(newUri);

  try {
    await oldClient.connect();
    await newClient.connect();

    const oldDb = oldClient.db(oldDbName);
    const newDb = newClient.db(newDbName);

    const oldValidators = oldDb.collection("validators");
    const newValidators = newDb.collection("validators");
    const newUsers = newDb.collection("users");
    const oldDalegators = oldDb.collection("delegators");

    const validatorsCursor = oldValidators.find();

    while (await validatorsCursor.hasNext()) {
      const oldValidator = await validatorsCursor.next();

      const updatedDelegators = [];

      for (const delegator of oldValidator.delegators || []) {
        const oldDelegatorId = delegator.delegator_id;

        const findOldDalegator = await oldDalegators.findOne({ _id: oldDelegatorId });
          
        // Find corresponding new user by old ID
        const newUser = await newUsers.findOne({ oldUserId: findOldDalegator.user_id });

        if (!newUser) {
          console.log(`❌ No matching new user found for old delegator ${findOldDalegator.user_id}`);
          continue;
        }

        // Update delegator_id to new user's _id
        updatedDelegators.push({
          ...delegator,
          delegator_id: newUser._id
        });
      }

      // Find corresponding validator in new DB
      const newValidator = await newValidators.findOne({ validator_address: oldValidator.validator_address });

      if (!newValidator) {
        console.log(`❌ No matching new validator found for address ${oldValidator.validator_address}`);
        continue;
      }

      // Update newValidator with updated delegators
      await newValidators.updateOne(
        { _id: newValidator._id },
        { $set: { delegators: updatedDelegators } }
      );

      console.log(`✅ Updated validator: ${newValidator._id} with ${updatedDelegators.length} delegators`);
    }

    console.log("🎉 Migration of delegators completed.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrateDelegators();
