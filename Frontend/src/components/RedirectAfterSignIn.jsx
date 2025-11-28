import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, gql } from "@apollo/client";

const GET_USER_ADMIN_STATUS = gql`
  query GetUserAdminStatus {
    me {
      id
      isAdmin
    }
  }
`;

export default function RedirectAfterSignIn() {
  const { user, isLoaded } = useUser();
  const { data, loading, error } = useQuery(GET_USER_ADMIN_STATUS, {
    skip: !isLoaded || !user,
  });

  useEffect(() => {
    if (isLoaded && user && !loading) {
      if (data?.me?.isAdmin && !error) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    }
  }, [user, isLoaded, data, loading, error]);

  return <div className="p-10 text-center">Redirection...</div>;
}
