import PrivateRoute from "@/app/privateroute";

enum UserRoles {
  USER = "user",
  ADMIN = "admin",
}
export default function ReturnOrdersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <PrivateRoute requiredRoles={[UserRoles.USER]}>
          {children}
        </PrivateRoute>
  );
}
