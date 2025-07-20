const { MongoClient } = require("mongodb");

const oldUri = "mongodb+srv://mrmintchain:5zBbCIynNttgKUR9@cluster1.icak9.mongodb.net/mrmintexplorer?retryWrites=true&w=majority&appName=Cluster1";
const newUri = "mongodb+srv://anannta:Y9BYsXOV1QWFx7W3@anannta.ypyj0d.mongodb.net/anantachain?retryWrites=true&w=majority&appName=anannta";


const oldDbName = "mrmintexplorer";
const newDbName = "anantachain";

let migratedCount = 0;
let skippedCount = 0;

async function migrateSelectedFields() {
  const oldClient = new MongoClient(oldUri);
  const newClient = new MongoClient(newUri);

  try {
    await oldClient.connect();
    await newClient.connect();

    const oldDb = oldClient.db(oldDbName);
    const newDb = newClient.db(newDbName);

    const oldUsers = oldDb.collection("users");
    const newUsers = newDb.collection("users");

    const usersCursor = oldUsers.find();

    while (await usersCursor.hasNext()) {
      const user = await usersCursor.next();

      const exists = await newUsers.findOne({ email: user.email });
      if (exists) {
        console.log(` Skipped (already exists): ${user.email}`);
        skippedCount++;
        continue;
      }

      const newUser = {
        oldUserId: user._id,
        email: user.email || "",
        passwordHash: user.password || "",
        emailVerified: true,
        twoFactorSecret: "",
        isTwoFactorEnabled: false,
        google_auth_qr: "",
        username: "",
        createdAt: user.createdAt || new Date(),
        delegatorWithdrawWalletAddress: "",
        validatorOperatorAddress: null,
        validatorWithdrawAddress: null,
        validatorWalletAddress: null,
        isWithdrawAddressSet: true,
        validatorEthAddress: null,
        isAppliedForValidators: null,
        isOld: true,
        status: 0,
        isWithdrawAddressSetValidator: null,
        ethWalletAddress: "",
        profileImage: user.userimage || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        accessKey: null,
        accessKeyExpiry: null,
        isAccessKeyAlreadyGenerated: false,
        role: [],
        __v: 0,
      };



      await newUsers.insertOne(newUser);
      console.log(` Migrated user: ${user.email}`);
      migratedCount++;
    }

    console.log(" Migration completed successfully.", {
      migratedCount,
      skippedCount
    });
  } catch (err) {
    console.error(" Error:", err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrateSelectedFields();
