import React, { useMemo, useCallback } from "react";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { useSession } from "@clerk/clerk-react";

const httpLink = createHttpLink({ uri: "http://localhost:8000/api/graphql/" });

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      console.error(`[GraphQL error]: ${message}`);
      if (extensions?.code === "UNAUTHENTICATED" || message.includes("Invalid token")) {
        window.location.href = "/sign-in";
      }
    });
  }
  if (networkError) console.error(`[Network error]: ${networkError}`);
});

const ApolloClerkProvider = ({ children }) => {
  const { session, isLoaded } = useSession();

  const getAuthHeaders = useCallback(async (_, { headers }) => {
    let token = null;
    if (session) {
      try {
        token = await session.getToken({ skipCache: true });
      } catch (error) {
        console.error("❌ Erreur récupération token:", error);
      }
    }
    return { headers: { ...headers, authorization: token ? `Bearer ${token}` : "" } };
  }, [session]);

  const authLink = useMemo(() => setContext(getAuthHeaders), [getAuthHeaders]);

  const client = useMemo(
    () => new ApolloClient({ link: errorLink.concat(authLink.concat(httpLink)), cache: new InMemoryCache() }),
    [authLink]
  );

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen text-xl">Chargement...</div>;

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default ApolloClerkProvider;