export const useAuth = () => {
  const user = useLogtoUser();
  const isLoggedIn = computed(() => !!user);

  const login = () => {
    // Full page redirect (like <a href="/login">)
    window.location.href = "/login";
  };

  const logout = () => {
    // Full page redirect (like <a href="/logout">)
    window.location.href = "/logout";
  };

  return {
    user,
    isLoggedIn,
    login,
    logout,
  };
};
