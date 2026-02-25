import { act } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { UserProvider } from "../context/UserContext";
import { loginWithUsernamePassword } from "../services/auth";
import Login from "../pages/Auth/Login";

// mock the navigation and auth service
jest.mock("../services/auth");
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({ replace: jest.fn(), navigate: jest.fn() })),
}));

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
    }),
  };
});

// ensure each test starts with a clean slate so earlier calls (e.g. with empty inputs)
// don"t pollute expectations in later tests
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

describe("Login component", () => {
  test("Text renders correctly on HomeScreen", () => {
    const { getByPlaceholderText, getByRole } = render(
      <UserProvider>
        <Login />
      </UserProvider>,
    );

    // look for a button with the accessible name "Login"
    const loginButton = getByRole("button", { name: "Login" });

    expect(loginButton).toBeTruthy();

    expect(getByPlaceholderText("Username")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
  });

  test("does not call login if username/password is empty", async () => {
    const { getByRole, getByText } = render(
      <UserProvider>
        <Login />
      </UserProvider>,
    );
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Login" }));
    });
    // expect some text to have wrong username or password
    expect(getByText("Wrong username or password")).toBeTruthy();
  });

  jest.useFakeTimers();
  test("login when username/password are filled", async () => {
    (loginWithUsernamePassword as jest.Mock).mockResolvedValueOnce({
      token: "abc123",
    });
    const { getByPlaceholderText, getByRole } = render(
      <UserProvider>
        <Login />
      </UserProvider>,
    );
    const usernameInput = getByPlaceholderText("Username");
    const passwordInput = getByPlaceholderText("Password");

    // Enter username + password, then wait. React state updates are async, so
    // pressing Login in the same tick can capture "" values in the handler.
    await act(async () => {
      fireEvent.changeText(usernameInput, "devuser");
      fireEvent.changeText(passwordInput, "devpass123");
    });

    await waitFor(() => {
      expect(usernameInput.props.value).toBe("devuser");
      expect(passwordInput.props.value).toBe("devpass123");
    });

    // Now we press Login after inputs reflect the new values
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Login" }));
    });

    // Ensure we don"t have empty strings
    expect(loginWithUsernamePassword).not.toHaveBeenCalledWith("", "");
    expect(loginWithUsernamePassword).toHaveBeenCalledWith(
      "devuser",
      "devpass123",
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
  });
  test("navigates to Home after successful login", async () => {
    (loginWithUsernamePassword as jest.Mock).mockResolvedValueOnce({
      token: "abc123",
    });
    const { getByPlaceholderText, getByRole } = render(
      <UserProvider>
        <Login />
      </UserProvider>,
    );

    const usernameInput = getByPlaceholderText("Username");
    const passwordInput = getByPlaceholderText("Password");

    await act(async () => {
      fireEvent.changeText(usernameInput, "devuser");
      fireEvent.changeText(passwordInput, "devpass123");
    });

    await waitFor(() => {
      expect(usernameInput.props.value).toBe("devuser");
      expect(passwordInput.props.value).toBe("devpass123");
    });

    // Now we press Login after inputs reflect the new values
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Login" }));
    });

    // Ensure we don't have empty strings
    expect(loginWithUsernamePassword).not.toHaveBeenCalledWith("", "");
    expect(loginWithUsernamePassword).toHaveBeenCalledWith(
      "devuser",
      "devpass123",
    );
    await act(async () => {
      jest.runAllTimers();
    });

    // check correct navigation
    expect(mockReplace).toHaveBeenCalledWith("MainTabs");
  });

  test("does not login if invalid username/password", async () => {
    const { getByPlaceholderText, getByRole, getByText } = render(
      <UserProvider>
        <Login />
      </UserProvider>,
    );

    const usernameInput = getByPlaceholderText("Username");
    const passwordInput = getByPlaceholderText("Password");

    // Enter username + password, then wait so the handler doesn"t see ""
    await act(async () => {
      fireEvent.changeText(usernameInput, "devuser");
      fireEvent.changeText(passwordInput, "knjaskjd");
    });

    await waitFor(() => {
      expect(usernameInput.props.value).toBe("devuser");
      expect(passwordInput.props.value).toBe("knjaskjd");
    });

    // Then press Login
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Login" }));
    });

    // Ensure we dont have an empty string
    expect(loginWithUsernamePassword).not.toHaveBeenCalledWith("", "");
    expect(loginWithUsernamePassword).toHaveBeenCalledWith(
      "devuser",
      "knjaskjd",
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // expect some text to have wrong username or password
    expect(getByText("Wrong username or password")).toBeTruthy();
  });
});
