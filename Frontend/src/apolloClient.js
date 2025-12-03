import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/graphql/";

console.log("🚀 API URL:", API_URL);

const httpLink = createHttpLink({
  uri: API_URL,
  credentials: "include",   // 🔥 OBLIGATOIRE avec CORS_ALLOW_CREDENTIALS
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  connectToDevTools: true,
});

export default client;
