// src/graphql/queries.js
import { gql } from "@apollo/client";

export const ALL_POSTS = gql`
  query {
    allPosts {
      id
      content
      status
      createdAt
    }
  }
`;

export const ME = gql`
  query {
    me {
      id
      username
      email
      isAdmin
    }
  }
`;
