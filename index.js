// Import necessary modules
const express = require('express'); // Express framework for building the API
const bodyParser = require('body-parser'); // Middleware for parsing request bodies
const axios = require('axios'); // HTTP client for making API requests
const { MongoClient } = require('mongodb'); // MongoDB driver for connecting to the database
const cors = require('cors'); // Middleware for enabling Cross-Origin Resource Sharing
require('dotenv').config(); // Load environment variables from .env file

// Create Express app
const app = express();
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(cors()); // Enable Cross-Origin Resource Sharing

// Function to send user query to OpenAI GPT-3.5 turbo API
async function sendQueryToGPT(query) {
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await axios.post('https://api.openai.com/v1/engines/davinci-codex/completions', {
        prompt: query,
        max_tokens: 60,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
    });
    return response.data.choices[0].text.trim();
}

// API endpoint for handling user queries
app.post('/api/query', async (req, res) => {
    const userQuery = req.body.query;

    if (!userQuery) {
        return res.status(400).json({ error: 'Missing user query' });
    }

    try {
        const chatResponse = await sendQueryToGPT(userQuery);

        if (!chatResponse) {
            return res.status(500).json({ error: 'Invalid response from OpenAI API' });
        }

        let parsedQuery = null;

        try {
            parsedQuery = JSON.parse(chatResponse);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid query format from OpenAI API' });
        }

        const client = await MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection(process.env.COLLECTION_NAME);

        const dbResponse = await collection.find(parsedQuery).toArray();
        client.close();

        if (dbResponse.length === 0) {
            return res.status(404).json({ error: 'No data found for this query' });
        }

        res.json(dbResponse);
    } catch (error) {
        console.error(error);

        if (error instanceof MongoClient.MongoError) {
            return res.status(500).json({ error: 'Database error' });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server is running on port ${port}`));
`
2. singstat.js
`
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