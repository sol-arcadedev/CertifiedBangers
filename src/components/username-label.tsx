// "(admin)" is shown everywhere an admin/main-admin's username appears,
// platform-wide — one consistent convention, not just next to reviews
// (Journal Entry 27). Deliberately doesn't distinguish Admin vs. Main
// Admin in the public label; that tier distinction is an internal detail.
export function UsernameLabel({ username, role }: { username: string; role: string }) {
  return (
    <>
      {username}
      {role !== "USER" && (
        <span className="text-muted"> (admin)</span>
      )}
    </>
  );
}
