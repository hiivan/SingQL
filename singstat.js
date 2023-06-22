const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

async function retrieveData() {
  try {
    const years = [2020, 2021, 2022, 2023]; // Add more years here if needed
    const populationData = [];
    for (const year of years) {
      const response = await axios.get(`https://tablebuilder.singstat.gov.sg/api/table/query?tableId=DP_MPAC_0001&dimensionIds=1&measureIds=2&year=${year}`);
      const data = response.data;
      const yearData = data.rows.map(row => ({
        year: year,
        age: row[0],
        gender: row[1],
        population: row[2]
      }));
      populationData.push(...yearData);
    }
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const insertResult = await collection.insertMany(populationData, { ordered: false });
    console.log(`Inserted ${insertResult.insertedCount} documents.`);
    console.log(`Skipped ${insertResult.writeErrors.length} duplicates.`);
    client.close();
  } catch (error) {
    console.error(error);
  } finally {
    console.log('Done!');
  }
}

retrieveData();