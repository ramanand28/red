const fs = require('fs');
const { ApolloServer, gql } = require('apollo-server-lambda');
const Redis = require('ioredis');
const { RedisCache } = require('apollo-server-cache-redis');

// Initialize Redis client
const redisClient = new Redis({
  host: "ramsredis-jnwy7y.serverless.use1.cache.amazonaws.com",
  port: 6379, // Ensure this is a number, default is usually 6379
  // password: 'if you have a password', // Uncomment and set this if your Redis instance is secured with a password
});

// Read the JSON data from the file
const customers = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
async function testRedisConnection() {
  try {
    const redisClient = new Redis({
      host: 'ramsredis-jnwy7y.serverless.use1.cache.amazonaws.com',
      port: 6379,
      // password: 'your_password', // If applicable
    });

    const pingResponse = await redisClient.ping();
    console.log('Redis PING response:', pingResponse); // Should log "PONG" if successful
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
}

// Invoke the test function to check connectivity
testRedisConnection();
// Define your GraphQL schema
const typeDefs = gql`
  type Customer {
    name: String
    id: Int
    price: Float
  }

  type Query {
    customers: [Customer]
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    customers: async (_, __, context) => {
      const { redisClient } = context;
      const cacheKey = 'customers';

      // Test Redis connectivity with a PING command
      try {
        const pingResponse = await redisClient.ping();
        console.log('Redis PING response:', pingResponse); // Should log "PONG" if successful
      } catch (error) {
        console.error('Error pinging Redis:', error);
        throw new Error('Failed to connect to Redis');
      }

      try {
        let data = await redisClient.get(cacheKey);
        if (data) {
          return JSON.parse(data); // Return data from cache
        } else {
          // Fetch and cache the data if not present in the cache
          data = customers; // Using local data as a placeholder
          await redisClient.set(cacheKey, JSON.stringify(data)); // Cache the result
          return data;
        }
      } catch (error) {
        console.error('Error accessing Redis cache:', error);
        // Decide how to handle the error, whether to throw it or return a default value
        throw new Error('Error accessing cache');
      }
    },
  },
};

// Create the Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  cache: new RedisCache({
    host: 'ramsredis-jnwy7y.serverless.use1.cache.amazonaws.com',
    port: 6379
    // Additional options like port and password can be passed here as well.
  }),
  context: () => ({ redisClient }), // Pass the redisClient to the context
  introspection: true, // Enable introspection (useful for development)
});

// Export the Apollo Server Lambda handler
exports.handler = server.createHandler({
  cors: {
    origin: '*', // Adjust to your client's URL in production
    credentials: true,
  },
});
