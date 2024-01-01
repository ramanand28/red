const fs = require('fs');
const { ApolloServer, gql } = require('apollo-server');
const Redis = require('ioredis');
const path = require('path');

// Initialize Redis client
const redisClient = new Redis('redis://dem-ro.jnwy7y.ng.0001.use1.cache.amazonaws.com:6379');


// Read the JSON data from the file
const customers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8'));

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
  context: () => ({ redisClient }), // Pass the redisClient to the context
  introspection: true,
});

// Start the server
server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
