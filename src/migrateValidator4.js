const { MongoClient, ObjectId } = require("mongodb");

const oldUri = "mongodb+srv://mrmintchain:5zBbCIynNttgKUR9@cluster1.icak9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";
const newUri = "mongodb+srv://anannta:Y9BYsXOV1QWFx7W3@anannta.ypyj0d.mongodb.net/?retryWrites=true&w=majority&appName=anannta";

const oldDbName = "mrmintexplorer";
const newDbName = "anantachain";

async function reverseValidatorMigration() {
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
    const oldUsers = oldDb.collection("users");

    const usersCursor = newUsers.find();

    while (await usersCursor.hasNext()) {
      const newUser = await usersCursor.next();

      const updatedValidators = [];

      for (const validator of newUser.validators || []) {
        const newValidatorId = validator.validator_id;

        // Find the new validator by ID
        const newValidator = await newValidators.findOne({ _id: new ObjectId(newValidatorId) });

        if (!newValidator) {
          console.log(` No matching new validator found for validator_id ${newValidatorId}`);
          continue;
        }

        // Find old validator by validator_address
        const oldValidator = await oldValidators.findOne({ validator_address: newValidator.validator_address });

        if (!oldValidator) {
          console.log(` No matching old validator found for address ${newValidator.validator_address}`);
          continue;
        }

        updatedValidators.push({
          ...validator,
          validator_id: oldValidator._id
        });
      }

      // Find old user using oldUserId
      const oldUser = await oldUsers.findOne({ _id: new ObjectId(newUser.oldUserId) });

      if (!oldUser) {
        console.log(` No matching old user found for oldUserId ${newUser.oldUserId}`);
        continue;
      }

      await oldUsers.updateOne(
        { _id: oldUser._id },
        { $set: { validators: updatedValidators } }
      );

      console.log(` Updated old user: ${oldUser._id} with ${updatedValidators.length} validators`);
    }

    console.log("  validator migration completed.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

reverseValidatorMigration();
